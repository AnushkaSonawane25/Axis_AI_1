import { Product } from "./db/schema";
import { formatPaise } from "./money";
import {
  matchItemAgainstCatalog,
  CatalogProductWithAliases,
  MatchResult,
} from "./matcher";
import { parseOrderWithLLM, ExtractedItem } from "./llm";

export interface ProcessedItem {
  rawText: string;
  itemName: string;
  quantity: number | null;
  unit: string | null;
  status:
    | "MATCHED"
    | "AMBIGUOUS"
    | "OUT_OF_STOCK"
    | "INSUFFICIENT_STOCK"
    | "NOT_FOUND";
  selectedProduct?: Product;
  candidates: Array<{
    id: string;
    name: string;
    packSize: string;
    pricePaise: number;
    stockQty: string;
    score: number;
  }>;
  alternativeOptions?: Array<{
    id: string;
    name: string;
    packSize: string;
    pricePaise: number;
    stockQty: string;
  }>;
  clarificationQuestion?: string;
  isVague: boolean;
}

export interface PipelineResult {
  items: ProcessedItem[];
  deliveryTimeText: string | null;
  notes: string | null;
  overallStatus: "needs_clarification" | "ready_to_confirm";
  clarificationMessage: string | null;
  suggestedReplies: string[];
}

/**
 * Find in-stock alternatives in the same category or commodity group
 */
export function findInStockAlternatives(
  outOfStockProduct: Product,
  catalog: Product[],
  limit: number = 3
): Array<{
  id: string;
  name: string;
  packSize: string;
  pricePaise: number;
  stockQty: string;
}> {
  return catalog
    .filter(
      (p) =>
        p.id !== outOfStockProduct.id &&
        parseFloat(p.stockQty) > 0 &&
        p.category === outOfStockProduct.category
    )
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.name,
      packSize: p.packSize,
      pricePaise: p.pricePaise,
      stockQty: p.stockQty,
    }));
}

/**
 * Generate ONE short clarification message covering only flagged items
 */
export function generateClarificationMessage(
  flaggedItems: ProcessedItem[]
): { message: string; suggestions: string[] } {
  if (flaggedItems.length === 0) {
    return { message: "", suggestions: [] };
  }

  const parts: string[] = [];
  const suggestions: string[] = [];

  for (const item of flaggedItems) {
    if (item.status === "OUT_OF_STOCK") {
      const prodName = item.selectedProduct
        ? `${item.selectedProduct.name} (${item.selectedProduct.packSize})`
        : item.rawText;

      if (item.alternativeOptions && item.alternativeOptions.length > 0) {
        const altStr = item.alternativeOptions
          .map((a) => `${a.name} ${a.packSize} (${formatPaise(a.pricePaise)})`)
          .join(", ");
        parts.push(
          `${prodName} abhi out of stock hai. Yeh in-stock alternatives available hain: ${altStr}. Kaunsa bheju ya rehne du?`
        );
        for (const alt of item.alternativeOptions) {
          suggestions.push(`${alt.name} ${alt.packSize}`);
        }
        suggestions.push(`${item.itemName || "Item"} rehne do`);
      } else {
        parts.push(`${prodName} abhi out of stock hai. Isko order se hata de?`);
        suggestions.push(`${item.itemName || "Item"} rehne do`);
      }
    } else if (item.status === "INSUFFICIENT_STOCK") {
      const available = item.selectedProduct
        ? parseFloat(item.selectedProduct.stockQty)
        : 0;
      parts.push(
        `${item.rawText}: Stock mein sirf ${available} available hai. Kya ${available} bhej de?`
      );
      suggestions.push(`${available} bhej do`);
      suggestions.push(`${item.itemName || "Item"} rehne do`);
    } else if (item.status === "AMBIGUOUS") {
      if (item.isVague) {
        parts.push(
          `"${item.rawText}": Kitni quantity chahiye? Kripya exact quantity batayein (jaise 1 kg ya 500g).`
        );
        suggestions.push("1 kg");
        suggestions.push("500 g");
      } else if (item.candidates.length > 0) {
        // Group candidate options
        const optionList = item.candidates
          .slice(0, 4)
          .map((c) => `${c.name} ${c.packSize} (${formatPaise(c.pricePaise)})`)
          .join(" ya ");
        parts.push(
          `Kaunsa ${item.itemName || "item"} chahiye: ${optionList}?`
        );
        for (const c of item.candidates.slice(0, 3)) {
          suggestions.push(`${c.name} ${c.packSize}`);
        }
        suggestions.push(`${item.itemName || "Item"} rehne do`);
      }
    } else if (item.status === "NOT_FOUND") {
      parts.push(
        `"${item.rawText}" hamare catalog mein nahi mila. Shopkeeper ko alag se note kar diya hai.`
      );
      suggestions.push(`${item.rawText} rehne do`);
    }
  }

  const message = parts.join("\n\n");
  return { message, suggestions };
}

/**
 * Execute Full Intake Pipeline on an Order Message
 */
export async function runOrderIntakePipeline(
  message: string,
  catalog: CatalogProductWithAliases[]
): Promise<PipelineResult> {
  // 1. Parse using LLM
  const parsed = await parseOrderWithLLM(message);

  // 2. Match each item against catalog
  const processedItems: ProcessedItem[] = [];

  for (const rawItem of parsed.items) {
    const match = matchItemAgainstCatalog(rawItem.raw_text, catalog, {
      requestedQty: rawItem.quantity,
      requestedUnit: rawItem.unit,
      brandHint: rawItem.brand_hint,
      packSizeHint: rawItem.pack_size_hint,
      isVague: rawItem.is_vague,
    });

    let alternatives: ProcessedItem["alternativeOptions"] = undefined;
    if (match.status === "OUT_OF_STOCK" && match.selectedProduct) {
      alternatives = findInStockAlternatives(match.selectedProduct, catalog);
    }

    processedItems.push({
      rawText: rawItem.raw_text,
      itemName: rawItem.item_name || rawItem.raw_text,
      quantity: match.requestedQty,
      unit: match.requestedUnit,
      status: match.status,
      selectedProduct: match.selectedProduct,
      candidates: match.candidates.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        packSize: c.product.packSize,
        pricePaise: c.product.pricePaise,
        stockQty: c.product.stockQty,
        score: c.score,
      })),
      alternativeOptions: alternatives,
      isVague: rawItem.is_vague || match.isVague,
    });
  }

  // 3. Check overall status
  const flagged = processedItems.filter((i) => i.status !== "MATCHED");
  const overallStatus =
    flagged.length > 0 ? "needs_clarification" : "ready_to_confirm";

  const { message: clarificationMessage, suggestions } =
    generateClarificationMessage(flagged);

  return {
    items: processedItems,
    deliveryTimeText: parsed.delivery_time_text || null,
    notes: parsed.notes || null,
    overallStatus,
    clarificationMessage: clarificationMessage || null,
    suggestedReplies: suggestions,
  };
}
