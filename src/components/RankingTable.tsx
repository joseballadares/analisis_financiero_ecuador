"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCompactMoney, formatPercent } from "@/lib/format";
import SortIcon from "@/components/SortIcon";

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

type SortKey = "rank" | "nombre" | "sector" | "ingresos" | "activos" | "utilidad" | "margen" | "roe";

const PAGE = 50;

const COLS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: "rank", label: "#" },
  { key: "nombre", label: "Empresa" },
  { key: "sector", label: "Sector" },
  { key: "ingresos", label: "Ingresos", right: true },
  { key: "activos", label: "Activos", right: true },
  { key: "utilidad", label: "Utilidad neta", right: true },
  { key: "margen", label: "Margen neto", right: true },
  { key: "roe", label: "ROE", right: true },
];

// Ranking ordenable: cada columna tiene flechas para ordenar de menor a mayor o de mayor a menor.
export default function RankingTable({ rows, sectors }: { rows: RankRow[]; sectors: Record<string, string> }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const val = (r: RankRow): number | string | null => (sort.key === "sector" ? (r.sector ? (sectors[r.sector] ?? r.sector) : null) : r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const c = typeof x === "string" ? x.localeCompare(y as string, "es") : x - (y as number);
      return c * sort.dir;
    });
  }, [rows, sort, sectors]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = sorted.slice(cur * PAGE, cur * PAGE + PAGE);

  // Primer clic: mayor a menor en cifras y A–Z en texto; segundo clic: al revés.
  const toggle = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "nombre" || key === "sector" || key === "rank" ? 1 : -1 },
    );
    setPage(0);
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              {COLS.map((c) => (
                <th key={c.key} className={`px-3 py-2.5 ${c.right ? "text-right" : ""}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    className={`inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-foreground ${sort.key === c.key ? "text-foreground" : ""}`}
                    title={`Ordenar por ${c.label.toLowerCase()}`}
                  >
                    {c.label}
                    <SortIcon dir={sort.key === c.key ? sort.dir : 0} />
                  </button>
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
