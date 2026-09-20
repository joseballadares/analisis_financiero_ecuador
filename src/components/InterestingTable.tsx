"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCompactMoney, formatPercent } from "@/lib/format";
import { SIGNALS, type Interesting, type SignalId } from "@/lib/interestingMeta";
import { SignalChip } from "@/components/home/FeaturedCard";
import SortIcon from "@/components/SortIcon";

type SortKey = "radar" | "senales" | "rank" | "nombre" | "ingresos" | "margen" | "roe";
const PAGE = 40;

// Lista del Radar Estratégico: se puede acotar por señal y ordenar con las flechas; cada fila explica por qué aparece.
export default function InterestingTable({
  rows,
  sectors,
  counts,
}: {
  rows: Interesting[];
  sectors: Record<string, string>;
  counts: Record<SignalId, number>;
}) {
  const [active, setActive] = useState<SignalId[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "radar", dir: 1 });
  const [page, setPage] = useState(0);

  const radarOf = useMemo(() => new Map(rows.map((r, i) => [r.ruc, i + 1])), [rows]);

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (active.length && !active.every((id) => r.signals.some((s) => s.id === id))) return false;
      return true;
    });
    const val = (r: Interesting): number | string | null =>
      sort.key === "senales" ? r.signals.length : sort.key === "radar" ? (radarOf.get(r.ruc) ?? null) : r[sort.key];
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const c = typeof x === "string" ? x.localeCompare(y as string, "es") : x - (y as number);
      return (c || a.rank - b.rank) * sort.dir;
    });
  }, [rows, active, sort, radarOf]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
  const toggle = (id: SignalId) => {
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
    setPage(0);
  };
  const setSortKey = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "nombre" || key === "rank" || key === "radar" ? 1 : -1 }));
    setPage(0);
  };
  const dirOf = (k: SortKey): 0 | 1 | -1 => (sort.key === k ? sort.dir : 0);
  const th = "px-3 py-2.5 text-xs uppercase tracking-wide text-muted";
  const sortable = "inline-flex cursor-pointer select-none items-center gap-1.5 hover:text-foreground";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SIGNALS.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            title={s.desc}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              active.includes(s.id) ? "border-brand bg-brand text-white" : "border-border text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {s.label} <span className="opacity-70">({counts[s.id] ?? 0})</span>
          </button>
        ))}
      </div>

      {active.length > 0 && (
        <button onClick={() => (setActive([]), setPage(0))} className="mt-3 rounded-full border border-border px-3 py-1 text-sm text-muted hover:border-brand hover:text-brand">
          Quitar selección
        </button>
      )}
      <p className="mt-3 text-sm text-muted">
        {filtered.length.toLocaleString("es-EC")} de {rows.length.toLocaleString("es-EC")} empresas
        {active.length > 1 ? " que cumplen todas las señales elegidas" : ""}. <strong className="font-medium text-foreground">Puesto radar:</strong>{" "}
        más señales primero y, en empates, mayores ingresos; <strong className="font-medium text-foreground">puesto ingresos:</strong> lugar por
        ingresos operacionales entre todas las empresas.
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className={`${th} !px-2`} title="Puesto en el Radar Estratégico: más señales primero; en caso de empate, mayores ingresos">
                <span className={sortable} onClick={() => setSortKey("radar")}>
                  <span className="leading-tight">Puesto<br />radar</span> <SortIcon dir={dirOf("radar")} />
                </span>
              </th>
              <th className={`${th} !px-2`} title="Puesto por ingresos operacionales entre todas las empresas">
                <span className={sortable} onClick={() => setSortKey("rank")}>
                  <span className="leading-tight">Puesto<br />ingresos</span> <SortIcon dir={dirOf("rank")} />
                </span>
              </th>
              <th className={`${th} w-[19%]`}>
                <span className={sortable} onClick={() => setSortKey("nombre")}>
                  Empresa <SortIcon dir={dirOf("nombre")} />
                </span>
              </th>
              <th className={`${th} w-[53%]`}>
                <span className={sortable} onClick={() => setSortKey("senales")}>
                  Por qué está en el radar <SortIcon dir={dirOf("senales")} />
                </span>
              </th>
              <th className={`${th} text-right`}>
                <span className={sortable} onClick={() => setSortKey("ingresos")}>
                  Ingresos <SortIcon dir={dirOf("ingresos")} />
                </span>
              </th>
              <th className={`${th} text-right`}>
                <span className={sortable} onClick={() => setSortKey("margen")}>
                  Margen neto <SortIcon dir={dirOf("margen")} />
                </span>
              </th>
              <th className={`${th} text-right`}>
                <span className={sortable} onClick={() => setSortKey("roe")}>
                  ROE <SortIcon dir={dirOf("roe")} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.ruc} className="border-b border-border align-top last:border-b-0 hover:bg-surface">
                <td className="px-2 py-2 text-center font-semibold tabular-nums text-brand">{radarOf.get(r.ruc)}</td>
                <td className="px-2 py-2 text-center tabular-nums text-muted">{r.rank}</td>
                <td className="px-3 py-2">
                  <Link href={`/empresa/${r.ruc}`} className="font-medium hover:text-brand hover:underline">
                    {r.nombre}
                  </Link>
                  <div className="text-[11px] leading-tight text-muted">{r.sector ? (sectors[r.sector] ?? r.sector) : ""}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    {r.signals.map((s) => (
                      <SignalChip key={s.id} s={s} inline />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCompactMoney(r.ingresos)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${(r.margen ?? 0) < 0 ? "text-negative" : ""}`}>{r.margen === null ? "—" : formatPercent(r.margen, 1)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${(r.roe ?? 0) < 0 ? "text-negative" : ""}`}>{r.roe === null ? "—" : formatPercent(r.roe, 1)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Ninguna empresa cumple los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand disabled:opacity-40">
            ← Anterior
          </button>
          <span className="text-muted">
            Página {cur + 1} de {pages}
          </span>
          <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand disabled:opacity-40">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
