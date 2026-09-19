"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCompactMoney, formatPercent } from "@/lib/format";
import { SIGNALS, type Interesting, type SignalId } from "@/lib/interestingMeta";
import { SignalChip } from "@/components/home/FeaturedCard";

type SortKey = "senales" | "rank" | "nombre" | "ingresos" | "margen" | "roe";
const PAGE = 40;

const input =
  "w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand";

// Lista de empresas interesantes con filtros por señal, sector y nombre; cada fila explica por qué aparece.
export default function InterestingTable({
  rows,
  sectors,
  counts,
}: {
  rows: Interesting[];
  sectors: Record<string, string>;
  counts: Record<SignalId, number>;
}) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [active, setActive] = useState<SignalId[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "senales", dir: -1 });
  const [page, setPage] = useState(0);

  const sectorOptions = useMemo(() => {
    const codes = [...new Set(rows.map((r) => r.sector).filter((s): s is string => !!s))];
    return codes.sort((a, b) => (sectors[a] ?? a).localeCompare(sectors[b] ?? b, "es"));
  }, [rows, sectors]);

  const filtered = useMemo(() => {
    const q = name.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && !r.nombre.toLowerCase().includes(q) && !r.ruc.startsWith(q)) return false;
      if (sector && r.sector !== sector) return false;
      if (active.length && !active.every((id) => r.signals.some((s) => s.id === id))) return false;
      return true;
    });
    const val = (r: Interesting): number | string | null => (sort.key === "senales" ? r.signals.length : r[sort.key]);
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const c = typeof x === "string" ? x.localeCompare(y as string, "es") : x - (y as number);
      return (c || a.rank - b.rank) * sort.dir;
    });
  }, [rows, name, sector, active, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
  const toggle = (id: SignalId) => {
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
    setPage(0);
  };
  const setSortKey = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "nombre" || key === "rank" ? 1 : -1 }));
    setPage(0);
  };
  const arrow = (k: SortKey) => (sort.key === k ? (sort.dir === 1 ? " ▲" : " ▼") : "");
  const hasFilter = name !== "" || sector !== "" || active.length > 0;
  const th = "px-3 py-2.5 text-xs uppercase tracking-wide text-muted";
  const sortable = "cursor-pointer select-none hover:text-foreground";

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

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
        <input className={input} placeholder="Buscar por nombre o RUC" value={name} onChange={(e) => (setName(e.target.value), setPage(0))} aria-label="Buscar por nombre o RUC" />
        <select className={input} value={sector} onChange={(e) => (setSector(e.target.value), setPage(0))} aria-label="Filtrar por sector">
          <option value="">Todos los sectores</option>
          {sectorOptions.map((s) => (
            <option key={s} value={s}>
              {sectors[s] ?? s}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button
            onClick={() => (setName(""), setSector(""), setActive([]), setPage(0))}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-brand hover:text-brand"
          >
            Quitar filtros
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">
        {filtered.length.toLocaleString("es-EC")} de {rows.length.toLocaleString("es-EC")} empresas
        {active.length > 1 ? " que cumplen todas las señales elegidas" : ""}
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className={th}>
                <span className={sortable} onClick={() => setSortKey("rank")}>
                  #{arrow("rank")}
                </span>
              </th>
              <th className={th}>
                <span className={sortable} onClick={() => setSortKey("nombre")}>
                  Empresa{arrow("nombre")}
                </span>
              </th>
              <th className={th}>
                <span className={sortable} onClick={() => setSortKey("senales")}>
                  Por qué es interesante{arrow("senales")}
                </span>
              </th>
              <th className={`${th} text-right`}>
                <span className={sortable} onClick={() => setSortKey("ingresos")}>
                  Ingresos{arrow("ingresos")}
                </span>
              </th>
              <th className={`${th} text-right`}>
                <span className={sortable} onClick={() => setSortKey("margen")}>
                  Margen neto{arrow("margen")}
                </span>
              </th>
              <th className={`${th} text-right`}>
                <span className={sortable} onClick={() => setSortKey("roe")}>
                  ROE{arrow("roe")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.ruc} className="border-b border-border align-top last:border-b-0 hover:bg-surface">
                <td className="px-3 py-3 tabular-nums text-muted">{r.rank}</td>
                <td className="px-3 py-3">
                  <Link href={`/empresa/${r.ruc}`} className="font-medium hover:text-brand hover:underline">
                    {r.nombre}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted">{r.sector ? (sectors[r.sector] ?? r.sector) : ""}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="space-y-2">
                    {r.signals.map((s) => (
                      <SignalChip key={s.id} s={s} detail />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatCompactMoney(r.ingresos)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${(r.margen ?? 0) < 0 ? "text-negative" : ""}`}>{r.margen === null ? "—" : formatPercent(r.margen, 1)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${(r.roe ?? 0) < 0 ? "text-negative" : ""}`}>{r.roe === null ? "—" : formatPercent(r.roe, 1)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
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
