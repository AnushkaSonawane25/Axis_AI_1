import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { ShopkeeperOrderDetailClient } from "./ShopkeeperOrderDetailClient";
import { eq, and } from "drizzle-orm";

export default async function ShopkeeperOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = await params;
  const { user, shop } = await requireShopkeeper();

  // Fetch order belonging to this shopkeeper
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.shopId, shop.id)))
    .limit(1);

  if (!order) {
    notFound();
  }

  // Fetch items
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));

  // Fetch messages
  const messages = await db
    .select()
    .from(schema.orderMessages)
    .where(eq(schema.orderMessages.orderId, order.id))
    .orderBy(schema.orderMessages.createdAt);

  // Fetch full shop catalog so shopkeeper can manually override
  const catalog = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.shopId, shop.id))
    .orderBy(schema.products.name);

  return (
    <ShopkeeperOrderDetailClient
      initialOrder={order}
      initialItems={items}
      initialMessages={messages}
      shop={shop}
      catalog={catalog}
    />
  );
}
