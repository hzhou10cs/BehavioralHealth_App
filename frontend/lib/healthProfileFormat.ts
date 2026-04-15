export const GENDER_OPTIONS = ["male", "female", "non-binary"] as const;

export function parseHeightParts(heightText: string) {
  const trimmed = heightText.trim();
  if (!trimmed) {
    return { feet: "", inches: "" };
  }

  const feetInchesPattern = /(\d+)\s*(?:ft|')\s*(\d+)?\s*(?:in|")?/i;
  const feetInchesMatch = trimmed.match(feetInchesPattern);
  if (feetInchesMatch) {
    return {
      feet: feetInchesMatch[1] ?? "",
      inches: feetInchesMatch[2] ?? "",
    };
  }

  const numbers = trimmed.match(/\d+/g) ?? [];
  return {
    feet: numbers[0] ?? "",
    inches: numbers[1] ?? "",
  };
}

export function formatHeightParts(feet: string, inches: string) {
  const cleanFeet = feet.trim();
  const cleanInches = inches.trim();
  if (!cleanFeet && !cleanInches) {
    return "";
  }
  return `${cleanFeet}' ${cleanInches}"`.trim();
}

export function normalizeWeightLbs(value: string) {
  return value
    .trim()
    .replace(/\s*(lbs?|pounds?)$/i, "")
    .trim();
}

