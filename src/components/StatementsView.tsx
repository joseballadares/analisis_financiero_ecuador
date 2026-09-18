"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatMoney, formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";

type Row = { anio: number; data: Record<string, number> };
type Stmt = "esf" | "eri";

const btn = (active: boolean) =>
  `rounded-full px-3 py-1 text-xs transition-colors ${
    active ? "bg-brand text-white" : "border border-border text-muted hover:border-brand hover:text-brand"
  }`;

// Estado de situación financiera: cuentas 1 (activo), 2 (pasivo) y 3 (patrimonio).
// Estado de resultado integral: cuentas 4 a 7 (ingresos, costos, gastos y resultados).
const inStmt = (code: string, stmt: Stmt) => (stmt === "esf" ? "123".includes(code[0]) : "4567".includes(code[0]));

// Además de los códigos de hasta 3 dígitos, líneas clave del ERI para la vista compacta.
const COMPACT_EXTRA = new Set(["40101", "40102", "50201", "50202", "50203", "50204"]);

export default function StatementsView({
  rows,
  names,
  detail,
  detailYear,
  csvHref,
  sriYears,
}: {
  rows: Row[];
  names: Record<string, string>;
  detail: ReactNode;
  detailYear: number;
  csvHref: string;
  sriYears: number[];
}) {
  const [mode, setMode] = useState<"comparativo" | "detalle">(rows.length > 0 ? "comparativo" : "detalle");
  const [stmt, setStmt] = useState<Stmt>("esf");
  const [compact, setCompact] = useState(true);
  const [pct, setPct] = useState(false);
  const [delta, setDelta] = useState(false);

  const years = useMemo(() => rows.map((r) => r.anio).sort((a, b) => a - b), [rows]);
  const byYear = useMemo(() => new Map(rows.map((r) => [r.anio, r.data])), [rows]);
  const codes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows)
      for (const [c, v] of Object.entries(r.data)) if (v !== 0 && Number.isFinite(v) && inStmt(c, stmt)) set.add(c);
    return [...set].filter((c) => !compact || c.length <= 3 || COMPACT_EXTRA.has(c)).sort();
  }, [rows, compact, stmt]);
  const baseCode = stmt === "esf" ? "1" : "401";

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
        <a href={csvHref} className="text-xs text-brand hover:underline">
          Descargar todos los años (CSV)
        </a>
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
                    <th key={y} className="px-2 py-2 text-right">
                      {y}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code, idx) => {
                  const depth = Math.max(0, Math.floor((code.length - 1) / 2));
                  const bold = code.length <= 3;
                  const zebra = idx % 2 === 0 ? "bg-surface" : "bg-background";
                  const series = years.map((y) => {
                    const v = (byYear.get(y) ?? {})[code];
                    return typeof v === "number" ? v : null;
                  });
                  return (
                    <tr key={code} className={`${zebra} ${bold ? "font-semibold" : ""}`}>
                      <td className={`sticky left-0 z-10 px-3 py-1.5 ${zebra}`} style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}>
                        {names[code] ?? code}
                      </td>
                      {years.map((y, i) => {
                        const d = byYear.get(y) ?? {};
                        const v = d[code];
                        const base = d[baseCode];
                        const p = i > 0 ? (byYear.get(years[i - 1]) ?? {})[code] : undefined;
                        return (
                          <td key={y} className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                            {v === undefined ? "—" : formatMoney(v)}
                            {pct && v !== undefined && base ? (
                              <div className="text-[10px] font-normal text-muted">{formatPercent(v / base, 1)}</div>
                            ) : null}
                            {delta && v !== undefined && p ? (
                              <div className={`text-[10px] font-normal ${v - p >= 0 ? "text-positive" : "text-negative"}`}>
                                {v - p >= 0 ? "▲" : "▼"} {formatPercent(Math.abs((v - p) / Math.abs(p)), 1)}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center">
                        <Sparkline values={series} width={64} height={20} title={names[code] ?? code} />
                      </td>
                    </tr>
                  );
                })}
                {codes.length === 0 && (
                  <tr>
                    <td colSpan={years.length + 2} className="px-4 py-6 text-center text-muted">
                      Sin cuentas para este estado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        detail
      )}
    </div>
  );
}
