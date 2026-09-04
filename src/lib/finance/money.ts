export function formatMoney(
  cents: number,
  options: { sign?: boolean; compact?: boolean } = {},
) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.compact ? 0 : 2,
    maximumFractionDigits: options.compact ? 0 : 2,
    signDisplay: options.sign ? "always" : "auto",
  });
  return formatter.format(cents / 100);
}

export function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isParenthesized = trimmed.startsWith("(") && trimmed.endsWith(")");
  const cleaned = trimmed.replace(/[$,()\s]/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) * (isParenthesized ? -1 : 1);
}
