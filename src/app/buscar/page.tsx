import Link from "next/link";
import { getLatestRankingYear, getTopLevelSectors } from "@/lib/db";
import { getProvinces, searchCompaniesAdvanced } from "@/lib/queries";
import { formatMoney, segmentName, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Params = {
  q?: string;
  provincia?: string;
  tamano?: string;
  sector?: string;
  ciiu?: string;
  anio?: string;
  pagina?: string;
};

function qs(p: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) u.set(k, v);
  return u.toString();
}

const selectCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

export default async function BuscarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const [latestYear, provinces, sectors] = await Promise.all([
    getLatestRankingYear(),
    getProvinces(),
    getTopLevelSectors(),
  ]);
  const anio = sp.anio ? parseInt(sp.anio, 10) || latestYear : latestYear;
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1);
  const segmento = sp.tamano ? parseInt(sp.tamano, 10) : undefined;

  const { rows, total } = await searchCompaniesAdvanced(
    {
      anio,
      q: sp.q,
      provincia: sp.provincia,
      segmento: segmento && segmento >= 1 && segmento <= 4 ? segmento : undefined,
      sector: sp.sector,
      ciiu: sp.ciiu,
    },
    PAGE_SIZE,
    (pagina - 1) * PAGE_SIZE,
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = { q: sp.q, provincia: sp.provincia, tamano: sp.tamano, sector: sp.sector, ciiu: sp.ciiu, anio: sp.anio };
  const years = Array.from({ length: 7 }, (_, i) => latestYear - i);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Buscar empresas</h1>
      <p className="mt-2 text-muted">
        Filtra por provincia, tamaño, sector o actividad (CIIU). Solo aparecen las empresas con datos
        del año elegido, ordenadas por ingresos.
      </p>

      <form method="get" className="mt-6 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-muted sm:col-span-2 lg:col-span-3">
          Nombre o RUC
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Nombre de la empresa o RUC"
            className={selectCls + " mt-1"}
          />
        </label>
        <label className="text-xs text-muted">
          Provincia
          <select name="provincia" defaultValue={sp.provincia ?? ""} className={selectCls + " mt-1"}>
            <option value="">Todas</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {titleCase(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Tamaño (clasificación de la Superintendencia)
          <select name="tamano" defaultValue={sp.tamano ?? ""} className={selectCls + " mt-1"}>
            <option value="">Todos</option>
            {[1, 2, 3, 4].map((c) => (
              <option key={c} value={c}>
                {segmentName(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Sector
          <select name="sector" defaultValue={sp.sector ?? ""} className={selectCls + " mt-1"}>
            <option value="">Todos</option>
            {sectors.map((s) => (
              <option key={s.codigo} value={s.codigo}>
                {s.codigo} · {s.descripcion.replace(/\.$/, "").slice(0, 60)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Actividad CIIU (código, ej. G4711)
          <input
            name="ciiu"
            defaultValue={sp.ciiu ?? ""}
            placeholder="G4711"
            className={selectCls + " mt-1 font-mono"}
          />
        </label>
        <label className="text-xs text-muted">
          Año
          <select name="anio" defaultValue={String(anio)} className={selectCls + " mt-1"}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors">
            Buscar
          </button>
          <Link href="/buscar" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
            Limpiar
          </Link>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted">
        {total.toLocaleString("es-EC")} empresas encontradas · datos {anio}
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">Empresa</th>
              <th className="px-4 py-2.5">Provincia</th>
              <th className="px-4 py-2.5">Actividad</th>
              <th className="px-4 py-2.5">Tamaño</th>
              <th className="px-4 py-2.5 text-right">Ingresos</th>
              <th className="px-4 py-2.5 text-right">Activos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.expediente} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <Link href={`/empresa/${r.ruc}`} className="font-medium hover:text-brand">
                    {r.nombre}
                  </Link>
                  <div className="text-xs text-muted">RUC {r.ruc}</div>
                </td>
                <td className="px-4 py-2.5 text-muted">{titleCase(r.provincia)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted">{r.ciiu_n6 ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted">{segmentName(r.cod_segmento)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.ingresos)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.activos)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No hay empresas con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {pagina > 1 ? (
            <Link href={`/buscar?${qs({ ...base, pagina: String(pagina - 1) })}`} className="text-brand hover:underline">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Página {pagina.toLocaleString("es-EC")} de {pages.toLocaleString("es-EC")}
          </span>
          {pagina < pages ? (
            <Link href={`/buscar?${qs({ ...base, pagina: String(pagina + 1) })}`} className="text-brand hover:underline">
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
