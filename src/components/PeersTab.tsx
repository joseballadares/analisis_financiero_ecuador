import Link from "next/link";
import ratiosData from "@/data/ratios.json";
import { formatMoney, formatRatioValue } from "@/lib/format";
import type { PeerGroup } from "@/lib/db";
import { derivedRatios } from "@/lib/derived";

const NAMES: Record<string, string> = Object.fromEntries(
  (ratiosData.indicadores as { key: string; nombre: string }[]).map((i) => [i.key, i.nombre])
);

export default function PeersTab({ group, inactive = false }: { group: PeerGroup | null; inactive?: boolean }) {
  if (inactive) {
    return (
      <p className="text-sm text-muted">
        Esta empresa no reporta actividad operativa en este año (ingresos menores a $1.000), por lo que
        no se generan comparables ni percentiles.
      </p>
    );
  }
  if (!group) {
    return (
      <p className="text-sm text-muted">
        No hay suficientes datos de ingresos o actividad para armar un grupo de comparables en este año.
      </p>
    );
  }
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Comparada con {group.total.toLocaleString("es-EC")} empresas activas de la {group.levelLabel} (CIIU{" "}
        <span className="font-mono">{group.prefix}</span>). Por ingresos ocupa el puesto{" "}
        <strong className="text-foreground">{group.sizeRank}</strong> de {group.total + 1}. La mediana y el
        percentil se calculan sobre las {Math.min(group.total, 500).toLocaleString("es-EC")} empresas más
        cercanas en tamaño. ROE, ROA,
        margen neto y endeudamiento se calculan con las cifras exactas de cada empresa.
      </p>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">Indicador</th>
              <th className="px-4 py-2.5 text-right">Empresa</th>
              <th className="px-4 py-2.5 text-right">Mediana del grupo</th>
              <th className="px-4 py-2.5 text-right">Percentil</th>
            </tr>
          </thead>
          <tbody>
            {group.stats.map((s) => (
              <tr key={s.key} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">{NAMES[s.key] ?? s.key}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatRatioValue(s.key, s.value)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                  {formatRatioValue(s.key, s.median)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {s.percentile === null ? "—" : `${Math.round(s.percentile)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Empresas de tamaño más cercano
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Empresa</th>
                <th className="px-4 py-2.5 text-right">Ingresos</th>
                <th className="px-4 py-2.5 text-right">ROE</th>
                <th className="px-4 py-2.5 text-right">Margen neto</th>
                <th className="px-4 py-2.5 text-right">Liquidez</th>
              </tr>
            </thead>
            <tbody>
              {group.peers.map((p) => (
                <tr key={p.expediente} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/empresa/${p.ruc}`} className="hover:text-brand hover:underline">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatMoney(p.metrics.ingresos_totales as number)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatRatioValue("roe", derivedRatios(p.metrics).roe)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatRatioValue("rent_neta_ventas", derivedRatios(p.metrics).rent_neta_ventas)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatRatioValue("liquidez_corriente", p.metrics.liquidez_corriente)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
