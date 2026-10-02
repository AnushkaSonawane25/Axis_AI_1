import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { calculateLineTotal, calculateOrderTotals } from "@/lib/money";
import { eq, and } from "drizzle-orm";

const OverrideSchema = z.object({
  itemId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  quantity: z.number().positive().optional(),
  matchStatus: z
    .enum(["MATCHED", "AMBIGUOUS", "OUT_OF_STOCK", "INSUFFICIENT_STOCK", "NOT_FOUND"])
    .optional(),
  action: z.enum(["update", "drop"]).default("update"),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;
    const { user, shop } = await requireShopkeeper();

    const body = await req.json();
    const parsed = OverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid override data" }, { status: 400 });
    }

    const { itemId, productId, quantity, matchStatus, action } = parsed.data;

    // Verify order belongs to shop
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.shopId, shop.id)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "drop") {
      await db.delete(schema.orderItems).where(eq(schema.orderItems.id, itemId));
    } else {
      let productUpdate: Partial<typeof schema.orderItems.$inferInsert> = {};

      if (productId) {
        const [product] = await db
          .select()
          .from(schema.products)
          .where(and(eq(schema.products.id, productId), eq(schema.products.shopId, shop.id)))
          .limit(1);

        if (!product) {
          return NextResponse.json({ error: "Product not in shop catalog" }, { status: 400 });
        }

        const qty = quantity || 1;
        const lineTotal = calculateLineTotal(qty, product.pricePaise);

        productUpdate = {
          productId: product.id,
          productNameSnapshot: product.name,
          brandSnapshot: product.brand,
          packSizeSnapshot: product.packSize,
          unitPricePaiseSnapshot: product.pricePaise,
          quantity: String(qty),
          lineTotalPaise: lineTotal,
          matchStatus: matchStatus || "MATCHED",
        };
      } else if (quantity) {
        // Just quantity update
        const [existingItem] = await db
          .select()
          .from(schema.orderItems)
          .where(eq(schema.orderItems.id, itemId))
          .limit(1);

        if (existingItem && existingItem.unitPricePaiseSnapshot) {
          productUpdate = {
            quantity: String(quantity),
            lineTotalPaise: calculateLineTotal(quantity, existingItem.unitPricePaiseSnapshot),
          };
        }
      }

      await db
        .update(schema.orderItems)
        .set({ ...productUpdate, updatedAt: new Date() })
        .where(eq(schema.orderItems.id, itemId));
    }

    // Recalculate remaining items
    const refreshedItems = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));

    const remainingFlagged = refreshedItems.filter((i) => i.matchStatus !== "MATCHED");
    const newStatus =
      remainingFlagged.length === 0 ? "ready_to_confirm" : "needs_clarification";

    const totals = calculateOrderTotals(
      refreshedItems.map((ri) => ({
        matchStatus: ri.matchStatus,
        lineTotalPaise: ri.lineTotalPaise,
      }))
    );

    const [updatedOrder] = await db
      .update(schema.orders)
      .set({
        status: newStatus as any,
        subtotalPaise: totals.subtotalPaise,
        totalPaise: totals.totalPaise,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    // Audit log
    await db.insert(schema.auditLog).values({
      shopId: shop.id,
      userId: user.id,
      action: "ITEM_MANUALLY_OVERRIDDEN",
      entityType: "order_item",
      entityId: itemId,
      details: { action, productId, quantity, matchStatus },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      items: refreshedItems,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN_NOT_SHOPKEEPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Order item override error:", error);
    return NextResponse.json({ error: "Failed to override item" }, { status: 500 });
  }
}
