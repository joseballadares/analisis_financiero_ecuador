"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCompactMoney, formatPercent } from "@/lib/format";

export type RankRow = {
  ruc: string;
  nombre: string;
  rank: number;
  sector: string | null;
  ingresos: number;
  activos: number | null;
  utilidad: number | null;
  margen: number | null;
  roe: number | null;
};

type NumKey = "ingresos" | "activos" | "utilidad" | "margen" | "roe";
type SortKey = "rank" | "nombre" | "sector" | NumKey;
type Range = { min: string; max: string };

const PAGE = 50;

// Columnas numéricas: los importes se filtran en millones de dólares y los ratios en porcentaje.
const NUM_COLS: { key: NumKey; label: string; unit: "M$" | "%" }[] = [
  { key: "ingresos", label: "Ingresos", unit: "M$" },
  { key: "activos", label: "Activos", unit: "M$" },
  { key: "utilidad", label: "Utilidad neta", unit: "M$" },
  { key: "margen", label: "Margen neto", unit: "%" },
  { key: "roe", label: "ROE", unit: "%" },
];

const input =
  "w-full rounded border border-border bg-background px-1.5 py-1 text-xs font-normal normal-case tracking-normal text-foreground outline-none focus:border-brand";

export default function RankingTable({ rows, sectors }: { rows: RankRow[]; sectors: Record<string, string> }) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [ranges, setRanges] = useState<Record<NumKey, Range>>({
    ingresos: { min: "", max: "" },
    activos: { min: "", max: "" },
    utilidad: { min: "", max: "" },
    margen: { min: "", max: "" },
    roe: { min: "", max: "" },
  });
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const [page, setPage] = useState(0);

  const sectorOptions = useMemo(() => {
    const codes = [...new Set(rows.map((r) => r.sector).filter((s): s is string => !!s))];
    return codes.sort((a, b) => (sectors[a] ?? a).localeCompare(sectors[b] ?? b, "es"));
  }, [rows, sectors]);

  const filtered = useMemo(() => {
    const q = name.trim().toLowerCase();
    const parse = (v: string, unit: "M$" | "%") => {
      if (v.trim() === "") return null;
      const n = parseFloat(v.replace(",", "."));
      return Number.isFinite(n) ? (unit === "M$" ? n * 1e6 : n / 100) : null;
    };
    const active = NUM_COLS.map((c) => ({ c, min: parse(ranges[c.key].min, c.unit), max: parse(ranges[c.key].max, c.unit) }));
    const list = rows.filter((r) => {
      if (q && !r.nombre.toLowerCase().includes(q) && !r.ruc.startsWith(q)) return false;
      if (sector && r.sector !== sector) return false;
      for (const { c, min, max } of active) {
        const v = r[c.key];
        if ((min !== null || max !== null) && v === null) return false;
        if (min !== null && (v as number) < min) return false;
        if (max !== null && (v as number) > max) return false;
      }
      return true;
    });
    const val = (r: RankRow): number | string | null => (sort.key === "sector" ? (r.sector ? (sectors[r.sector] ?? r.sector) : null) : r[sort.key]);
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const c = typeof x === "string" ? x.localeCompare(y as string, "es") : x - (y as number);
      return c * sort.dir;
    });
  }, [rows, name, sector, ranges, sort, sectors]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
  const hasFilter = name !== "" || sector !== "" || NUM_COLS.some((c) => ranges[c.key].min !== "" || ranges[c.key].max !== "");

  const toggle = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "nombre" || key === "sector" || key === "rank" ? 1 : -1 }));
    setPage(0);
  };
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "");
  const setRange = (key: NumKey, part: "min" | "max", v: string) => {
    setRanges((r) => ({ ...r, [key]: { ...r[key], [part]: v } }));
    setPage(0);
  };
  const reset = () => {
    setName("");
    setSector("");
    setRanges({ ingresos: { min: "", max: "" }, activos: { min: "", max: "" }, utilidad: { min: "", max: "" }, margen: { min: "", max: "" }, roe: { min: "", max: "" } });
    setPage(0);
  };
  const th = "px-3 py-2 align-bottom";
  const sortBtn = "cursor-pointer select-none hover:text-foreground";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          {filtered.length.toLocaleString("es-EC")} de {rows.length.toLocaleString("es-EC")} empresas
          {hasFilter ? " con los filtros aplicados" : ""}
        </span>
        {hasFilter && (
          <button onClick={reset} className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand">
            Quitar filtros
          </button>
        )}
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th className={th}>
                <span className={sortBtn} onClick={() => toggle("rank")}>
                  #{arrow("rank")}
                </span>
              </th>
              <th className={th}>
                <span className={sortBtn} onClick={() => toggle("nombre")}>
                  Empresa{arrow("nombre")}
                </span>
              </th>
              <th className={th}>
                <span className={sortBtn} onClick={() => toggle("sector")}>
                  Sector{arrow("sector")}
                </span>
              </th>
              {NUM_COLS.map((c) => (
                <th key={c.key} className={`${th} text-right`}>
                  <span className={sortBtn} onClick={() => toggle(c.key)}>
                    {c.label}
                    {arrow(c.key)}
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b border-border bg-surface/60">
              <th className="px-3 pb-2" />
              <th className="px-3 pb-2">
                <input
                  className={input}
                  placeholder="Nombre o RUC"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setPage(0);
                  }}
                  aria-label="Filtrar por nombre o RUC"
                />
              </th>
              <th className="px-3 pb-2">
                <select
                  className={input}
                  value={sector}
                  onChange={(e) => {
                    setSector(e.target.value);
                    setPage(0);
                  }}
                  aria-label="Filtrar por sector"
                >
                  <option value="">Todos</option>
                  {sectorOptions.map((s) => (
                    <option key={s} value={s}>
                      {sectors[s] ?? s}
                    </option>
                  ))}
                </select>
              </th>
              {NUM_COLS.map((c) => (
                <th key={c.key} className="px-3 pb-2">
                  <div className="flex flex-col gap-1">
                    <input
                      className={`${input} text-right`}
                      inputMode="decimal"
                      placeholder={`mín. (${c.unit})`}
                      value={ranges[c.key].min}
                      onChange={(e) => setRange(c.key, "min", e.target.value)}
                      aria-label={`${c.label} mínimo`}
                    />
                    <input
                      className={`${input} text-right`}
                      inputMode="decimal"
                      placeholder={`máx. (${c.unit})`}
                      value={ranges[c.key].max}
                      onChange={(e) => setRange(c.key, "max", e.target.value)}
                      aria-label={`${c.label} máximo`}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.ruc} className="border-b border-border last:border-b-0 hover:bg-surface">
                <td className="px-3 py-2.5 tabular-nums text-muted">{r.rank}</td>
                <td className="px-3 py-2.5">
                  <Link href={`/empresa/${r.ruc}`} className="hover:text-brand hover:underline">
                    {r.nombre}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">{r.sector ? (sectors[r.sector] ?? r.sector) : "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCompactMoney(r.ingresos)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCompactMoney(r.activos)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${(r.utilidad ?? 0) < 0 ? "text-negative" : ""}`}>{formatCompactMoney(r.utilidad)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${(r.margen ?? 0) < 0 ? "text-negative" : ""}`}>{r.margen === null ? "—" : formatPercent(r.margen, 1)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${(r.roe ?? 0) < 0 ? "text-negative" : ""}`}>{r.roe === null ? "—" : formatPercent(r.roe, 1)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Ninguna empresa cumple los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={cur === 0}
            onClick={() => setPage(cur - 1)}
            className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-muted">
            Página {cur + 1} de {pages}
          </span>
          <button
            disabled={cur >= pages - 1}
            onClick={() => setPage(cur + 1)}
            className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
