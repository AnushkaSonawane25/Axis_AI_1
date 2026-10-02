import { normalizeHinglishText } from "./normalizer";
import { Product } from "./db/schema";

export interface CatalogProductWithAliases extends Product {
  aliases?: string[];
}

export interface MatchCandidate {
  product: Product;
  score: number; // 0 to 1
  matchedTerm: string;
  isExactNameOrAlias: boolean;
  packSizeMatch: boolean;
}

export interface MatchResult {
  rawText: string;
  requestedQty: number | null;
  requestedUnit: string | null;
  isVague: boolean;
  status:
    | "MATCHED"
    | "AMBIGUOUS"
    | "OUT_OF_STOCK"
    | "INSUFFICIENT_STOCK"
    | "NOT_FOUND";
  selectedProduct?: Product;
  candidates: MatchCandidate[];
  reason?: string;
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export function trigramSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const getTrigrams = (str: string): Set<string> => {
    const s = `  ${str.toLowerCase()} `;
    const trigrams = new Set<string>();
    for (let i = 0; i < s.length - 2; i++) {
      trigrams.add(s.substring(i, i + 3));
    }
    return trigrams;
  };

  const t1 = getTrigrams(str1);
  const t2 = getTrigrams(str2);

  let intersection = 0;
  for (const trigram of t1) {
    if (t2.has(trigram)) {
      intersection++;
    }
  }

  const union = t1.size + t2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function checkPackSizeMatch(
  packSize: string,
  requestedQty: number | null,
  requestedUnit: string | null
): boolean {
  if (!packSize) return false;
  const normalizedPack = packSize.toLowerCase().replace(/\s+/g, "");

  if (requestedQty !== null && requestedUnit) {
    const target1 = `${requestedQty}${requestedUnit}`.toLowerCase();
    const target2 = `${requestedQty} ${requestedUnit}`.toLowerCase();
    return (
      normalizedPack.includes(target1) ||
      packSize.toLowerCase().includes(target2)
    );
  }

  if (requestedQty !== null) {
    const numMatch = packSize.match(/[0-9]+(?:\.[0-9]+)?/);
    if (numMatch && parseFloat(numMatch[0]) === requestedQty) {
      return true;
    }
  }

  return false;
}

export function matchItemAgainstCatalog(
  rawText: string,
  catalog: CatalogProductWithAliases[],
  options?: {
    requestedQty?: number | null;
    requestedUnit?: string | null;
    brandHint?: string | null;
    packSizeHint?: string | null;
    isVague?: boolean;
  }
): MatchResult {
  const normQuery = normalizeHinglishText(rawText);
  const requestedQty = options?.requestedQty ?? null;
  const requestedUnit = options?.requestedUnit ?? null;
  const isVague = options?.isVague ?? false;

  const candidates: MatchCandidate[] = [];

  for (const product of catalog) {
    const normName = normalizeHinglishText(product.name);
    const normBrand = normalizeHinglishText(product.brand || "");
    const aliases = (product.aliases || []).map((a) => normalizeHinglishText(a));

    let bestScore = 0;
    let matchedTerm = "";
    let isExact = false;

    // Direct name check
    if (normQuery.includes(normName) || normName.includes(normQuery)) {
      bestScore = Math.max(bestScore, 0.85);
      matchedTerm = product.name;
      if (normQuery === normName) {
        isExact = true;
        bestScore = 1.0;
      }
    }

    // Brand check
    if (normBrand && normQuery.includes(normBrand)) {
      bestScore = Math.max(bestScore, 0.7);
    }

    // Alias checks
    for (const alias of aliases) {
      if (alias === normQuery) {
        bestScore = 1.0;
        isExact = true;
        matchedTerm = alias;
        break;
      }

      const aliasWords = alias.split(" ");
      const queryWords = normQuery.split(" ");
      const hasAllAliasWords = aliasWords.every((w) => queryWords.includes(w));

      if (hasAllAliasWords) {
        bestScore = Math.max(bestScore, 0.95);
        matchedTerm = alias;
      } else if (normQuery.includes(alias) || alias.includes(normQuery)) {
        bestScore = Math.max(bestScore, 0.75);
        matchedTerm = alias;
      } else {
        const sim = trigramSimilarity(normQuery, alias);
        if (sim > bestScore) {
          bestScore = sim;
          matchedTerm = alias;
        }
      }
    }

    const nameSim = trigramSimilarity(normQuery, normName);
    if (nameSim > bestScore) {
      bestScore = nameSim;
      matchedTerm = product.name;
    }

    const packMatches = checkPackSizeMatch(
      product.packSize,
      requestedQty,
      requestedUnit
    );

    if (packMatches && bestScore > 0.4) {
      bestScore = Math.min(1.0, bestScore + 0.1);
    }

    if (bestScore >= 0.45) {
      candidates.push({
        product,
        score: bestScore,
        matchedTerm: matchedTerm || product.name,
        isExactNameOrAlias: isExact,
        packSizeMatch: packMatches,
      });
    }
  }

  // Sort descending by score, then packSizeMatch
  candidates.sort((a, b) => {
    if (a.isExactNameOrAlias !== b.isExactNameOrAlias) {
      return a.isExactNameOrAlias ? -1 : 1;
    }
    if (Math.abs(b.score - a.score) > 0.05) {
      return b.score - a.score;
    }
    if (a.packSizeMatch !== b.packSizeMatch) {
      return a.packSizeMatch ? -1 : 1;
    }
    return 0;
  });

  if (candidates.length === 0) {
    return {
      rawText,
      requestedQty,
      requestedUnit,
      isVague,
      status: "NOT_FOUND",
      candidates: [],
      reason: "No matching item found in shop catalog.",
    };
  }

  if (isVague) {
    return {
      rawText,
      requestedQty: null,
      requestedUnit,
      isVague: true,
      status: "AMBIGUOUS",
      candidates,
      reason: "Quantity is vague or unspecified.",
    };
  }

  const topCandidate = candidates[0];

  // If top candidate has an exact alias or name match and no other candidate has an exact alias/name match:
  const exactMatches = candidates.filter((c) => c.isExactNameOrAlias);
  if (exactMatches.length === 1) {
    return flagSingleProduct(
      exactMatches[0].product,
      requestedQty,
      rawText,
      requestedUnit,
      candidates
    );
  }

  // Check pack size match among high candidates
  const closeCandidates = candidates.filter(
    (c) => c.score >= topCandidate.score - 0.08
  );

  if (closeCandidates.length > 1) {
    const packMatches = closeCandidates.filter((c) => c.packSizeMatch);
    if (packMatches.length === 1) {
      return flagSingleProduct(
        packMatches[0].product,
        requestedQty,
        rawText,
        requestedUnit,
        candidates
      );
    }

    return {
      rawText,
      requestedQty,
      requestedUnit,
      isVague,
      status: "AMBIGUOUS",
      candidates: closeCandidates,
      reason: "Multiple products or pack sizes match your request.",
    };
  }

  return flagSingleProduct(
    topCandidate.product,
    requestedQty,
    rawText,
    requestedUnit,
    candidates
  );
}

function flagSingleProduct(
  product: Product,
  requestedQty: number | null,
  rawText: string,
  requestedUnit: string | null,
  candidates: MatchCandidate[]
): MatchResult {
  const stock = parseFloat(product.stockQty);
  const qty = requestedQty ?? 1;

  if (stock <= 0) {
    return {
      rawText,
      requestedQty: qty,
      requestedUnit,
      isVague: false,
      status: "OUT_OF_STOCK",
      selectedProduct: product,
      candidates,
      reason: `${product.name} (${product.packSize}) is currently out of stock.`,
    };
  }

  if (stock < qty) {
    return {
      rawText,
      requestedQty: qty,
      requestedUnit,
      isVague: false,
      status: "INSUFFICIENT_STOCK",
      selectedProduct: product,
      candidates,
      reason: `Only ${stock} available in stock, requested ${qty}.`,
    };
  }

  return {
    rawText,
    requestedQty: qty,
    requestedUnit,
    isVague: false,
    status: "MATCHED",
    selectedProduct: product,
    candidates,
    reason: "Matched with catalog product.",
  };
}
