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

  // Fresh Fruits & Produce
  kela: { english: "Bananas", category: "Fresh Produce" },
  kele: { english: "Bananas", category: "Fresh Produce" },
  banana: { english: "Bananas", category: "Fresh Produce" },
  bananas: { english: "Bananas", category: "Fresh Produce" },
  seb: { english: "Apples", category: "Fresh Produce" },
  anar: { english: "Pomegranate", category: "Fresh Produce" },

  // Vegetables & Daily Essentials
  pyaaz: { english: "Onion", category: "Vegetables" },
  pyaz: { english: "Onion", category: "Vegetables" },
  kanda: { english: "Onion", category: "Vegetables" },
  aalu: { english: "Potato", category: "Vegetables" },
  aloo: { english: "Potato", category: "Vegetables" },
  alu: { english: "Potato", category: "Vegetables" },
  tamatar: { english: "Tomato", category: "Vegetables" },
  tomato: { english: "Tomato", category: "Vegetables" },
  adrak: { english: "Ginger", category: "Vegetables" },
  adrakh: { english: "Ginger", category: "Vegetables" },
  lahsun: { english: "Garlic", category: "Vegetables" },
  lasun: { english: "Garlic", category: "Vegetables" },
  nimbu: { english: "Lemon", category: "Vegetables" },
  lemon: { english: "Lemon", category: "Vegetables" },

  // Snacks, Bakery & Household
  bhujia: { english: "Bhujia Sev", category: "Bakery & Snacks" },
  sev: { english: "Bhujia Sev", category: "Bakery & Snacks" },
  namkeen: { english: "Namkeen", category: "Bakery & Snacks" },
  sabun: { english: "Bathing Soap", category: "Household & Personal Care" },
  surf: { english: "Detergent Powder", category: "Household & Cleaning" },
  vim: { english: "Dishwash Bar", category: "Household & Cleaning" },
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
    "haldiram",
    "haldirams",
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

    // Clean spoken item name thoroughly without leaving orphan unit letters like "g" or "kg" or prepositions
    let spokenTerm = seg
      .replace(new RegExp(`\\b(${knownBrands.join("|")})\\b`, "gi"), " ")
      .replace(/\b(loaf of|loaves of|packets? of|pkts? of|bottles? of|cans? of|tins? of|bags? of)\b/gi, " ")
      .replace(/\b(sava teen|paune teen|sava do|paune do|paune ek|sava ek|dedh kilo|dhai kilo|ek darjan|do darjan)\b/gi, " ")
      .replace(/\b(aadha|adha|half|dedh|deydh|dhai|dhaai|sava|savaa|paune|pauna)\s*(kilo|kg|l|litre|liter|packet|pkt)?\b/gi, " ")
      .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi, " ")
      .replace(/\b(ek|do|teen|char|chaar|paanch|panch|chhe|chhah|saat|aath|nau|das|gyarah|barah|darjan|dozen)\b/gi, " ")
      .replace(/\b\d+(\.\d+)?\s*(kilo|kg|kilograms?|grams?|gm?|g|litres?|liters?|ltr|lt|l|packets?|pkts?|pack|darjan|dozens?|pcs|nag|piece|pieces|loaf|loaves)?\b/gi, " ")
      .replace(/\b(kilo|kg|kilograms?|grams?|gm|g|litres?|liters?|ltr|lt|l|packets?|pkts?|pack|darjan|dozens?|pcs|nag|piece|pieces|loaf|loaves)\b/gi, " ")
      .replace(/\b(thoda zyada|thoda sa|thoda|kuch|bhi chahiye|chahiye|bhej dena|bhejna|bhej do|bhaiya|ji|dena|de do|jaldi|kardo|krdo|rakhna|bhi|aur|and|le aana|bhej|of)\b/gi, " ")
      .replace(/[0-9.]+/g, " ")
      .replace(/[^\w\s\u0900-\u097F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!spokenTerm || /^(bhaiya|bhai|ji|chahiye|bhej dena|bhejna|bhej do|dena|de do|jaldi|kripya|bhi)$/i.test(spokenTerm)) {
      continue;
    }

    // Correlate with English word dynamically
    const lowerSpoken = spokenTerm.toLowerCase();
    let correlatedEnglish = spokenTerm;
    let detectedCategory = "General Grocery";

    // Direct lookup in our semantic knowledge base (prioritizing longer specific terms first)
    const sortedEntries = Object.entries(HINDI_ENGLISH_CORRELATIONS).sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [hindiTerm, info] of sortedEntries) {
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
 * Realistic default grocery catalog matching Prasad Kirana's inventory.
 * Used for zero-latency offline demo, fallback when DB is disconnected, and instant testing.
 */
export const DEFAULT_GROCERY_CATALOG: CatalogProductWithAliases[] = [
  {
    id: "prod-atta-5kg",
    shopId: "shop-prasad",
    name: "Aashirvaad Shudh Chakki Atta",
    brand: "Aashirvaad",
    category: "Flours & Grains",
    packSize: "5 kg",
    unit: "kg",
    pricePaise: 23000,
    stockQty: "25.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["aashirvaad aata", "chakki atta", "wheat flour", "aata", "atta", "gehun ka atta"],
  },
  {
    id: "prod-oil-sunflower-1l",
    shopId: "shop-prasad",
    name: "Fortune Sunlite Refined Sunflower Oil",
    brand: "Fortune",
    category: "Edible Oils",
    packSize: "1 L",
    unit: "l",
    pricePaise: 14500,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["fortune sunflower oil", "sunflower oil", "sunflower tel", "refined tel", "sunflower 1L", "tel"],
  },
  {
    id: "prod-oil-mustard-1l",
    shopId: "shop-prasad",
    name: "Fortune Kachi Ghani Pure Mustard Oil",
    brand: "Fortune",
    category: "Edible Oils",
    packSize: "1 L",
    unit: "l",
    pricePaise: 16500,
    stockQty: "25.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["mustard oil", "sarson tel", "sarso tel", "mustrad tel", "tel"],
  },
  {
    id: "prod-sugar-1kg",
    shopId: "shop-prasad",
    name: "Madhur Pure & Hygienic Sugar",
    brand: "Madhur",
    category: "Sugar & Sweeteners",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 4800,
    stockQty: "40.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["madhur sugar", "sugar", "cheeni", "shakkar", "sugar 1kg"],
  },
  {
    id: "prod-butter-100g",
    shopId: "shop-prasad",
    name: "Amul Butter Pasteurised",
    brand: "Amul",
    category: "Dairy",
    packSize: "100 g",
    unit: "g",
    pricePaise: 5800,
    stockQty: "20.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["amul butter", "butter", "amul makhan", "butter 100g", "makhan"],
  },
  {
    id: "prod-milk-1l",
    shopId: "shop-prasad",
    name: "Amul Taaza Fresh Toned Milk",
    brand: "Amul",
    category: "Dairy",
    packSize: "1 L",
    unit: "l",
    pricePaise: 6800,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["amul taaza", "amul milk", "toned milk", "doodh", "dudh", "milk"],
  },
  {
    id: "prod-rice-5kg",
    shopId: "shop-prasad",
    name: "India Gate Basmati Rice",
    brand: "India Gate",
    category: "Rice & Grains",
    packSize: "5 kg",
    unit: "kg",
    pricePaise: 56000,
    stockQty: "15.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["india gate basmati", "basmati rice", "chawal", "rice"],
  },
  {
    id: "prod-toor-1kg",
    shopId: "shop-prasad",
    name: "Tata Sampann Unpolished Toor Dal",
    brand: "Tata Sampann",
    category: "Dals & Pulses",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 17500,
    stockQty: "20.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["tata toor dal", "toor dal", "arhar dal", "tuvar dal", "dal"],
  },
  {
    id: "prod-salt-1kg",
    shopId: "shop-prasad",
    name: "Tata Salt Vacuum Evaporated Iodized",
    brand: "Tata",
    category: "Salt & Spices",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 2800,
    stockQty: "50.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["tata salt", "tata namak", "iodized salt", "namak", "salt"],
  },
  {
    id: "prod-tea-250g",
    shopId: "shop-prasad",
    name: "Tata Tea Gold",
    brand: "Tata",
    category: "Beverages",
    packSize: "250 g",
    unit: "g",
    pricePaise: 14000,
    stockQty: "25.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["tata tea", "tata tea gold", "tea gold", "chai patti", "chai"],
  },
  {
    id: "prod-maggi-4pack",
    shopId: "shop-prasad",
    name: "Maggi 2-Minute Masala Instant Noodles",
    brand: "Maggi",
    category: "Instant Food",
    packSize: "280 g (4 pack)",
    unit: "pack",
    pricePaise: 5600,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["maggi", "maggi noodles", "maggie", "instant noodles"],
  },
  {
    id: "prod-bread-400g",
    shopId: "shop-prasad",
    name: "Britannia 100% Whole Wheat Bread",
    brand: "Britannia",
    category: "Bakery",
    packSize: "400 g",
    unit: "pack",
    pricePaise: 4500,
    stockQty: "15.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["britannia bread", "wheat bread", "bread", "double roti"],
  },
  {
    id: "prod-eggs-12",
    shopId: "shop-prasad",
    name: "Farm Fresh Table Eggs",
    brand: "Farm Fresh",
    category: "Eggs",
    packSize: "12 pcs (1 Dozen)",
    unit: "dozen",
    pricePaise: 9600,
    stockQty: "25.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["eggs", "ande", "anda", "farm eggs", "dozen eggs"],
  },
  {
    id: "prod-potatoes-1kg",
    shopId: "shop-prasad",
    name: "Fresh Potatoes (Aalu)",
    brand: "Fresh Produce",
    category: "Vegetables",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 3000,
    stockQty: "50.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["potatoes", "aalu", "aloo", "fresh potatoes"],
  },
  {
    id: "prod-onions-1kg",
    shopId: "shop-prasad",
    name: "Fresh Red Onions (Pyaaz)",
    brand: "Fresh Produce",
    category: "Vegetables",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 3500,
    stockQty: "40.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["onions", "pyaaz", "pyaz", "kanda", "red onions"],
  },
  {
    id: "prod-bananas-12",
    shopId: "shop-prasad",
    name: "Fresh Bananas (Kela)",
    brand: "Fresh Produce",
    category: "Fresh Produce",
    packSize: "12 pcs (1 Dozen)",
    unit: "dozen",
    pricePaise: 6000,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["bananas", "kela", "kele", "banana", "fresh bananas", "dozen kela"],
  },
  {
    id: "prod-tomatoes-1kg",
    shopId: "shop-prasad",
    name: "Fresh Red Tomatoes (Tamatar)",
    brand: "Fresh Produce",
    category: "Vegetables",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 4000,
    stockQty: "35.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["tomatoes", "tamatar", "tomato", "fresh tomatoes"],
  },
  {
    id: "prod-sev-200g",
    shopId: "shop-prasad",
    name: "Haldiram's Bhujia Sev",
    brand: "Haldiram's",
    category: "Bakery & Snacks",
    packSize: "200 g",
    unit: "pack",
    pricePaise: 5500,
    stockQty: "25.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["bhujia sev", "bhujia", "sev", "haldiram sev", "namkeen"],
  },
  {
    id: "prod-parleg-250g",
    shopId: "shop-prasad",
    name: "Parle-G Gold Glucose Biscuits",
    brand: "Parle",
    category: "Bakery & Snacks",
    packSize: "250 g",
    unit: "pack",
    pricePaise: 3000,
    stockQty: "40.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["parle g", "parle-g", "biscuits", "biscuit", "glucose biscuit"],
  },
  {
    id: "prod-surf-1kg",
    shopId: "shop-prasad",
    name: "Surf Excel Easy Wash Detergent Powder",
    brand: "Surf Excel",
    category: "Household & Cleaning",
    packSize: "1 kg",
    unit: "kg",
    pricePaise: 14000,
    stockQty: "20.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["surf excel", "surf", "detergent", "washing powder"],
  },
  {
    id: "prod-vim-bar",
    shopId: "shop-prasad",
    name: "Vim Lemon Dishwash Bar",
    brand: "Vim",
    category: "Household & Cleaning",
    packSize: "200 g",
    unit: "pack",
    pricePaise: 2000,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["vim bar", "vim", "dishwash bar", "bartan sabun"],
  },
  {
    id: "prod-dettol-soap",
    shopId: "shop-prasad",
    name: "Dettol Original Bathing Soap",
    brand: "Dettol",
    category: "Household & Personal Care",
    packSize: "125 g",
    unit: "pack",
    pricePaise: 4200,
    stockQty: "30.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["dettol", "dettol soap", "sabun", "bathing soap", "soap"],
  },
  {
    id: "prod-chillies-100g",
    shopId: "shop-prasad",
    name: "Fresh Green Chillies (Hari Mirch)",
    brand: "Fresh Produce",
    category: "Vegetables",
    packSize: "100 g",
    unit: "g",
    pricePaise: 1500,
    stockQty: "40.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aliases: ["hari mirch", "mirch", "mirchi", "green chillies"],
  },
];

/**
 * Accurately compute unit rate and line total for loose and packaged products.
 */
export function computeItemLineTotal(
  item: CorrelatedItem,
  selectedProduct: CatalogProductWithAliases
): {
  unitRatePaise: number;
  lineTotalPaise: number;
  rateDisplay: string;
} {
  const pricePaise = selectedProduct.pricePaise;
  const packSize = (selectedProduct.packSize || "").toLowerCase();
  const numMatch = packSize.match(/([0-9]+(?:\.[0-9]+)?)/);
  const packVal = numMatch ? parseFloat(numMatch[1]) : 1;
  const reqQty = item.quantity && item.quantity > 0 ? item.quantity : 1;

  // Weight / Volume scaling (e.g. 2 kg of a 5 kg pack, or 0.5 kg of 1 kg pack)
  if (
    (item.unit === "kg" || item.unit === "l") &&
    (packSize.includes("kg") || packSize.includes("l"))
  ) {
    const ratePerUnit = Math.round(pricePaise / packVal);
    const lineTotal = Math.round(reqQty * ratePerUnit);
    return {
      unitRatePaise: ratePerUnit,
      lineTotalPaise: lineTotal,
      rateDisplay: `₹${(ratePerUnit / 100).toFixed(0)} / ${item.unit}`,
    };
  }

  // Grams conversion (e.g. 500g of a 1kg product)
  if (item.unit === "g" && (packSize.includes("kg") || packSize.includes("g") || packVal >= 1)) {
    const ratePerKg = packSize.includes("kg")
      ? Math.round(pricePaise / packVal)
      : Math.round((pricePaise / packVal) * 1000);
    const lineTotal = Math.round((reqQty / 1000) * ratePerKg);
    return {
      unitRatePaise: ratePerKg,
      lineTotalPaise: lineTotal,
      rateDisplay: `₹${(ratePerKg / 100).toFixed(0)} / kg`,
    };
  }

  // Millilitres conversion (e.g. 500ml of a 1L product)
  if (item.unit === "ml" && (packSize.includes("l") || packVal >= 1)) {
    const ratePerLtr = Math.round(pricePaise / packVal);
    const lineTotal = Math.round((reqQty / 1000) * ratePerLtr);
    return {
      unitRatePaise: ratePerLtr,
      lineTotalPaise: lineTotal,
      rateDisplay: `₹${(ratePerLtr / 100).toFixed(0)} / L`,
    };
  }

  // Dozen conversion
  if (packSize.includes("dozen") || item.unit === "dozen") {
    if (item.unit === "pcs" || item.unit === "pc") {
      const ratePerPiece = Math.round(pricePaise / 12);
      const lineTotal = Math.round(reqQty * ratePerPiece);
      return {
        unitRatePaise: pricePaise,
        lineTotalPaise: lineTotal,
        rateDisplay: `₹${(pricePaise / 100).toFixed(0)} / dozen`,
      };
    }

    const ratePerDozen = pricePaise;
    const lineTotal = Math.round(reqQty * ratePerDozen);
    return {
      unitRatePaise: ratePerDozen,
      lineTotalPaise: lineTotal,
      rateDisplay: `₹${(ratePerDozen / 100).toFixed(0)} / dozen`,
    };
  }

  // Pack / Pcs / General
  const lineTotal = Math.round(reqQty * pricePaise);
  return {
    unitRatePaise: pricePaise,
    lineTotalPaise: lineTotal,
    rateDisplay: `₹${(pricePaise / 100).toFixed(0)} / pack`,
  };
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
  const activeCatalog = catalog && catalog.length > 0 ? catalog : DEFAULT_GROCERY_CATALOG;

  return items.map((item) => {
    // 1. Try matching with the English correlation first (e.g. "Sugar" for "cheeni")
    let matchResult = matchItemAgainstCatalog(item.english_correlation, activeCatalog, {
      requestedQty: item.quantity,
      requestedUnit: item.unit,
      brandHint: item.brand_hint,
      packSizeHint: item.pack_size_hint,
      isVague: item.is_vague,
    });

    let explanation = `AI correlated "${item.spoken_term}" ➔ "${item.english_correlation}"`;

    // 2. If not matched, try matching with the original raw text
    if (matchResult.status === "NOT_FOUND") {
      const rawMatch = matchItemAgainstCatalog(item.raw_text, activeCatalog, {
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

    // Guarantee selectedProduct is assigned if candidates exist
    if (!matchResult.selectedProduct && matchResult.candidates && matchResult.candidates.length > 0) {
      matchResult.selectedProduct = matchResult.candidates[0].product;
    }

    if (matchResult.status === "MATCHED" && matchResult.selectedProduct) {
      explanation += ` ➔ Matched "${matchResult.selectedProduct.name}" (without requiring shopkeeper aliases!)`;
    } else if (matchResult.status === "AMBIGUOUS" && matchResult.selectedProduct) {
      explanation += ` ➔ Selected "${matchResult.selectedProduct.name}" (default option; other varieties in stock)`;
    } else if (matchResult.status === "INSUFFICIENT_STOCK" && matchResult.selectedProduct) {
      explanation += ` ➔ Matched "${matchResult.selectedProduct.name}" (limited stock alert)`;
    }

    return {
      item,
      matchResult,
      correlationExplanation: explanation,
    };
  });
}
