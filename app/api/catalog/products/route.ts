import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { rupeesToPaise } from "@/lib/money";
import { eq, and, ilike } from "drizzle-orm";

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  brand: z.string().optional(),
  category: z.string().default("General"),
  packSize: z.string().min(1, "Pack size is required (e.g. 1 kg, 500 g)"),
  unit: z.enum(["kg", "g", "l", "ml", "pack", "pcs", "dozen"]).default("kg"),
  priceRupees: z.number().positive("Price must be positive"),
  stockQty: z.number().min(0, "Stock cannot be negative"),
  isActive: z.boolean().default(true),
  aliases: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const { shop } = await requireShopkeeper();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const productList = await db
      .select()
      .from(schema.products)
      .where(
        search
          ? and(
              eq(schema.products.shopId, shop.id),
              ilike(schema.products.name, `%${search}%`)
            )
          : eq(schema.products.shopId, shop.id)
      )
      .orderBy(schema.products.name);

    // Fetch aliases for all products in this shop
    const aliases = await db
      .select()
      .from(schema.productAliases);

    const aliasMap = new Map<string, string[]>();
    for (const a of aliases) {
      const list = aliasMap.get(a.productId) || [];
      list.push(a.alias);
      aliasMap.set(a.productId, list);
    }

    const result = productList.map((p) => ({
      ...p,
      aliases: aliasMap.get(p.id) || [],
    }));

    return NextResponse.json({ success: true, products: result });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN_NOT_SHOPKEEPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, shop } = await requireShopkeeper();
    const body = await req.json();
    const parsed = ProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid product data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      brand,
      category,
      packSize,
      unit,
      priceRupees,
      stockQty,
      isActive,
      aliases,
    } = parsed.data;

    const pricePaise = rupeesToPaise(priceRupees);

    const saved = await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(schema.products)
        .values({
          shopId: shop.id,
          name,
          brand: brand || null,
          category,
          packSize,
          unit,
          pricePaise,
          stockQty: stockQty.toFixed(2),
          isActive,
        })
        .returning();

      for (const alias of aliases) {
        if (alias.trim()) {
          await tx.insert(schema.productAliases).values({
            productId: product.id,
            alias: alias.trim().toLowerCase(),
          });
        }
      }

      await tx.insert(schema.auditLog).values({
        shopId: shop.id,
        userId: user.id,
        action: "PRODUCT_CREATED",
        entityType: "product",
        entityId: product.id,
        details: { name, pricePaise, stockQty },
      });

      return product;
    });

    return NextResponse.json({ success: true, product: saved });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN_NOT_SHOPKEEPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, shop } = await requireShopkeeper();
    const body = await req.json();
    const parsed = ProductSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: "Product ID and valid data required" }, { status: 400 });
    }

    const {
      id,
      name,
      brand,
      category,
      packSize,
      unit,
      priceRupees,
      stockQty,
      isActive,
      aliases,
    } = parsed.data;

    const pricePaise = rupeesToPaise(priceRupees);

    // Verify product belongs to shop
    const [existing] = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, id), eq(schema.products.shopId, shop.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updated = await db.transaction(async (tx) => {
      const [product] = await tx
        .update(schema.products)
        .set({
          name,
          brand: brand || null,
          category,
          packSize,
          unit,
          pricePaise,
          stockQty: stockQty.toFixed(2),
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, id))
        .returning();

      // Replace aliases
      await tx
        .delete(schema.productAliases)
        .where(eq(schema.productAliases.productId, id));

      for (const alias of aliases) {
        if (alias.trim()) {
          await tx.insert(schema.productAliases).values({
            productId: id,
            alias: alias.trim().toLowerCase(),
          });
        }
      }

      await tx.insert(schema.auditLog).values({
        shopId: shop.id,
        userId: user.id,
        action: "PRODUCT_UPDATED",
        entityType: "product",
        entityId: id,
        details: { name, pricePaise, stockQty },
      });

      return product;
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN_NOT_SHOPKEEPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, shop } = await requireShopkeeper();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, id), eq(schema.products.shopId, shop.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await db.delete(schema.products).where(eq(schema.products.id, id));

    await db.insert(schema.auditLog).values({
      shopId: shop.id,
      userId: user.id,
      action: "PRODUCT_DELETED",
      entityType: "product",
      entityId: id,
      details: { name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN_NOT_SHOPKEEPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
