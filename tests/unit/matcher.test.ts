import { describe, it, expect } from "vitest";
import { matchItemAgainstCatalog, CatalogProductWithAliases } from "../../lib/matcher";
import { Product } from "../../lib/db/schema";

const mockCatalog: CatalogProductWithAliases[] = [
  {
    id: "prod-1",
    shopId: "shop-1",
    name: "Aashirvaad Shudh Chakki Atta",
    brand: "Aashirvaad",
    category: "Flours & Grains",
    packSize: "5 kg",
    unit: "kg",
    pricePaise: 23000,
    stockQty: "20.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["aashirvaad aata", "chakki atta", "wheat flour", "aata", "atta"],
  },
  {
    id: "prod-2",
    shopId: "shop-1",
    name: "Aashirvaad Shudh Chakki Atta",
    brand: "Aashirvaad",
    category: "Flours & Grains",
    packSize: "10 kg",
    unit: "kg",
    pricePaise: 44000,
    stockQty: "15.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["atta 10kg", "10 kilo aata"],
  },
  {
    id: "prod-3",
    shopId: "shop-1",
    name: "Fortune Sunlite Refined Sunflower Oil",
    brand: "Fortune",
    category: "Edible Oils",
    packSize: "1 L",
    unit: "l",
    pricePaise: 14500,
    stockQty: "25.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["sunflower oil", "sunflower tel", "refined tel", "tel"],
  },
  {
    id: "prod-4",
    shopId: "shop-1",
    name: "Fortune Kachi Ghani Pure Mustard Oil",
    brand: "Fortune",
    category: "Edible Oils",
    packSize: "1 L",
    unit: "l",
    pricePaise: 16500,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["mustard oil", "sarson tel", "sarso tel", "mustrad tel", "tel"],
  },
  {
    id: "prod-5",
    shopId: "shop-1",
    name: "Madhur Pure & Hygienic Sugar",
    brand: "Madhur",
    category: "Sugar & Sweeteners",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 4800,
    stockQty: "50.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["sugar", "cheeni", "chini", "shakkar"],
  },
  {
    id: "prod-6",
    shopId: "shop-1",
    name: "Amul Butter Pasteurized",
    brand: "Amul",
    category: "Dairy",
    packSize: "100 g",
    unit: "g",
    pricePaise: 5800,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["amul butter", "butter", "makhan", "butter 100g"],
  },
  {
    id: "prod-7",
    shopId: "shop-1",
    name: "Amul Taaza Homogenised Toned Milk",
    brand: "Amul",
    category: "Dairy",
    packSize: "1 L",
    unit: "l",
    pricePaise: 7200,
    stockQty: "0.00", // Out of stock
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["amul doodh", "toned milk", "doodh", "milk", "amul milk"],
  },
];

describe("Catalog Matcher Unit Tests", () => {
  it("matches typo 'aata' and pack size 5 kg to Aashirvaad Atta 5kg", () => {
    const res = matchItemAgainstCatalog("aata", mockCatalog, {
      requestedQty: 5,
      requestedUnit: "kg",
    });
    expect(res.status).toBe("MATCHED");
    expect(res.selectedProduct?.id).toBe("prod-1");
  });

  it("matches typo 'cheeni' to Madhur Sugar", () => {
    const res = matchItemAgainstCatalog("cheeni", mockCatalog, {
      requestedQty: 1,
      requestedUnit: "kg",
    });
    expect(res.status).toBe("MATCHED");
    expect(res.selectedProduct?.id).toBe("prod-5");
  });

  it("matches typo 'mustrad tel' to Fortune Mustard Oil", () => {
    const res = matchItemAgainstCatalog("mustrad tel", mockCatalog, {
      requestedQty: 1,
      requestedUnit: "l",
    });
    expect(res.status).toBe("MATCHED");
    expect(res.selectedProduct?.id).toBe("prod-4");
  });

  it("matches 'amul butter' to Amul Butter 100g", () => {
    const res = matchItemAgainstCatalog("amul butter", mockCatalog, {
      requestedQty: 1,
    });
    expect(res.status).toBe("MATCHED");
    expect(res.selectedProduct?.id).toBe("prod-6");
  });

  it("flags generic 'tel' as AMBIGUOUS due to multiple candidate oils", () => {
    const res = matchItemAgainstCatalog("tel", mockCatalog, {
      requestedQty: 1,
      requestedUnit: "l",
    });
    expect(res.status).toBe("AMBIGUOUS");
    expect(res.candidates.length).toBeGreaterThan(1);
  });

  it("flags out of stock items accurately ('doodh')", () => {
    const res = matchItemAgainstCatalog("doodh", mockCatalog, {
      requestedQty: 1,
      requestedUnit: "l",
    });
    expect(res.status).toBe("OUT_OF_STOCK");
    expect(res.selectedProduct?.id).toBe("prod-7");
  });

  it("flags unknown product as NOT_FOUND", () => {
    const res = matchItemAgainstCatalog("non-existent item xyz 99", mockCatalog, {
      requestedQty: 1,
    });
    expect(res.status).toBe("NOT_FOUND");
    expect(res.candidates.length).toBe(0);
  });
});
