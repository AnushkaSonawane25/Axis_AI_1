/**
 * Hinglish (Roman & Devanagari) Number, Unit & Text Normalizer
 */

export interface ParsedQuantity {
  value: number | null;
  unit: string | null;
  isVague: boolean;
  rawMatchedText?: string;
}

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

// Sorted by word length descending so compound phrases match before single words
const HINGLISH_NUMBER_WORDS: Array<[string, number]> = [
  // Compound fractions
  ["sava teen", 3.25],
  ["paune teen", 2.75],
  ["sava do", 2.25],
  ["paune do", 1.75],
  ["paune ek", 0.75],
  ["sava ek", 1.25],
  ["dedh kilo", 1.5],
  ["dhai kilo", 2.5],

  // Words
  ["aadha", 0.5],
  ["adha", 0.5],
  ["half", 0.5],
  ["dedh", 1.5],
  ["deydh", 1.5],
  ["dhai", 2.5],
  ["dhaai", 2.5],
  ["sava", 1.25],
  ["savaa", 1.25],
  ["paune", 0.75],
  ["pauna", 0.75],
  ["darjan", 12],
  ["dozen", 12],
  ["twelve", 12],
  ["eleven", 11],
  ["barah", 12],
  ["gyarah", 11],
  ["das", 10],
  ["ten", 10],
  ["nau", 9],
  ["nine", 9],
  ["aath", 8],
  ["eight", 8],
  ["saat", 7],
  ["seven", 7],
  ["chhah", 6],
  ["chhe", 6],
  ["che", 6],
  ["six", 6],
  ["paanch", 5],
  ["panch", 5],
  ["five", 5],
  ["chaar", 4],
  ["char", 4],
  ["four", 4],
  ["teen", 3],
  ["three", 3],
  ["do", 2],
  ["two", 2],
  ["ek", 1],
  ["one", 1],

  // Devanagari Words
  ["दर्जन", 12],
  ["बारह", 12],
  ["ग्यारह", 11],
  ["दस", 10],
  ["नौ", 9],
  ["आठ", 8],
  ["सात", 7],
  ["छह", 6],
  ["पाँच", 5],
  ["पांच", 5],
  ["चार", 4],
  ["तीन", 3],
  ["दो", 2],
  ["एक", 1],
  ["आधा", 0.5],
  ["डेढ़", 1.5],
  ["ढाई", 2.5],
  ["सवा", 1.25],
  ["पौने", 0.75],
];

const UNIT_MAP: Record<string, string> = {
  // Kilograms
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  किलो: "kg",
  किलोग्राम: "kg",
  केजी: "kg",

  // Grams
  g: "g",
  gm: "g",
  gms: "g",
  grms: "g",
  gram: "g",
  grams: "g",
  ग्राम: "g",
  ग्राम्स: "g",

  // Litres
  l: "l",
  lt: "l",
  ltr: "l",
  litre: "l",
  litres: "l",
  liter: "l",
  liters: "l",
  लीटर: "l",
  ली: "l",

  // Millilitres
  ml: "ml",
  मिली: "ml",

  // Packets
  pack: "pack",
  packet: "pack",
  packets: "pack",
  pkt: "pack",
  pkts: "pack",
  पैकेट: "pack",
  पैक: "pack",

  // Pieces
  pc: "pcs",
  pcs: "pcs",
  piece: "pcs",
  pieces: "pcs",
  nag: "pcs",
  नग: "pcs",
  पीस: "pcs",

  // Dozen
  dozen: "dozen",
  darjan: "dozen",
  दर्जन: "dozen",
};

const VAGUE_PHRASES = [
  "thoda zyada",
  "thoda sa",
  "thoda",
  "thodi",
  "thora",
  "kuch",
  "ek do",
  "kam zyada",
  "jitna ho sake",
  "thoda bahut",
  "thode",
  "थोड़ा ज्यादा",
  "थोड़ा",
  "थोड़ी",
  "कुछ",
];

export function isVagueQuantity(text: string): boolean {
  const lower = text.toLowerCase();
  return VAGUE_PHRASES.some((phrase) => lower.includes(phrase));
}

export function convertDevanagariDigitsToAscii(text: string): string {
  return text.replace(/[०-९]/g, (char) => DEVANAGARI_DIGITS[char] || char);
}

export function parseHinglishQuantity(text: string): ParsedQuantity {
  let lower = text.toLowerCase().trim();

  if (isVagueQuantity(lower)) {
    return {
      value: null,
      unit: null,
      isVague: true,
      rawMatchedText: text,
    };
  }

  // Convert Devanagari digits to ASCII (e.g. '२ पैकेट' -> '2 पैकेट')
  lower = convertDevanagariDigitsToAscii(lower);

  // 1. Look for numeric digits (e.g. "1.5 kg", "2.5", "500 g", "2 पैकेट")
  const numericMatch = lower.match(
    /([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\u0900-\u097F]+)?/
  );
  if (numericMatch) {
    const num = parseFloat(numericMatch[1]);
    const rawUnit = numericMatch[2] ? numericMatch[2].toLowerCase().trim() : null;
    const normalizedUnit = rawUnit && UNIT_MAP[rawUnit] ? UNIT_MAP[rawUnit] : rawUnit;

    if (normalizedUnit === "dozen") {
      return {
        value: num * 12,
        unit: "pcs",
        isVague: false,
        rawMatchedText: numericMatch[0],
      };
    }

    return {
      value: num,
      unit: normalizedUnit,
      isVague: false,
      rawMatchedText: numericMatch[0],
    };
  }

  // 2. Look for word numerals (supports both Latin and Devanagari without ASCII \b)
  for (const [word, val] of HINGLISH_NUMBER_WORDS) {
    const isDevanagari = /[\u0900-\u097F]/.test(word);
    let matched = false;

    if (isDevanagari) {
      matched = lower.includes(word);
    } else {
      matched = new RegExp(`\\b${word}\\b`, "i").test(lower);
    }

    if (matched) {
      let foundUnit: string | null = null;
      for (const [rawUnit, normUnit] of Object.entries(UNIT_MAP)) {
        if (/[\u0900-\u097F]/.test(rawUnit)) {
          if (lower.includes(rawUnit)) {
            foundUnit = normUnit;
            break;
          }
        } else {
          if (new RegExp(`\\b${rawUnit}\\b`, "i").test(lower)) {
            foundUnit = normUnit;
            break;
          }
        }
      }

      if (word === "darjan" || word === "dozen" || word === "दर्जन") {
        return {
          value: 12,
          unit: "pcs",
          isVague: false,
          rawMatchedText: word,
        };
      }

      return {
        value: val,
        unit: foundUnit,
        isVague: false,
        rawMatchedText: word,
      };
    }
  }

  // 3. Fallback: single unit without explicit number
  for (const [rawUnit, normUnit] of Object.entries(UNIT_MAP)) {
    if (new RegExp(`\\b${rawUnit}\\b`, "i").test(lower)) {
      return {
        value: 1,
        unit: normUnit,
        isVague: false,
      };
    }
  }

  return {
    value: 1,
    unit: null,
    isVague: false,
  };
}

export function normalizeHinglishText(text: string): string {
  if (!text) return "";
  let clean = text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  clean = clean
    .replace(/\bshakkar\b/g, "sugar")
    .replace(/\bcheeni\b|\bchini\b/g, "sugar")
    .replace(/\baata\b|\batta\b|\bgehun\b|\bata\b/g, "atta")
    .replace(/\bchawal\b/g, "rice")
    .replace(/\bnamak\b/g, "salt")
    .replace(/\bdudh\b|\bdoodh\b/g, "milk")
    .replace(/\bmakhan\b/g, "butter")
    .replace(/\bchai\b|\bchaye\b|\bpatti\b/g, "tea")
    .replace(/\bsarso\b|\bsarson\b|\bmustrad\b/g, "mustard")
    .replace(/\bmoongfali\b|\bmungfali\b/g, "groundnut")
    .replace(/\barhar\b|\btuvar\b/g, "toor")
    .replace(/\bmaggie\b/g, "maggi");

  clean = clean
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u");

  return clean;
}

export function removeFillerWords(text: string): string {
  const fillers = [
    "bhaiya", "bhai", "bhaia", "ji", "chahiye", "chahie", "bhej", "bhejna", "dena",
    "de", "do", "dijiye", "aur", "bhi", "hai", "hain", "krdo", "kar dena", "jaldi",
    "please", "kripya", "plz", "kal", "aaj", "subah", "sham", "tak",
  ];

  let cleaned = text;
  for (const filler of fillers) {
    cleaned = cleaned.replace(new RegExp(`\\b${filler}\\b`, "gi"), " ");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}
