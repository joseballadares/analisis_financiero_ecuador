export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const text = new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return value < 0 && Math.round(Math.abs(value)) > 0 ? `-${text}` : text;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value * 100, decimals)}%`;
}

export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, 0)} días`;
}

const PERCENT_KEYS = new Set([
  "impac_gasto_a_v",
  "impac_carga_finan",
  "rent_neta_activo",
  "margen_bruto",
  "margen_operacional",
  "rent_neta_ventas",
  "rent_ope_patrimonio",
  "rent_ope_activo",
  "roe",
  "roa",
  "margen_ebitda",
  "roic",
  "fcf_margen",
  "dp_margen_ebit",
]);

const DAYS_KEYS = new Set(["per_med_cobranza", "per_med_pago", "dio", "ccc"]);
const MONEY_KEYS = new Set(["fcf", "capital_trabajo", "ebitda", "deuda_neta"]);

export function formatRatioValue(
  key: string,
  value: number | null | undefined,
  percentDecimals = 1
): string {
  if (DAYS_KEYS.has(key)) return formatDays(value);
  if (MONEY_KEYS.has(key)) return formatCompactMoney(value);
  if (PERCENT_KEYS.has(key)) return formatPercent(value, percentDecimals);
  return formatNumber(value);
}

export function formatCompactMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(n);
  if (abs >= 1e9) return `${sign}$${fmt(abs / 1e9)} mil M`;
  if (abs >= 1e6) return `${sign}$${fmt(abs / 1e6)} M`;
  if (abs >= 1e3) return `${sign}$${fmt(abs / 1e3)} K`;
  return `${sign}$${fmt(abs)}`;
}

const SEGMENT_NAMES: Record<number, string> = {
  1: "Microempresa",
  2: "Pequeña",
  3: "Mediana",
  4: "Grande",
};

export function segmentName(code: number | null | undefined): string {
  return (code != null && SEGMENT_NAMES[code]) || "Sin clasificar";
}

export function titleCase(s: string | null | undefined): string {
  if (!s) return "—";
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (["de", "los", "del", "la", "las"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function sentenceCase(s: string | null | undefined): string {
  if (!s) return "";
  const t = s.trim().replace(/\.$/, "").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
