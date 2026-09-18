import Link from "next/link";
import { formatMoney, formatRatioValue } from "@/lib/format";
import type { PeerGroup } from "@/lib/db";
import { derivedRatios } from "@/lib/derived";

// Lista de las empresas comparables de tamaño más cercano (el benchmarking por ratio está en la tabla de ratios).
export default function PeersTab({ group }: { group: PeerGroup | null }) {
  if (!group) {
    return (
      <p className="text-sm text-muted">
        No hay suficientes datos de ingresos o actividad para armar un grupo de comparables en este año.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Empresas comparables</h3>
      <p className="text-sm text-muted">
        Comparada con {group.total.toLocaleString("es-EC")} empresas activas de la {group.levelLabel} (CIIU{" "}
        <span className="font-mono">{group.prefix}</span>). Por ingresos ocupa el puesto{" "}
        <strong className="text-foreground">{group.sizeRank}</strong> de {group.total + 1}. El semáforo y la mediana
        de cada ratio se calculan sobre las {group.benchmark.n.toLocaleString("es-EC")} empresas más cercanas en
        tamaño. Estas son las diez más próximas:
      </p>
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
            {group.peers.map((p) => {
              const d = derivedRatios(p.metrics);
              return (
                <tr key={p.expediente} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/empresa/${p.ruc}`} className="hover:text-brand hover:underline">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(p.metrics.ingresos_ventas as number)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatRatioValue("roe", d.roe)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatRatioValue("rent_neta_ventas", d.rent_neta_ventas)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatRatioValue("liquidez_corriente", p.metrics.liquidez_corriente)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
