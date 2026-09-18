export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
]);

const DAYS_KEYS = new Set(["per_med_cobranza", "per_med_pago"]);

export function formatRatioValue(key: string, value: number | null | undefined): string {
  if (DAYS_KEYS.has(key)) return formatDays(value);
  if (PERCENT_KEYS.has(key)) return formatPercent(value);
  return formatNumber(value);
}
