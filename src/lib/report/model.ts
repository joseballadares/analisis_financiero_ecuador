import type { CompanyBundle } from "@/lib/companyData";
import { CURRENT_VERSION } from "@/lib/versions";
import { isNum } from "@/lib/chartMath";

// El informe muestra el historial desde 2019 (primer año con estados línea por línea).
export const REPORT_START_YEAR = 2019;

export type Ctx = {
  b: CompanyBundle;
  name: string;
  pretty: string;
  year: number;
  years: number[];
  cats: string[];
  issued: string;
  version: string;
  met: (key: string) => (number | null)[];
  val: (key: string) => (number | null)[];
  num: (v: unknown) => number | null;
};

const SUFFIX = /^(s\.?a\.?s?\.?|c\.?a\.?|cia\.?|ltda\.?|s\.?a\.?i\.?a\.?|c\.?\s?ltda\.?)$/i;

// Nombre legible en oraciones: "HIVIMAR S.A." -> "Hivimar S.A." (conserva las formas societarias en mayúsculas).
export function prettyName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) =>
      SUFFIX.test(w) ? w.toUpperCase() : ["de", "del", "la", "las", "los", "y", "e"].includes(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");
}

export function buildCtx(b: CompanyBundle, now = new Date()): Ctx {
  const year = b.current.anio;
  const rows = [...b.filled]
    .filter((f) => f.anio >= REPORT_START_YEAR && f.anio <= year && ((f.metrics.ingresos_ventas ?? 0) > 0 || (f.metrics.activos ?? 0) > 0))
    .sort((a, c) => a.anio - c.anio);
  const years = rows.map((r) => r.anio);
  const issued = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Guayaquil" }).format(now);
  const num = (v: unknown) => (isNum(v as number) ? (v as number) : null);
  return {
    b,
    name: b.company.nombre,
    pretty: prettyName(b.company.nombre),
    year,
    years,
    cats: years.map(String),
    issued,
    version: `v${CURRENT_VERSION.version}`,
    met: (key) => rows.map((r) => num(r.metrics[key])),
    val: (key) => years.map((y) => num(b.byYear[y]?.values[key])),
    num,
  };
}
