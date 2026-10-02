import { describe, it, expect } from "vitest";
import {
  correlateVoiceTranscriptRules,
  matchVoiceItemsAgainstCatalog,
  HINDI_ENGLISH_CORRELATIONS,
} from "../../lib/parseOrder";
import { Product } from "../../lib/db/schema";

describe("Voice Order Parsing & AI Correlation (No Aliases Needed)", () => {
  it("correlates Hindi/Hinglish words to English grocery commodities", () => {
    const transcript =
      "bhaiya 2 kilo atta, ek Amul butter aur sugar half kilo, tel bhi chahiye, kal subah tak bhej dena";
    const result = correlateVoiceTranscriptRules(transcript);

    expect(result.items.length).toBeGreaterThanOrEqual(4);
    expect(result.delivery_time_text).toBe("kal subah tak");

    // Check atta correlation
    const attaItem = result.items.find((i) => i.spoken_term.includes("atta"));
    expect(attaItem).toBeDefined();
    expect(attaItem?.english_correlation).toMatch(/Atta|Wheat Flour/i);
    expect(attaItem?.quantity).toBe(2);
    expect(attaItem?.unit).toBe("kg");

    // Check butter correlation
    const butterItem = result.items.find((i) =>
      i.spoken_term.toLowerCase().includes("butter")
    );
    expect(butterItem).toBeDefined();
    expect(butterItem?.brand_hint).toBe("Amul");

    // Check sugar correlation
    const sugarItem = result.items.find((i) =>
      i.spoken_term.toLowerCase().includes("sugar")
    );
    expect(sugarItem).toBeDefined();
    expect(sugarItem?.quantity).toBe(0.5);

    // Check oil (tel) correlation
    const telItem = result.items.find((i) => i.spoken_term.includes("tel"));
    expect(telItem).toBeDefined();
    expect(telItem?.english_correlation).toBe("Cooking Oil");
  });

  it("dynamically correlates 'cheeni' to 'Sugar' without needing any alias", () => {
    const transcript = "adha kilo cheeni aur 1 packet doodh";
    const result = correlateVoiceTranscriptRules(transcript);

    const cheeniItem = result.items.find((i) => i.spoken_term === "cheeni");
    expect(cheeniItem).toBeDefined();
    expect(cheeniItem?.english_correlation).toBe("Sugar");
    expect(cheeniItem?.quantity).toBe(0.5);
    expect(cheeniItem?.unit).toBe("kg");

    const doodhItem = result.items.find((i) => i.spoken_term === "doodh");
    expect(doodhItem).toBeDefined();
    expect(doodhItem?.english_correlation).toBe("Milk");
  });

  it("matches against a catalog product with ZERO aliases using English correlation", () => {
    // Note: The product has EMPTY aliases array. The catalog ONLY has the English name "Madhur Pure Sugar 1kg"
    const catalogWithNoAliases: (Product & { aliases: string[] })[] = [
      {
        id: "prod-sugar-1",
        shopId: "shop-1",
        name: "Madhur Pure Sugar",
        category: "Grocery",
        brand: "Madhur",
        packSize: "1 kg",
        pricePaise: 4800,
        stockQty: "50",
        isActive: true,
        aliases: [], // NO ALIASES CONFIGURED!
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const transcript = "1 kilo cheeni chahiye";
    const parsed = correlateVoiceTranscriptRules(transcript);
    const matched = matchVoiceItemsAgainstCatalog(parsed.items, catalogWithNoAliases);

    expect(matched.length).toBe(1);
    expect(matched[0].matchResult.status).toBe("MATCHED");
    expect(matched[0].matchResult.selectedProduct?.name).toBe("Madhur Pure Sugar");
    expect(matched[0].correlationExplanation).toContain("Sugar");
  });
});
