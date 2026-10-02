import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, pool } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { calculateLineTotal, calculateOrderTotals } from "@/lib/money";
import { eq, sql } from "drizzle-orm";

const ConfirmSchema = z.object({
  idempotencyKey: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryTimeText: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id: orderId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = ConfirmSchema.safeParse(body);
    const { idempotencyKey, deliveryAddress, deliveryTimeText, specialInstructions } =
      parsed.success ? parsed.data : {};

    await client.query("BEGIN");

    // 1. Lock and fetch order
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRes.rows[0];

    // Authorization: customer must own the order
    if (user.role === "customer" && order.customer_id !== user.id) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Idempotency: If already confirmed, return current confirmed order
    if (order.status === "confirmed") {
      const itemsRes = await client.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        order: {
          ...order,
          items: itemsRes.rows,
        },
      });
    }

    // Idempotency key check
    if (idempotencyKey && order.idempotency_key === idempotencyKey) {
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        order,
      });
    }

    // 2. Fetch order items
    const itemsRes = await client.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    const items = itemsRes.rows;

    if (items.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Order contains no items." },
        { status: 400 }
      );
    }

    // Check if any item is not matched
    const unconfirmed = items.filter((i) => i.match_status !== "MATCHED");
    if (unconfirmed.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "All items must be matched before confirming.",
          unmatchedCount: unconfirmed.length,
        },
        { status: 400 }
      );
    }

    // 3. Lock products and verify stock
    let stockFailure: {
      productId: string;
      productName: string;
      requested: number;
      available: number;
    } | null = null;

    const validatedItemsData: Array<{
      itemId: string;
      productId: string;
      productName: string;
      brand: string | null;
      packSize: string;
      unitPricePaise: number;
      quantity: number;
      lineTotalPaise: number;
      newStock: number;
    }> = [];

    for (const item of items) {
      if (!item.product_id) {
        stockFailure = {
          productId: "",
          productName: item.raw_text,
          requested: 1,
          available: 0,
        };
        break;
      }

      const prodRes = await client.query(
        `SELECT * FROM products WHERE id = $1 FOR UPDATE`,
        [item.product_id]
      );

      if (prodRes.rows.length === 0) {
        stockFailure = {
          productId: item.product_id,
          productName: item.raw_text,
          requested: 1,
          available: 0,
        };
        break;
      }

      const product = prodRes.rows[0];
      const availableStock = parseFloat(product.stock_qty);
      const requestedQty = parseFloat(item.quantity) || 1;

      if (availableStock < requestedQty) {
        stockFailure = {
          productId: product.id,
          productName: product.name,
          requested: requestedQty,
          available: availableStock,
        };
        break;
      }

      const lineTotal = calculateLineTotal(requestedQty, product.price_paise);
      const newStock = Math.max(0, availableStock - requestedQty);

      validatedItemsData.push({
        itemId: item.id,
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        packSize: product.pack_size,
        unitPricePaise: product.price_paise,
        quantity: requestedQty,
        lineTotalPaise: lineTotal,
        newStock,
      });
    }

    // If stock changed concurrently and is now insufficient:
    if (stockFailure) {
      // Update order status back to needs_clarification
      await client.query(
        `UPDATE orders SET status = 'needs_clarification', updated_at = NOW() WHERE id = $1`,
        [orderId]
      );
      // Mark item status as INSUFFICIENT_STOCK or OUT_OF_STOCK
      if (stockFailure.productId) {
        const newStatus = stockFailure.available <= 0 ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK";
        await client.query(
          `UPDATE order_items SET match_status = $1, updated_at = NOW() WHERE order_id = $2 AND product_id = $3`,
          [newStatus, orderId, stockFailure.productId]
        );
      }
      await client.query(
        `INSERT INTO order_messages (order_id, sender_role, message_text) VALUES ($1, 'system', $2)`,
        [
          orderId,
          `Stock update: "${stockFailure.productName}" ka stock badal gaya hai (available: ${stockFailure.available}). Kripya review karein.`,
        ]
      );
      await client.query("COMMIT");

      return NextResponse.json(
        {
          error: "Stock changed. Order sent back to clarification.",
          stockFailure,
        },
        { status: 409 }
      );
    }

    // 4. Decrement stock & snapshot prices for each item
    for (const v of validatedItemsData) {
      await client.query(
        `UPDATE products SET stock_qty = $1, updated_at = NOW() WHERE id = $2`,
        [v.newStock.toFixed(2), v.productId]
      );

      await client.query(
        `UPDATE order_items 
         SET product_name_snapshot = $1,
             brand_snapshot = $2,
             pack_size_snapshot = $3,
             unit_price_paise_snapshot = $4,
             line_total_paise = $5,
             match_status = 'MATCHED',
             updated_at = NOW()
         WHERE id = $6`,
        [
          v.productName,
          v.brand,
          v.packSize,
          v.unitPricePaise,
          v.lineTotalPaise,
          v.itemId,
        ]
      );
    }

    // 5. Calculate totals
    const grandTotal = validatedItemsData.reduce(
      (sum, i) => sum + i.lineTotalPaise,
      0
    );

    // 6. Update order status to confirmed
    const updatedOrderRes = await client.query(
      `UPDATE orders 
       SET status = 'confirmed',
           confirmed_at = NOW(),
           subtotal_paise = $1,
           total_paise = $2,
           idempotency_key = $3,
           delivery_address = COALESCE($4, delivery_address),
           delivery_time_text = COALESCE($5, delivery_time_text),
           special_instructions = COALESCE($6, special_instructions),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        grandTotal,
        grandTotal,
        idempotencyKey || null,
        deliveryAddress || null,
        deliveryTimeText || null,
        specialInstructions || null,
        orderId,
      ]
    );

    // 7. Audit log
    await client.query(
      `INSERT INTO audit_log (shop_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'ORDER_CONFIRMED', 'order', $3, $4)`,
      [
        order.shop_id,
        user.id,
        orderId,
        JSON.stringify({ totalPaise: grandTotal, itemCount: validatedItemsData.length }),
      ]
    );

    // 8. System confirmation message
    await client.query(
      `INSERT INTO order_messages (order_id, sender_role, message_text) VALUES ($1, 'system', 'Aapka order confirm ho chuka hai! Shopkeeper ko notification bhej di gayi hai.')`,
      [orderId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      order: updatedOrderRes.rows[0],
      items: validatedItemsData,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Order confirm error:", error);
    return NextResponse.json(
      { error: "Failed to confirm order. Please try again." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
