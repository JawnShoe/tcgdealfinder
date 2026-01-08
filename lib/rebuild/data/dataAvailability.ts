export function isRebuildDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
