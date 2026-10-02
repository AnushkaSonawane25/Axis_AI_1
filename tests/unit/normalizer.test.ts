import { describe, it, expect } from "vitest";
import {
  parseHinglishQuantity,
  isVagueQuantity,
  normalizeHinglishText,
} from "../../lib/normalizer";

describe("Hinglish Normalizer Unit Tests", () => {
  it("normalizes Roman Hindi numerals and fractions correctly", () => {
    expect(parseHinglishQuantity("ek kilo").value).toBe(1);
    expect(parseHinglishQuantity("do packet").value).toBe(2);
    expect(parseHinglishQuantity("teen litre").value).toBe(3);
    expect(parseHinglishQuantity("aadha kilo").value).toBe(0.5);
    expect(parseHinglishQuantity("adha kilo").value).toBe(0.5);
    expect(parseHinglishQuantity("half kilo").value).toBe(0.5);
    expect(parseHinglishQuantity("dedh litre").value).toBe(1.5);
    expect(parseHinglishQuantity("dhai kilo").value).toBe(2.5);
    expect(parseHinglishQuantity("sava kilo").value).toBe(1.25);
    expect(parseHinglishQuantity("paune kilo").value).toBe(0.75);
    expect(parseHinglishQuantity("paune do").value).toBe(1.75);
  });

  it("normalizes Devanagari numerals, digits, and words", () => {
    expect(parseHinglishQuantity("१ किलो").value).toBe(1);
    expect(parseHinglishQuantity("२ पैकेट").value).toBe(2);
    expect(parseHinglishQuantity("५ लीटर").value).toBe(5);
    expect(parseHinglishQuantity("आधा किलो").value).toBe(0.5);
    expect(parseHinglishQuantity("डेढ़ किलो").value).toBe(1.5);
    expect(parseHinglishQuantity("ढाई लीटर").value).toBe(2.5);
    expect(parseHinglishQuantity("सवा किलो").value).toBe(1.25);
  });

  it("normalizes units across English and Hindi variants", () => {
    expect(parseHinglishQuantity("2 kg").unit).toBe("kg");
    expect(parseHinglishQuantity("2 kilo").unit).toBe("kg");
    expect(parseHinglishQuantity("2 किलोग्राम").unit).toBe("kg");
    expect(parseHinglishQuantity("500 gram").unit).toBe("g");
    expect(parseHinglishQuantity("500 gm").unit).toBe("g");
    expect(parseHinglishQuantity("500 grms").unit).toBe("g");
    expect(parseHinglishQuantity("1 litre").unit).toBe("l");
    expect(parseHinglishQuantity("1 ltr").unit).toBe("l");
    expect(parseHinglishQuantity("1 लीटर").unit).toBe("l");
    expect(parseHinglishQuantity("2 packet").unit).toBe("pack");
    expect(parseHinglishQuantity("1 darjan").value).toBe(12);
  });

  it("detects vague quantities accurately", () => {
    expect(isVagueQuantity("thoda zyada cheeni")).toBe(true);
    expect(isVagueQuantity("kuch namak")).toBe(true);
    expect(isVagueQuantity("thoda sa tel")).toBe(true);
    expect(isVagueQuantity("2 kilo atta")).toBe(false);

    const vagueResult = parseHinglishQuantity("thoda zyada cheeni");
    expect(vagueResult.isVague).toBe(true);
    expect(vagueResult.value).toBeNull();
  });

  it("phonetically collapses common spelling variations and typos", () => {
    expect(normalizeHinglishText("aata")).toBe("atta");
    expect(normalizeHinglishText("cheeni")).toBe("sugar");
    expect(normalizeHinglishText("chini")).toBe("sugar");
    expect(normalizeHinglishText("shakkar")).toBe("sugar");
    expect(normalizeHinglishText("mustrad tel")).toBe("mustard tel");
    expect(normalizeHinglishText("sarso")).toBe("mustard");
    expect(normalizeHinglishText("amul butter")).toBe("amul butter");
    expect(normalizeHinglishText("doodh")).toBe("milk");
    expect(normalizeHinglishText("dudh")).toBe("milk");
    expect(normalizeHinglishText("chawal")).toBe("rice");
  });
});
