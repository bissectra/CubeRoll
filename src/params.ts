export const DEFAULT_SEED_VALUE = "default";

export const sanitizeSeedValue = (value: string) => {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.length === 0 ? DEFAULT_SEED_VALUE : cleaned;
};
