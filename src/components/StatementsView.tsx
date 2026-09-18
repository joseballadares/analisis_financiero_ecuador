"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatMoney, formatPercent } from "@/lib/format";

type Row = { anio: number; data: Record<string, number> };

const btn = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm transition-colors ${
    active ? "bg-brand text-white" : "border border-border text-muted hover:border-brand hover:text-brand"
  }`;

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
  const [compact, setCompact] = useState(true);
  const [pct, setPct] = useState(false);
  const [delta, setDelta] = useState(false);

  const years = useMemo(() => rows.map((r) => r.anio).sort((a, b) => a - b), [rows]);
  const byYear = useMemo(() => new Map(rows.map((r) => [r.anio, r.data])), [rows]);
  const codes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const [c, v] of Object.entries(r.data)) if (v !== 0 && Number.isFinite(v)) set.add(c);
    return [...set].filter((c) => !compact || c.length <= 3).sort();
  }, [rows, compact]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {rows.length > 0 && (
            <button className={btn(mode === "comparativo")} onClick={() => setMode("comparativo")}>
              Comparativo por años
            </button>
          )}
          <button className={btn(mode === "detalle")} onClick={() => setMode("detalle")}>
            Detalle línea por línea {detailYear}
          </button>
        </div>
        <a href={csvHref} className="text-sm text-brand hover:underline">
          Descargar todos los años (CSV)
        </a>
      </div>

      {mode === "comparativo" ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className={btn(compact)} onClick={() => setCompact(true)}>
              Compacta
            </button>
            <button className={btn(!compact)} onClick={() => setCompact(false)}>
              Completa
            </button>
            <span className="mx-2 h-5 w-px bg-border" />
            <label className="inline-flex items-center gap-1.5 text-muted">
              <input type="checkbox" checked={pct} onChange={(e) => setPct(e.target.checked)} />% del activo
            </label>
            <label className="inline-flex items-center gap-1.5 text-muted">
              <input type="checkbox" checked={delta} onChange={(e) => setDelta(e.target.checked)} />
              Variación vs año anterior
            </label>
          </div>
          {sriYears.length > 0 && (
            <p className="text-xs text-muted">
              Los años {sriYears.join(", ")} se presentaron con el formulario tributario del SRI, con otro plan de
              cuentas, y no se pueden alinear con NIIF. Consúltalos en el detalle línea por línea.
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
                  <th className="sticky left-0 z-10 min-w-64 bg-surface px-4 py-2.5">Cuenta</th>
                  {years.map((y) => (
                    <th key={y} className="px-4 py-2.5 text-right">
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((code, idx) => {
                  const depth = Math.max(0, Math.floor((code.length - 1) / 2));
                  const bold = code.length <= 3;
                  const zebra = idx % 2 === 0 ? "bg-surface" : "bg-background";
                  return (
                    <tr key={code} className={`${zebra} ${bold ? "font-semibold" : ""}`}>
                      <td
                        className={`sticky left-0 z-10 px-4 py-2 ${zebra}`}
                        style={{ paddingLeft: `${1 + depth * 1.1}rem` }}
                      >
                        {names[code] ?? code}
                      </td>
                      {years.map((y, i) => {
                        const d = byYear.get(y) ?? {};
                        const v = d[code];
                        const act = d["1"];
                        const p = i > 0 ? (byYear.get(years[i - 1]) ?? {})[code] : undefined;
                        return (
                          <td key={y} className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                            {v === undefined ? "—" : formatMoney(v)}
                            {pct && v !== undefined && act ? (
                              <div className="text-xs font-normal text-muted">{formatPercent(v / act, 1)}</div>
                            ) : null}
                            {delta && v !== undefined && p ? (
                              <div
                                className={`text-xs font-normal ${v - p >= 0 ? "text-positive" : "text-negative"}`}
                              >
                                {v - p >= 0 ? "▲" : "▼"} {formatPercent(Math.abs((v - p) / Math.abs(p)), 1)}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
