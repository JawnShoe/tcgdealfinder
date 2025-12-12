export type LanguageCode = "EN" | "JP" | "UNKNOWN";

export type LanguageDetection = {
  lang: LanguageCode;
  confidence: "HIGH" | "MED" | "LOW";
  signals: string[];
};

const JAPANESE_SCRIPT_REGEX = /[\u3040-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/g;
const JAPANESE_TOKENS = /\b(japanese|jpn|jp)\b/i;

export function detectCardLanguage(title: string | null | undefined): LanguageDetection {
  if (!title) {
    return { lang: "UNKNOWN", confidence: "LOW", signals: [] };
  }
  const signals: string[] = [];
  const scriptMatches = title.match(JAPANESE_SCRIPT_REGEX);
  if (scriptMatches && scriptMatches.length >= 2) {
    signals.push("jp-script");
    return { lang: "JP", confidence: "HIGH", signals };
  }
  if (JAPANESE_TOKENS.test(title)) {
    signals.push("jp-token");
    return { lang: "JP", confidence: "MED", signals };
  }
  return { lang: "UNKNOWN", confidence: "LOW", signals };
}
