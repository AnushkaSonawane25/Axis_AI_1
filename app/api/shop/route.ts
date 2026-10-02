import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

const UpdateShopSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  phone: z.string().optional(),
  address: z.string().optional(),
  deliveryNotes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const { shop } = await requireShopkeeper();
    return NextResponse.json({ success: true, shop });
  } catch (error: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, shop } = await requireShopkeeper();
    const body = await req.json();
    const parsed = UpdateShopSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const [updated] = await db
      .update(schema.shops)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.shops.id, shop.id))
      .returning();

    await db.insert(schema.auditLog).values({
      shopId: shop.id,
      userId: user.id,
      action: "SHOP_PROFILE_UPDATED",
      entityType: "shop",
      entityId: shop.id,
      details: parsed.data,
    });

    return NextResponse.json({ success: true, shop: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 });
  }
}
