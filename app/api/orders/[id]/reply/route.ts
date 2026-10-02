import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveClarificationWithLLM } from "@/lib/llm";
import { calculateLineTotal, calculateOrderTotals } from "@/lib/money";
import { generateClarificationMessage, ProcessedItem } from "@/lib/pipeline";
import { eq, and } from "drizzle-orm";

const ReplySchema = z.object({
  replyText: z.string().min(1).max(1000),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reply" }, { status: 400 });
    }

    const { replyText } = parsed.data;

    // 1. Fetch order and verify authorization
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Role check: customer must own order, or shopkeeper must own the shop
    let senderRole: "customer" | "shopkeeper" = "customer";
    if (user.role === "customer") {
      if (order.customerId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (user.role === "shopkeeper") {
      const [shop] = await db
        .select()
        .from(schema.shops)
        .where(
          and(eq(schema.shops.id, order.shopId), eq(schema.shops.ownerId, user.id))
        )
        .limit(1);

      if (!shop) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      senderRole = "shopkeeper";
    }

    // 2. Fetch order items and catalog
    const currentItems = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    const flaggedItems = currentItems.filter((i) => i.matchStatus !== "MATCHED");

    if (flaggedItems.length === 0) {
      return NextResponse.json(
        { error: "No pending clarifications for this order." },
        { status: 400 }
      );
    }

    const catalogProducts = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.shopId, order.shopId));

    const catalogMap = new Map(catalogProducts.map((p) => [p.id, p]));

    // Format open items for resolution
    const openItemsContext = flaggedItems.map((item) => {
      const meta = (item.matchMetadata as any) || {};
      const candidates = (meta.candidates || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        packSize: c.packSize,
        pricePaise: c.pricePaise,
      }));
      const alternatives = (meta.alternativeOptions || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        packSize: a.packSize,
        pricePaise: a.pricePaise,
      }));

      return {
        rawText: item.rawText,
        candidates: candidates.length > 0 ? candidates : alternatives,
      };
    });

    // 3. Resolve clarification reply
    const resolutionOutput = await resolveClarificationWithLLM(
      replyText,
      openItemsContext
    );

    // 4. Update order items in transaction
    const updatedOrder = await db.transaction(async (tx) => {
      // Record sender's reply
      await tx.insert(schema.orderMessages).values({
        orderId: order.id,
        senderRole,
        messageText: replyText,
      });

      for (const res of resolutionOutput.resolutions) {
        const targetItem = flaggedItems.find(
          (fi) => fi.rawText.toLowerCase() === res.raw_text.toLowerCase()
        ) || flaggedItems[0];

        if (!targetItem) continue;

        if (res.action === "drop") {
          // Customer decided to remove / drop this item
          await tx
            .delete(schema.orderItems)
            .where(eq(schema.orderItems.id, targetItem.id));
        } else if (res.action === "select" && res.chosen_product_id) {
          const product = catalogMap.get(res.chosen_product_id);
          if (product) {
            const qty = res.quantity || 1;
            const lineTotal = calculateLineTotal(qty, product.pricePaise);

            await tx
              .update(schema.orderItems)
              .set({
                productId: product.id,
                productNameSnapshot: product.name,
                brandSnapshot: product.brand,
                packSizeSnapshot: product.packSize,
                unitPricePaiseSnapshot: product.pricePaise,
                quantity: String(qty),
                lineTotalPaise: lineTotal,
                matchStatus: "MATCHED",
                updatedAt: new Date(),
              })
              .where(eq(schema.orderItems.id, targetItem.id));
          }
        }
      }

      // Fetch refreshed items
      const refreshedItems = await tx
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      const remainingFlagged = refreshedItems.filter(
        (i) => i.matchStatus !== "MATCHED"
      );

      let newStatus = order.status;
      let clarifyMsg: string | null = null;
      let suggestions: string[] = [];

      if (remainingFlagged.length === 0) {
        newStatus = "ready_to_confirm";
        clarifyMsg = "Sabhi items confirm ho gaye hain! Kripya bill review karein aur 'Confirm Order' par tap karein.";
        suggestions = ["Order Confirm Karein"];

        await tx.insert(schema.orderMessages).values({
          orderId: order.id,
          senderRole: "system",
          messageText: clarifyMsg,
          suggestedReplies: suggestions,
        });
      } else {
        const processedRemaining: ProcessedItem[] = remainingFlagged.map((i) => ({
          rawText: i.rawText,
          itemName: i.rawText,
          quantity: parseFloat(i.quantity),
          unit: null,
          status: i.matchStatus as any,
          candidates: (i.matchMetadata as any)?.candidates || [],
          alternativeOptions: (i.matchMetadata as any)?.alternativeOptions || [],
          isVague: (i.matchMetadata as any)?.isVague || false,
        }));

        const gen = generateClarificationMessage(processedRemaining);
        clarifyMsg = gen.message;
        suggestions = gen.suggestions;

        await tx.insert(schema.orderMessages).values({
          orderId: order.id,
          senderRole: "system",
          messageText: clarifyMsg,
          suggestedReplies: suggestions,
        });
      }

      const totals = calculateOrderTotals(
        refreshedItems.map((ri) => ({
          matchStatus: ri.matchStatus,
          lineTotalPaise: ri.lineTotalPaise,
        }))
      );

      const [finalOrder] = await tx
        .update(schema.orders)
        .set({
          status: newStatus as any,
          subtotalPaise: totals.subtotalPaise,
          totalPaise: totals.totalPaise,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, order.id))
        .returning();

      return {
        ...finalOrder,
        items: refreshedItems,
        clarificationMessage: clarifyMsg,
        suggestedReplies: suggestions,
      };
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Clarification reply error:", error);
    return NextResponse.json(
      { error: "Could not process reply. Please try again." },
      { status: 500 }
    );
  }
}
