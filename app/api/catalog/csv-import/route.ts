import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { rupeesToPaise } from "@/lib/money";

export async function POST(req: NextRequest) {
  try {
    const { user, shop } = await requireShopkeeper();
    const body = await req.json();
    const csvContent = body.csvContent;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
    }

    const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV", details: parsed.errors },
        { status: 400 }
      );
    }

    let importedCount = 0;

    await db.transaction(async (tx) => {
      for (const row of parsed.data) {
        const name = (row.name || row["Product Name"] || "").trim();
        if (!name) continue;

        const brand = (row.brand || row.Brand || "").trim() || null;
        const category = (row.category || row.Category || "General").trim();
        const packSize = (row.pack_size || row["Pack Size"] || "1 kg").trim();
        const unit = (row.unit || row.Unit || "kg").trim().toLowerCase();
        const priceStr = row.price_rupees || row.price || row.Price || "0";
        const pricePaise = rupeesToPaise(parseFloat(priceStr) || 0);
        const stockStr = row.stock_qty || row.stock || row.Stock || "0";
        const stockQty = (parseFloat(stockStr) || 0).toFixed(2);

        const rawAliases = row.aliases || row.Aliases || "";
        const aliases = rawAliases
          .split(/[,;|]/)
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean);

        const [product] = await tx
          .insert(schema.products)
          .values({
            shopId: shop.id,
            name,
            brand,
            category,
            packSize,
            unit,
            pricePaise,
            stockQty,
            isActive: true,
          })
          .returning();

        for (const alias of aliases) {
          await tx.insert(schema.productAliases).values({
            productId: product.id,
            alias,
          });
        }

        importedCount++;
      }

      await tx.insert(schema.auditLog).values({
        shopId: shop.id,
        userId: user.id,
        action: "CSV_CATALOG_IMPORTED",
        entityType: "catalog",
        details: { rowCount: importedCount },
      });
    });

    return NextResponse.json({
      success: true,
      importedCount,
      message: `Successfully imported ${importedCount} products into your catalog.`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN_NOT_SHOPKEEPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Failed to import CSV" }, { status: 500 });
  }
}
