import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

const StatusSchema = z.object({
  status: z.enum([
    "needs_clarification",
    "ready_to_confirm",
    "confirmed",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  note: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;
    const { user, shop } = await requireShopkeeper();

    const body = await req.json();
    const parsed = StatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { status, note } = parsed.data;

    // Verify order belongs to this shopkeeper's shop
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.shopId, shop.id)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const [updatedOrder] = await db
      .update(schema.orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    // Log to audit log
    await db.insert(schema.auditLog).values({
      shopId: shop.id,
      userId: user.id,
      action: "ORDER_STATUS_UPDATED",
      entityType: "order",
      entityId: orderId,
      details: { from: order.status, to: status, note: note || null },
    });

    // If a note was added, insert into conversation thread
    if (note) {
      await db.insert(schema.orderMessages).values({
        orderId,
        senderRole: "shopkeeper",
        messageText: `Status update: ${status.replace(/_/g, " ")}. Note: ${note}`,
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN_NOT_SHOPKEEPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Order status update error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
