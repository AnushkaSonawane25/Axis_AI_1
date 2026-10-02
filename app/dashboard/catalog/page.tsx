import { requireShopkeeper } from "@/lib/auth/session";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { CatalogManagerClient } from "./CatalogManagerClient";
import { eq } from "drizzle-orm";

export default async function CatalogPage() {
  const { shop } = await requireShopkeeper();

  const productsList = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.shopId, shop.id))
    .orderBy(schema.products.name);

  const aliases = await db.select().from(schema.productAliases);

  const aliasMap = new Map<string, string[]>();
  for (const a of aliases) {
    const list = aliasMap.get(a.productId) || [];
    list.push(a.alias);
    aliasMap.set(a.productId, list);
  }

  const enrichedProducts = productsList.map((p) => ({
    ...p,
    aliases: aliasMap.get(p.id) || [],
  }));

  return <CatalogManagerClient initialProducts={enrichedProducts} shop={shop} />;
}
