const pad = (value: number) => value.toString().padStart(2, "0");

export const getTodaySeedValue = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
};

export const sanitizeSeedValue = (value: string, fallback = getTodaySeedValue()) => {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.length === 0 ? fallback : cleaned;
};
