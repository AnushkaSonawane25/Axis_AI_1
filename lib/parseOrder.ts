import { z } from "zod";
import { parseHinglishQuantity, isVagueQuantity, normalizeHinglishText } from "./normalizer";
import { CatalogProductWithAliases, MatchResult, matchItemAgainstCatalog } from "./matcher";

/**
 * Structured schema for an item parsed by the AI Agent.
 * Note: No shopkeeper aliases are needed because the AI discovers and outputs
 * the direct correlation between the Hindi/Hinglish word and the English product name.
 */
export const CorrelatedItemSchema = z.object({
  raw_text: z.string(),
  spoken_term: z.string(),
  english_correlation: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  brand_hint: z.string().nullable().optional(),
  pack_size_hint: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  confidence: z.number().default(0.9),
  is_vague: z.boolean().default(false),
});

export const ParsedVoiceOrderSchema = z.object({
  raw_transcript: z.string(),
  detected_language: z.enum(["hinglish", "hindi", "english", "mixed"]),
  items: z.array(CorrelatedItemSchema),
  delivery_time_text: z.string().nullable().optional(),
  special_notes: z.string().nullable().optional(),
  summary: z.string().optional(),
});

export type CorrelatedItem = z.infer<typeof CorrelatedItemSchema>;
export type ParsedVoiceOrder = z.infer<typeof ParsedVoiceOrderSchema>;

/**
 * Comprehensive Hindi / Hinglish to English grocery commodity correlation dictionary.
 * Used for instant semantic lookup, zero-latency offline processing, and fallback when LLM key is absent.
 */
export const HINDI_ENGLISH_CORRELATIONS: Record<string, { english: string; category: string }> = {
  // Staples, Flours & Grains
  atta: { english: "Atta", category: "Staples & Flours" },
  aata: { english: "Wheat Flour", category: "Staples & Flours" },
  gehun: { english: "Wheat Flour", category: "Staples & Flours" },
  gehu: { english: "Wheat Flour", category: "Staples & Flours" },
  chawal: { english: "Rice", category: "Rice & Grains" },
  chaawal: { english: "Basmati Rice", category: "Rice & Grains" },
  bhaat: { english: "Rice", category: "Rice & Grains" },
  maida: { english: "Refined Flour", category: "Staples & Flours" },
  besan: { english: "Gram Flour", category: "Staples & Flours" },
  sooji: { english: "Semolina", category: "Staples & Flours" },
  suji: { english: "Semolina", category: "Staples & Flours" },
  rava: { english: "Rava / Semolina", category: "Staples & Flours" },
  poha: { english: "Flattened Rice", category: "Breakfast & Cereals" },

  // Sweeteners & Sugar
  cheeni: { english: "Sugar", category: "Sugar & Sweeteners" },
  chini: { english: "Sugar", category: "Sugar & Sweeteners" },
  shakkar: { english: "Sugar", category: "Sugar & Sweeteners" },
  khand: { english: "Cane Sugar", category: "Sugar & Sweeteners" },
  gud: { english: "Jaggery", category: "Sugar & Sweeteners" },
  gur: { english: "Jaggery", category: "Sugar & Sweeteners" },
  bura: { english: "Castor Sugar", category: "Sugar & Sweeteners" },
  honey: { english: "Honey", category: "Sugar & Sweeteners" },
  shehad: { english: "Honey", category: "Sugar & Sweeteners" },

  // Dairy & Fats
  doodh: { english: "Milk", category: "Dairy" },
  dudh: { english: "Milk", category: "Dairy" },
  makhan: { english: "Butter", category: "Dairy" },
  makkhan: { english: "Butter", category: "Dairy" },
  paneer: { english: "Cottage Cheese", category: "Dairy" },
  dahi: { english: "Curd / Yogurt", category: "Dairy" },
  chaas: { english: "Buttermilk", category: "Dairy" },
  ghee: { english: "Desi Ghee", category: "Edible Oils & Ghee" },
  tel: { english: "Cooking Oil", category: "Edible Oils & Ghee" },
  tail: { english: "Edible Oil", category: "Edible Oils & Ghee" },
  "sarson tel": { english: "Mustard Oil", category: "Edible Oils & Ghee" },
  sarson: { english: "Mustard Oil", category: "Edible Oils & Ghee" },
  "sunflower tel": { english: "Sunflower Oil", category: "Edible Oils & Ghee" },
  "moongfali tel": { english: "Groundnut Oil", category: "Edible Oils & Ghee" },
  refine: { english: "Refined Oil", category: "Edible Oils & Ghee" },
  refined: { english: "Refined Cooking Oil", category: "Edible Oils & Ghee" },

  // Salt & Spices
  namak: { english: "Salt", category: "Salt, Spices & Masalas" },
  noon: { english: "Salt", category: "Salt, Spices & Masalas" },
  haldi: { english: "Turmeric Powder", category: "Salt, Spices & Masalas" },
  mirch: { english: "Chilli Powder", category: "Salt, Spices & Masalas" },
  "laal mirch": { english: "Red Chilli Powder", category: "Salt, Spices & Masalas" },
  "hari mirch": { english: "Green Chillies", category: "Fresh Vegetables" },
  dhaniya: { english: "Coriander Powder", category: "Salt, Spices & Masalas" },
  dhania: { english: "Coriander", category: "Salt, Spices & Masalas" },
  jeera: { english: "Cumin Seeds", category: "Salt, Spices & Masalas" },
  zeera: { english: "Cumin Seeds", category: "Salt, Spices & Masalas" },
  garam_masala: { english: "Garam Masala", category: "Salt, Spices & Masalas" },
  hing: { english: "Asafoetida", category: "Salt, Spices & Masalas" },
  rai: { english: "Black Mustard Seeds", category: "Salt, Spices & Masalas" },
  ajwain: { english: "Carom Seeds", category: "Salt, Spices & Masalas" },
  methi: { english: "Fenugreek", category: "Salt, Spices & Masalas" },
  saunf: { english: "Fennel Seeds", category: "Salt, Spices & Masalas" },
  elaichi: { english: "Cardamom", category: "Spices" },
  laung: { english: "Cloves", category: "Spices" },
  dalchini: { english: "Cinnamon", category: "Spices" },

  // Pulses & Dals
  dal: { english: "Lentils / Dal", category: "Dals & Pulses" },
  daal: { english: "Lentils / Dal", category: "Dals & Pulses" },
  toor: { english: "Toor Dal", category: "Dals & Pulses" },
  arhar: { english: "Toor Dal", category: "Dals & Pulses" },
  tuvar: { english: "Toor Dal", category: "Dals & Pulses" },
  moong: { english: "Moong Dal", category: "Dals & Pulses" },
  urad: { english: "Urad Dal", category: "Dals & Pulses" },
  chana: { english: "Chana Dal", category: "Dals & Pulses" },
  chhole: { english: "Chickpeas", category: "Dals & Pulses" },
  rajma: { english: "Kidney Beans", category: "Dals & Pulses" },
  masoor: { english: "Masoor Dal", category: "Dals & Pulses" },

  // Beverages & Packaged Foods
  chai: { english: "Tea", category: "Beverages" },
  tea: { english: "Tea", category: "Beverages" },
  patti: { english: "Tea Leaf", category: "Beverages" },
  coffee: { english: "Coffee", category: "Beverages" },
  maggi: { english: "Maggi Noodles", category: "Instant Food" },
  noodles: { english: "Noodles", category: "Instant Food" },
  pasta: { english: "Pasta", category: "Instant Food" },
  biscuit: { english: "Biscuits", category: "Bakery & Snacks" },
  biskut: { english: "Biscuits", category: "Bakery & Snacks" },
  rusk: { english: "Toast Rusk", category: "Bakery & Snacks" },
  bread: { english: "Bread", category: "Bakery" },
  pav: { english: "Pav / Buns", category: "Bakery" },
  anda: { english: "Eggs", category: "Eggs & Poultry" },
  ande: { english: "Eggs", category: "Eggs & Poultry" },

  // Vegetables & Daily Essentials
  pyaaz: { english: "Onion", category: "Vegetables" },
  pyaz: { english: "Onion", category: "Vegetables" },
  kanda: { english: "Onion", category: "Vegetables" },
  aalu: { english: "Potato", category: "Vegetables" },
  aloo: { english: "Potato", category: "Vegetables" },
  alu: { english: "Potato", category: "Vegetables" },
  tamatar: { english: "Tomato", category: "Vegetables" },
  adrak: { english: "Ginger", category: "Vegetables" },
  adrakh: { english: "Ginger", category: "Vegetables" },
  lahsun: { english: "Garlic", category: "Vegetables" },
  lasun: { english: "Garlic", category: "Vegetables" },
  nimbu: { english: "Lemon", category: "Vegetables" },

  // Household & Personal
  sabun: { english: "Soap", category: "Household & Personal Care" },
  surf: { english: "Detergent Powder", category: "Household & Cleaning" },
  colgate: { english: "Toothpaste", category: "Personal Care" },
  paste: { english: "Toothpaste", category: "Personal Care" },
};

/**
 * Intelligent Semantic Correlation Engine (runs in Node/Next.js without external API dependency)
 * Extracts items, numbers, units, and maps spoken Hindi/Hinglish terms directly to English words.
 */
export function correlateVoiceTranscriptRules(transcript: string): ParsedVoiceOrder {
  const clean = transcript.trim();

  // 1. Detect delivery time phrases
  let delivery_time_text: string | null = null;
  const timeRegex = /(kal subah tak|kal shaam tak|aaj shaam tak|jaldi bhej dena|subah tak|shaam tak|by evening|tomorrow morning|by 6 pm|today evening)/i;
  const timeMatch = clean.match(timeRegex);
  if (timeMatch) {
    delivery_time_text = timeMatch[0];
  }

  // 2. Detect special notes
  let special_notes: string | null = null;
  const noteRegex = /(jaldi bhejna|bill sath mein bhejna|call karke aana|doorbell mat bajana|change leke aana|fresh pack dena)/i;
  const noteMatch = clean.match(noteRegex);
  if (noteMatch) {
    special_notes = noteMatch[0];
  }

  // Remove time phrases from items
  let itemText = clean;
  if (delivery_time_text) itemText = itemText.replace(delivery_time_text, " ");
  if (special_notes) itemText = itemText.replace(special_notes, " ");

  // 3. Segment speech transcript by natural spoken connectors
  const rawSegments = itemText
    .split(/[,;\n]|\baur\b|\band\b|\bke sath\b|\bplus\b|\bsath mein\b/i)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !/^(bhaiya|bhai|ji|please|kripya|chahiye|de do|dena|rakhna)$/i.test(s)
    );

  const items: CorrelatedItem[] = [];
  const knownBrands = [
    "amul",
    "fortune",
    "tata",
    "india gate",
    "gemini",
    "madhur",
    "everest",
    "maggi",
    "saffola",
    "aashirvaad",
    "parle",
    "britannia",
    "dettol",
    "surf excel",
    "rin",
    "vim",
  ];

  for (const seg of rawSegments) {
    const condensedSeg = seg.replace(/\s+/g, "").toLowerCase();
    if (
      /^(bhaiya|bhai|ji|chahiye|bhejdena|bhejna|bhejdo|jaldi|kripya|orderhai|yehsaman|bhej|dena|kardo|krdo|rakhna|bhi)+$/i.test(
        condensedSeg
      )
    ) {
      continue;
    }

    const parsedQty = parseHinglishQuantity(seg);
    const isVague = isVagueQuantity(seg);

    // Identify brand hint
    let brandHint: string | null = null;
    for (const b of knownBrands) {
      if (new RegExp(`\\b${b}\\b`, "i").test(seg)) {
        brandHint = b.charAt(0).toUpperCase() + b.slice(1);
        break;
      }
    }

    // Clean spoken item name
    let spokenTerm = seg
      .replace(new RegExp(`\\b(${knownBrands.join("|")})\\b`, "gi"), "")
      .replace(
        /\b(kilo|kg|kilogram|gram|gm|litre|ltr|l|packet|pkt|darjan|dozen|pcs|nag|aadha|adha|half|dedh|dhai|sava|paune|ek|do|teen|char|paanch|chhe|saat|aath|nau|das)\b/gi,
        ""
      )
      .replace(
        /\b(thoda zyada|thoda sa|thoda|kuch|bhi chahiye|chahiye|bhej dena|bhejna|bhej do|bhaiya|ji|dena|de do|jaldi|kardo)\b/gi,
        ""
      )
      .replace(/[0-9.]+/g, "")
      .replace(/[^\w\s\u0900-\u097F]/g, "")
      .trim();

    if (!spokenTerm || /^(bhaiya|bhai|ji|chahiye|bhej dena|bhejna|bhej do|dena|de do|jaldi|kripya|bhi)$/i.test(spokenTerm)) {
      continue;
    }

    // Correlate with English word dynamically
    const lowerSpoken = spokenTerm.toLowerCase();
    let correlatedEnglish = spokenTerm;
    let detectedCategory = "General Grocery";

    // Direct lookup in our semantic knowledge base
    for (const [hindiTerm, info] of Object.entries(HINDI_ENGLISH_CORRELATIONS)) {
      if (
        lowerSpoken === hindiTerm ||
        new RegExp(`\\b${hindiTerm}\\b`, "i").test(lowerSpoken)
      ) {
        correlatedEnglish = info.english;
        detectedCategory = info.category;
        break;
      }
    }

    // If still matching raw English name (like "butter", "milk", "tea", "bread")
    if (correlatedEnglish === spokenTerm) {
      const titleCase = spokenTerm
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      correlatedEnglish = titleCase;
    }

    items.push({
      raw_text: seg,
      spoken_term: spokenTerm,
      english_correlation: correlatedEnglish,
      quantity: isVague ? null : parsedQty.value,
      unit: parsedQty.unit,
      brand_hint: brandHint,
      pack_size_hint: null,
      category: detectedCategory,
      confidence: 0.95,
      is_vague: isVague,
    });
  }

  // Detect predominant language
  const hasDevanagari = /[\u0900-\u097F]/.test(clean);
  const hindiWordIndicators = /\b(bhaiya|aur|bhi|chahiye|bhej|kilo|adha|dedh|dhai|cheeni|atta|tel|doodh|makhan|namak)\b/i.test(
    clean
  );

  let lang: "hinglish" | "hindi" | "english" | "mixed" = "english";
  if (hasDevanagari) {
    lang = "hindi";
  } else if (hindiWordIndicators) {
    lang = "hinglish";
  }

  return {
    raw_transcript: transcript,
    detected_language: lang,
    items,
    delivery_time_text,
    special_notes,
    summary: `${items.length} items parsed from voice audio.`,
  };
}

/**
 * Universal LLM Voice Parser:
 * Calls Gemini / OpenAI / Ollama to perform deep semantic reasoning and
 * map customer Hinglish/Hindi speech to English commodities without requiring aliases.
 */
export async function parseVoiceTranscriptWithLLM(
  transcript: string
): Promise<ParsedVoiceOrder> {
  const geminiKey = process.env.LLM_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_URL;

  // System prompt explicitly instructing the LLM to discover English correlation without aliases
  const systemPrompt = `You are an expert AI order intake agent for small Indian grocery shopkeepers.
The customer has spoken their grocery list in informal Hinglish (mixed Hindi + English), Hindi, or English.

CRITICAL REQUIREMENT:
The shopkeeper's catalog does NOT have pre-configured aliases for every Hindi word.
Your job is to discover the semantic correlation between what the customer said (e.g. Hindi/Hinglish terms)
and the standard English grocery product name.

Examples of English word correlations:
- "cheeni" / "shakkar" -> english_correlation: "Sugar"
- "atta" / "gehun" -> english_correlation: "Wheat Flour / Atta"
- "chawal" / "chaawal" -> english_correlation: "Rice"
- "doodh" / "dudh" -> english_correlation: "Milk"
- "makhan" / "makkhan" -> english_correlation: "Butter"
- "sarson tel" / "sarso" -> english_correlation: "Mustard Oil"
- "tel" -> english_correlation: "Cooking Oil"
- "namak" -> english_correlation: "Salt"
- "chai" / "patti" -> english_correlation: "Tea"
- "haldi" -> english_correlation: "Turmeric"
- "mirch" -> english_correlation: "Chilli Powder"
- "dhaniya" -> english_correlation: "Coriander"
- "toor dal" / "arhar" -> english_correlation: "Toor Dal"
- "anda" / "ande" -> english_correlation: "Eggs"

NUMBER & FRACTION RULES:
- ek = 1, do = 2, teen = 3, char = 4, paanch = 5, chhe = 6, saat = 7, aath = 8, nau = 9, das = 10
- aadha / adha / half = 0.5
- dedh = 1.5
- dhai = 2.5
- sava = 1.25
- paune = 0.75
- dozen / darjan = 12 pcs

OUTPUT FORMAT:
Respond ONLY with valid JSON conforming to this schema:
{
  "raw_transcript": string,
  "detected_language": "hinglish" | "hindi" | "english" | "mixed",
  "items": [
    {
      "raw_text": "verbatim speech snippet",
      "spoken_term": "item name as spoken in Hindi/English",
      "english_correlation": "correlated standard English grocery commodity name",
      "quantity": number or null,
      "unit": "kg" | "g" | "l" | "ml" | "pack" | "pcs" | "dozen" | null,
      "brand_hint": string or null,
      "pack_size_hint": string or null,
      "category": string or null,
      "confidence": number,
      "is_vague": boolean
    }
  ],
  "delivery_time_text": string or null,
  "special_notes": string or null,
  "summary": string
}`;

  // 1. Try Google Gemini if configured
  if (geminiKey && geminiKey !== "your_gemini_api_key_here" && !geminiKey.startsWith("dummy")) {
    try {
      const model = process.env.LLM_MODEL || "gemini-2.5-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nParse this customer voice transcript:\n<<<VOICE_TRANSCRIPT>>>\n${transcript}\n<<<VOICE_TRANSCRIPT>>>`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return ParsedVoiceOrderSchema.parse(parsed);
        }
      }
    } catch (e) {
      console.warn("Gemini voice parse failed, attempting fallback:", e);
    }
  }

  // 2. Try OpenAI if configured
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Voice transcript: ${transcript}` },
          ],
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return ParsedVoiceOrderSchema.parse(parsed);
        }
      }
    } catch (e) {
      console.warn("OpenAI voice parse failed:", e);
    }
  }

  // 3. Try Local Ollama if configured
  if (ollamaUrl) {
    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3",
          prompt: `${systemPrompt}\n\nVoice transcript: ${transcript}\nOutput JSON:`,
          format: "json",
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          const parsed = JSON.parse(data.response);
          return ParsedVoiceOrderSchema.parse(parsed);
        }
      }
    } catch (e) {
      console.warn("Ollama voice parse failed:", e);
    }
  }

  // 4. Guaranteed offline AI correlation engine fallback
  return correlateVoiceTranscriptRules(transcript);
}

/**
 * Enhanced Catalog Matcher:
 * Uses both the spoken term AND the AI's English correlation to match items in the shopkeeper's catalog.
 * Result: Even if the shopkeeper has ZERO aliases, "cheeni" matches "Madhur Sugar" automatically!
 */
export function matchVoiceItemsAgainstCatalog(
  items: CorrelatedItem[],
  catalog: CatalogProductWithAliases[]
): Array<{
  item: CorrelatedItem;
  matchResult: MatchResult;
  correlationExplanation: string;
}> {
  return items.map((item) => {
    // 1. Try matching with the English correlation first (e.g. "Sugar" for "cheeni")
    let matchResult = matchItemAgainstCatalog(item.english_correlation, catalog, {
      requestedQty: item.quantity,
      requestedUnit: item.unit,
      brandHint: item.brand_hint,
      packSizeHint: item.pack_size_hint,
      isVague: item.is_vague,
    });

    let explanation = `AI correlated "${item.spoken_term}" ➔ "${item.english_correlation}"`;

    // 2. If not matched, try matching with the original raw text
    if (matchResult.status === "NOT_FOUND") {
      const rawMatch = matchItemAgainstCatalog(item.raw_text, catalog, {
        requestedQty: item.quantity,
        requestedUnit: item.unit,
        brandHint: item.brand_hint,
        packSizeHint: item.pack_size_hint,
        isVague: item.is_vague,
      });

      if (rawMatch.status !== "NOT_FOUND") {
        matchResult = rawMatch;
        explanation = `Matched directly from spoken phrase "${item.raw_text}"`;
      }
    }

    if (matchResult.status === "MATCHED" && matchResult.selectedProduct) {
      explanation += ` ➔ Matched "${matchResult.selectedProduct.name}" (without requiring shopkeeper aliases!)`;
    }

    return {
      item,
      matchResult,
      correlationExplanation: explanation,
    };
  });
}
