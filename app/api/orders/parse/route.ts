import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { runOrderIntakePipeline } from "@/lib/pipeline";
import { calculateLineTotal, calculateOrderTotals } from "@/lib/money";
import { eq } from "drizzle-orm";

const ParseOrderSchema = z.object({
  shopSlug: z.string().min(1),
  message: z.string().min(2, "Message too short").max(1000, "Message exceeds 1000 characters"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rate = checkRateLimit(`order-parse:${ip}`, 20, 60 * 1000);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many order requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // 2. Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please log in as a customer to place an order." },
        { status: 401 }
      );
    }

    if (user.role !== "customer") {
      return NextResponse.json(
        { error: "Shopkeepers cannot place orders. Please use a customer account." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = ParseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { shopSlug, message, customerName, customerPhone, deliveryAddress } = parsed.data;

    // 3. Find shop
    const [shop] = await db
      .select()
      .from(schema.shops)
      .where(eq(schema.shops.slug, shopSlug))
      .limit(1);

    if (!shop || !shop.isActive) {
      return NextResponse.json(
        { error: "Shop not found or currently inactive." },
        { status: 404 }
      );
    }

    // 4. Fetch shop's active catalog with aliases
    const rawProducts = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.shopId, shop.id));

    const rawAliases = await db
      .select()
      .from(schema.productAliases);

    const aliasesByProduct = new Map<string, string[]>();
    for (const a of rawAliases) {
      const arr = aliasesByProduct.get(a.productId) || [];
      arr.push(a.alias);
      aliasesByProduct.set(a.productId, arr);
    }

    const catalogWithAliases = rawProducts.map((p) => ({
      ...p,
      aliases: aliasesByProduct.get(p.id) || [],
    }));

    // 5. Run intake pipeline
    const pipelineResult = await runOrderIntakePipeline(message, catalogWithAliases);

    // 6. Persist order, order_items, and order_messages in a transaction
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const savedOrder = await db.transaction(async (tx) => {
      // Create order
      const [newOrder] = await tx
        .insert(schema.orders)
        .values({
          shopId: shop.id,
          customerId: user.id,
          orderNumber,
          status: pipelineResult.overallStatus,
          customerName: customerName || user.name,
          customerPhone: customerPhone || user.phone,
          deliveryAddress: deliveryAddress || user.address,
          deliveryTimeText: pipelineResult.deliveryTimeText,
          specialInstructions: pipelineResult.notes,
          subtotalPaise: 0,
          totalPaise: 0,
        })
        .returning();

      // Insert customer original message
      await tx.insert(schema.orderMessages).values({
        orderId: newOrder.id,
        senderRole: "customer",
        messageText: message,
      });

      // Insert system clarification message if needed
      if (pipelineResult.clarificationMessage) {
        await tx.insert(schema.orderMessages).values({
          orderId: newOrder.id,
          senderRole: "system",
          messageText: pipelineResult.clarificationMessage,
          suggestedReplies: pipelineResult.suggestedReplies,
        });
      }

      // Insert order items
      const createdItems: schema.OrderItem[] = [];
      for (const item of pipelineResult.items) {
        const selectedProd = item.selectedProduct;
        const lineTotal =
          item.status === "MATCHED" && selectedProd
            ? calculateLineTotal(item.quantity || 1, selectedProd.pricePaise)
            : 0;

        const [createdItem] = await tx
          .insert(schema.orderItems)
          .values({
            orderId: newOrder.id,
            productId: selectedProd ? selectedProd.id : null,
            rawText: item.rawText,
            productNameSnapshot: selectedProd ? selectedProd.name : null,
            brandSnapshot: selectedProd ? selectedProd.brand : null,
            packSizeSnapshot: selectedProd ? selectedProd.packSize : null,
            unitPricePaiseSnapshot: selectedProd ? selectedProd.pricePaise : null,
            quantity: String(item.quantity || 1),
            lineTotalPaise: lineTotal,
            matchStatus: item.status,
            matchMetadata: {
              candidates: item.candidates,
              alternativeOptions: item.alternativeOptions,
              isVague: item.isVague,
              itemName: item.itemName,
            },
          })
          .returning();
        createdItems.push(createdItem);
      }

      // Compute totals if items matched
      const totals = calculateOrderTotals(
        createdItems.map((ci) => ({
          matchStatus: ci.matchStatus,
          lineTotalPaise: ci.lineTotalPaise,
        }))
      );

      await tx
        .update(schema.orders)
        .set({
          subtotalPaise: totals.subtotalPaise,
          totalPaise: totals.totalPaise,
        })
        .where(eq(schema.orders.id, newOrder.id));

      return {
        ...newOrder,
        subtotalPaise: totals.subtotalPaise,
        totalPaise: totals.totalPaise,
        items: createdItems,
        clarificationMessage: pipelineResult.clarificationMessage,
        suggestedReplies: pipelineResult.suggestedReplies,
      };
    });

    return NextResponse.json({
      success: true,
      order: savedOrder,
    });
  } catch (error: any) {
    console.error("Order parse error:", error);
    return NextResponse.json(
      { error: "Could not parse order message. You can retry or message the shopkeeper directly." },
      { status: 500 }
    );
  }
}
