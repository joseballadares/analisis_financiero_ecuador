import Link from "next/link";
import { getLatestRankingYear } from "@/lib/db";
import { getProvinceStats } from "@/lib/queries";
import { formatCompactMoney, formatMoney, formatPercent, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProvinciasPage() {
  const anio = await getLatestRankingYear();
  const stats = await getProvinceStats(anio);
  const byProv = new Map<string, { cur?: (typeof stats)[number]; prev?: (typeof stats)[number] }>();
  for (const s of stats) {
    const key = s.provincia ?? "";
    const e = byProv.get(key) ?? {};
    if (s.anio === anio) e.cur = s;
    else e.prev = s;
    byProv.set(key, e);
  }
  const rows = [...byProv.entries()]
    .filter(([, v]) => v.cur)
    .map(([prov, v]) => ({
      prov,
      empresas: v.cur!.empresas,
      conIngresos: v.cur!.con_ingresos,
      ingresos: v.cur!.ingresos,
      activos: v.cur!.activos,
      growth: v.prev && v.prev.ingresos > 0 ? v.cur!.ingresos / v.prev.ingresos - 1 : null,
    }))
    .sort((a, b) => b.ingresos - a.ingresos);
  const totalIng = rows.reduce((a, r) => a + r.ingresos, 0);
  const totalEmp = rows.reduce((a, r) => a + r.empresas, 0);
  const max = Math.max(...rows.map((r) => r.ingresos), 1);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Empresas por provincia</h1>
      <p className="mt-2 text-muted">
        {totalEmp.toLocaleString("es-EC")} empresas con datos de {anio} en {rows.length} provincias, según su
        provincia de constitución. Ingresos operacionales totales: {formatCompactMoney(totalIng)}.
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">Provincia</th>
              <th className="px-4 py-2.5 text-right">Empresas</th>
              <th className="px-4 py-2.5 text-right">Ingresos</th>
              <th className="px-4 py-2.5 w-40">Participación</th>
              <th className="px-4 py-2.5 text-right">Ingreso promedio</th>
              <th className="px-4 py-2.5 text-right">Activos</th>
              <th className="px-4 py-2.5 text-right">Vs {anio - 1}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.prov} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <Link
                    href={r.prov ? `/buscar?provincia=${encodeURIComponent(r.prov)}` : "/buscar"}
                    className="font-medium hover:text-brand"
                  >
                    {r.prov ? titleCase(r.prov) : "Sin provincia"}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.empresas.toLocaleString("es-EC")}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.ingresos)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-border">
                      <div className="h-2 rounded-full" style={{ background: "var(--chart-blue)", width: `${(r.ingresos / max) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-muted">
                      {formatPercent(r.ingresos / totalIng, 1)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {r.conIngresos > 0 ? formatMoney(r.ingresos / r.conIngresos) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.activos)}</td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums ${
                    r.growth === null ? "text-muted" : r.growth >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {r.growth === null ? "—" : `${r.growth >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(r.growth), 1)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        El ingreso promedio se calcula sobre las empresas con ingresos reportados. La provincia es la de
        constitución legal, no necesariamente donde se generan las ventas.
      </p>
    </div>
  );
}
