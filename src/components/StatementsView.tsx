"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatCompactMoney, formatMoney, formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";
import { statementDirection, trendTone } from "@/lib/trend";

type Row = { anio: number; data: Record<string, number> };
type Stmt = "esf" | "eri";
type Data = Record<string, number>;

// Línea de un estado: una cuenta del plan de cuentas o una línea de la vista compacta (con nombre simple).
type Line = { key: string; label: string; depth: 0 | 1 | 2; code: string; get: (d: Data) => number | undefined };

const btn = (active: boolean) =>
  `rounded-full px-3 py-1 text-xs transition-colors ${
    active ? "bg-brand text-white" : "border border-border text-muted hover:border-brand hover:text-brand"
  }`;

// Estado de situación financiera: cuentas 1 (activo), 2 (pasivo) y 3 (patrimonio).
// Estado de resultado integral: cuentas 4 a 7 (ingresos, costos, gastos y resultados).
const inStmt = (code: string, stmt: Stmt) => (stmt === "esf" ? "123".includes(code[0]) : "4567".includes(code[0]));

const sum = (d: Data, codes: string[]) => codes.reduce((a, c) => a + (d[c] ?? 0), 0);

// "Otros": lo que queda del total tras las cuentas mostradas (solo si no es despreciable).
const rest = (parent: string, shown: string[]) => (d: Data) => {
  if (d[parent] === undefined) return undefined;
  const r = d[parent] - sum(d, shown);
  return Math.abs(r) >= 1 ? r : undefined;
};
const acct = (code: string) => (d: Data) => d[code];

// Vista compacta: pocas líneas con nombres simples, como un estado resumido. La vista Completa muestra todas las
// cuentas con su nombre oficial.
const line = (code: string, label: string, depth: 0 | 1 | 2, get?: (d: Data) => number | undefined): Line => ({
  key: `${code}:${label}`,
  label,
  depth,
  code,
  get: get ?? acct(code),
});

const COMPACT: Record<Stmt, Line[]> = {
  esf: [
    line("1", "Activo", 0),
    line("101", "Activo corriente", 1),
    line("10101", "Efectivo y equivalentes", 2),
    line("10102", "Activos financieros", 2),
    line("10103", "Inventarios", 2),
    line("10104", "Pagos anticipados", 2),
    line("10105", "Crédito tributario (impuestos corrientes)", 2),
    line("10199", "Otros activos corrientes", 2, rest("101", ["10101", "10102", "10103", "10104", "10105"])),
    line("102", "Activo no corriente", 1),
    line("10201", "Propiedad, planta y equipo", 2),
    line("10202", "Propiedades de inversión", 2),
    line("10204", "Activo intangible", 2),
    line("10207", "Derecho de uso de activos arrendados", 2),
    line("10205", "Activos por impuestos diferidos", 2),
    line("10299", "Otros activos no corrientes", 2, rest("102", ["10201", "10202", "10204", "10207", "10205"])),
    line("2", "Pasivo", 0),
    line("201", "Pasivo corriente", 1),
    line("20103", "Cuentas y documentos por pagar", 2),
    line("20104", "Obligaciones con instituciones financieras", 2),
    line("20107", "Otras obligaciones corrientes", 2),
    line("20199", "Otros pasivos corrientes", 2, rest("201", ["20103", "20104", "20107"])),
    line("202", "Pasivo no corriente", 1),
    line("20203", "Obligaciones con instituciones financieras", 2),
    line("20205", "Valores emitidos (porción no corriente)", 2),
    line("20299", "Otros pasivos no corrientes", 2, rest("202", ["20203", "20205"])),
    line("3", "Patrimonio neto", 0),
    line("301", "Capital", 2),
    line("302", "Aportes para futura capitalización", 2),
    line("304", "Reservas", 2),
    line("305", "Otros resultados integrales", 2),
    line("306", "Resultados acumulados", 2),
    line("307", "Resultado del ejercicio", 2),
    line("399", "Otros (prima, participación no controladora)", 2, rest("3", ["301", "302", "304", "305", "306", "307"])),
  ],
  eri: [
    line("401", "Ingresos de actividades ordinarias", 0),
    line("40101", "Venta de bienes", 2),
    line("40102", "Prestación de servicios", 2),
    line("40199", "Otros ingresos ordinarios", 2, rest("401", ["40101", "40102"])),
    line("501", "Costo de ventas y producción", 1),
    line("402", "Ganancia bruta", 0),
    line("502", "Gastos", 1),
    line("50201", "Gastos de venta", 2),
    line("50202", "Gastos administrativos", 2),
    line("50203", "Gastos financieros", 2),
    line("50204", "Otros gastos", 2),
    line("403", "Otros ingresos", 1),
    line("600", "Ganancia antes de participación de trabajadores e impuestos", 0),
    line("601", "15% participación de trabajadores", 1),
    line("602", "Ganancia antes de impuestos", 0),
    line("603", "Impuesto a la renta causado", 1),
    line("707", "Ganancia (pérdida) neta del período", 0),
  ],
};

export default function StatementsView({
  rows,
  names,
  detail,
  detailYear,
  csvHref,
  sriYears,
  reportHref,
}: {
  rows: Row[];
  names: Record<string, string>;
  detail: ReactNode;
  detailYear: number;
  csvHref: string;
  sriYears: number[];
  reportHref?: string;
}) {
  const [mode, setMode] = useState<"comparativo" | "detalle">(rows.length > 0 ? "comparativo" : "detalle");
  const [stmt, setStmt] = useState<Stmt>("esf");
  const [compact, setCompact] = useState(true);
  const [abbr, setAbbr] = useState(false);
  const [pct, setPct] = useState(false);
  const [delta, setDelta] = useState(false);

  const years = useMemo(() => rows.map((r) => r.anio).sort((a, b) => a - b), [rows]);
  const byYear = useMemo(() => new Map(rows.map((r) => [r.anio, r.data])), [rows]);
  const baseCode = stmt === "esf" ? "1" : "401";

  const lines = useMemo<Line[]>(() => {
    if (compact) {
      // La línea 30 (atribuible a los propietarios) repite el patrimonio neto cuando no hay participación no controladora.
      const out = COMPACT[stmt].filter((l) => {
        if (l.depth === 0) return rows.some((r) => l.get(r.data) !== undefined);
        return rows.some((r) => {
          const v = l.get(r.data);
          return v !== undefined && v !== 0;
        });
      });
      return out;
    }
    const set = new Set<string>();
    for (const r of rows)
      for (const [c, v] of Object.entries(r.data)) if (v !== 0 && Number.isFinite(v) && inStmt(c, stmt)) set.add(c);
    return [...set].sort().map((code) => ({
      key: code,
      label: names[code] ?? code,
      depth: (code.length <= 1 ? 0 : code.length <= 3 ? 1 : 2) as 0 | 1 | 2,
      code,
      get: acct(code),
    }));
  }, [rows, compact, stmt, names]);

  const money = (v: number) => (abbr ? formatCompactMoney(v) : formatMoney(v));

  // Jerarquía visual: cuentas principales con fondo y letra fuerte; secundarias en tono más tenue.
  const look = (depth: 0 | 1 | 2) =>
    depth === 0
      ? { row: "bg-brand-soft border-l-4 border-brand", label: "font-bold uppercase tracking-wide text-foreground", val: "font-bold text-foreground", bg: "bg-brand-soft" }
      : depth === 1
        ? { row: "border-l-4 border-transparent", label: "font-semibold text-foreground", val: "font-semibold text-foreground", bg: "bg-surface" }
        : { row: "border-l-4 border-transparent", label: "font-normal text-muted", val: "font-normal text-foreground/80", bg: "bg-surface" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {rows.length > 0 && (
            <>
              <button
                className={btn(mode === "comparativo" && stmt === "esf")}
                onClick={() => {
                  setMode("comparativo");
                  setStmt("esf");
                }}
              >
                Estado de Situación Financiera (ESF)
              </button>
              <button
                className={btn(mode === "comparativo" && stmt === "eri")}
                onClick={() => {
                  setMode("comparativo");
                  setStmt("eri");
                }}
              >
                Estado de Resultado Integral (ERI)
              </button>
              <button className="cursor-not-allowed rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted" disabled title="Requiere datos que la Superintendencia no publica">
                Flujo de efectivo · próximamente
              </button>
            </>
          )}
          <button className={btn(mode === "detalle")} onClick={() => setMode("detalle")}>
            Detalle línea por línea {detailYear}
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {reportHref && (
            <a href={reportHref} target="_blank" rel="noreferrer" className="text-muted hover:text-brand hover:underline">
              ¿Error en estos datos?
            </a>
          )}
          <a href={csvHref} className="text-brand hover:underline">
            Descargar todos los años (CSV)
          </a>
        </div>
      </div>

      {mode === "comparativo" ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button className={btn(compact)} onClick={() => setCompact(true)}>
              Compacta
            </button>
            <button className={btn(!compact)} onClick={() => setCompact(false)}>
              Completa
            </button>
            <span className="mx-1 h-4 w-px bg-border" />
            <button className={btn(!abbr)} onClick={() => setAbbr(false)} title="Importes en dólares completos">
              US$ completos
            </button>
            <button className={btn(abbr)} onClick={() => setAbbr(true)} title="Importes abreviados (K, M, mil M)">
              Abreviados
            </button>
            <span className="mx-1 h-4 w-px bg-border" />
            <label className="inline-flex items-center gap-1.5 text-muted">
              <input type="checkbox" checked={pct} onChange={(e) => setPct(e.target.checked)} />
              {stmt === "esf" ? "% del activo" : "% de los ingresos"}
            </label>
            <label className="inline-flex items-center gap-1.5 text-muted">
              <input type="checkbox" checked={delta} onChange={(e) => setDelta(e.target.checked)} />
              Variación vs año anterior
            </label>
          </div>
          {sriYears.length > 0 && (
            <p className="text-[11px] text-muted">
              Los años {sriYears.join(", ")} se presentaron con el formulario tributario del SRI, con otro plan de cuentas, y no
              se pueden alinear con NIIF. Consúltalos en el detalle línea por línea.
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface text-left uppercase tracking-wide text-muted">
                  <th className="sticky left-0 z-10 min-w-48 bg-surface px-3 py-2">Cuenta</th>
                  {years.map((y) => (
                    <th key={y} className={`px-2 py-2 text-right ${y === detailYear ? "text-brand" : ""}`}>
                      {y}
                      {y === detailYear && <span title="Año seleccionado"> ★</span>}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((ln) => {
                  const s = look(ln.depth);
                  const series = years.map((y) => {
                    const v = ln.get(byYear.get(y) ?? {});
                    return typeof v === "number" ? v : null;
                  });
                  return (
                    <tr key={ln.key} className={`border-b border-border/60 ${s.row}`}>
                      <td
                        className={`sticky left-0 z-10 py-1.5 pr-3 ${s.bg} ${s.label}`}
                        style={{ paddingLeft: `${0.6 + ln.depth * 1}rem` }}
                      >
                        {ln.label}
                      </td>
                      {years.map((y, i) => {
                        const d = byYear.get(y) ?? {};
                        const v = ln.get(d);
                        const base = d[baseCode];
                        const p = i > 0 ? ln.get(byYear.get(years[i - 1]) ?? {}) : undefined;
                        return (
                          <td key={y} className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${s.val} ${y === detailYear && ln.depth > 0 ? "bg-brand-soft/40" : ""}`}>
                            {v === undefined ? "—" : money(v)}
                            {pct && v !== undefined && base ? (
                              <div className="text-[11px] font-normal text-muted">{formatPercent(v / base, 1)}</div>
                            ) : null}
                            {delta && v !== undefined && p ? (
                              <div className={`text-[11px] font-normal ${v - p >= 0 ? "text-positive" : "text-negative"}`}>
                                {v - p >= 0 ? "▲" : "▼"} {formatPercent(Math.abs((v - p) / Math.abs(p)), 1)}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center">
                        <Sparkline values={series} width={64} height={20} tone={trendTone(series, statementDirection(ln.code))} title={ln.label} />
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={years.length + 2} className="px-4 py-6 text-center text-muted">
                      Sin cuentas para este estado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">
            {compact
              ? "Vista compacta: nombres simplificados; \"Otros\" agrupa las cuentas no mostradas. La vista Completa trae todas las cuentas con su nombre oficial."
              : "Vista completa: todas las cuentas con el nombre oficial del plan de cuentas de la Superintendencia."}
          </p>
        </>
      ) : (
        detail
      )}
    </div>
  );
}
