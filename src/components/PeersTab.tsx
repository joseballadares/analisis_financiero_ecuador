import Link from "next/link";
import { formatMoney, formatRatioValue } from "@/lib/format";
import type { PeerGroup } from "@/lib/db";
import { derivedRatios } from "@/lib/derived";

export type OwnPeerValues = { ingresos: number | null; roe: number | null; margen: number | null; liquidez: number | null };

// Nombre corto para el encabezado: sin la forma societaria final (S.A., CIA. LTDA., etc.).
function shortName(name: string): string {
  const s = name
    .replace(/\s+(S\.?\s?A\.?(\s?S\.?)?|C\.?\s?LTDA\.?|CIA\.?\s?LTDA\.?|CIA\.?)\s*$/i, "")
    .trim();
  const words = (s || name).split(/\s+/);
  return words.length > 2 ? words.slice(0, 2).join(" ") : words.join(" ");
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Verde si la empresa supera al comparable, rojo si queda por debajo (mayor es mejor en las cuatro métricas).
function tone(own: number | null, peer: number | null): string {
  if (own === null || peer === null || own === peer) return "";
  return own > peer ? "text-positive font-semibold" : "text-negative font-semibold";
}

// Lista de las empresas comparables de tamaño más cercano (el benchmarking por ratio está en la tabla de ratios).
export default function PeersTab({
  group,
  own,
  ownName,
}: {
  group: PeerGroup | null;
  own: OwnPeerValues;
  ownName: string;
}) {
  if (!group) {
    return (
      <p className="text-sm text-muted">
        No hay suficientes datos de ingresos o actividad para armar un grupo de comparables en este año.
      </p>
    );
  }
  const me = shortName(ownName);
  const cols: { key: keyof OwnPeerValues; label: string; fmtPeer: (v: number | null) => string }[] = [
    { key: "ingresos", label: "Ingresos", fmtPeer: (v) => formatMoney(v) },
    { key: "roe", label: "ROE", fmtPeer: (v) => formatRatioValue("roe", v) },
    { key: "margen", label: "Margen neto", fmtPeer: (v) => formatRatioValue("rent_neta_ventas", v) },
    { key: "liquidez", label: "Liquidez", fmtPeer: (v) => formatRatioValue("liquidez_corriente", v) },
  ];
  const ownFmt: Record<keyof OwnPeerValues, string> = {
    ingresos: formatMoney(own.ingresos),
    roe: formatRatioValue("roe", own.roe),
    margen: formatRatioValue("rent_neta_ventas", own.margen),
    liquidez: formatRatioValue("liquidez_corriente", own.liquidez),
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Empresas comparables</h3>
      <p className="text-sm text-muted">
        Comparada con {group.total.toLocaleString("es-EC")} empresas activas de la {group.levelLabel} (CIIU{" "}
        <span className="font-mono">{group.prefix}</span>). Por ingresos ocupa el puesto{" "}
        <strong className="text-foreground">{group.sizeRank}</strong> de {group.total + 1}. El semáforo y la mediana
        de cada ratio se calculan sobre las {group.benchmark.n.toLocaleString("es-EC")} empresas más cercanas en
        tamaño. Estas son las diez más próximas; el dato de <strong className="text-foreground">{me}</strong> aparece en{" "}
        <span className="text-positive font-semibold">verde</span> si supera al comparable y en{" "}
        <span className="text-negative font-semibold">rojo</span> si queda por debajo.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th rowSpan={2} className="border-b border-border px-4 py-2.5 align-bottom">
                Empresa
              </th>
              {cols.map((c) => (
                <th key={c.key} colSpan={2} className="border-b border-l border-border px-4 py-2 text-center">
                  {c.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
              {cols.map((c) => (
                <FragmentHeads key={c.key} me={me} />
              ))}
            </tr>
          </thead>
          <tbody>
            {group.peers.map((p) => {
              const d = derivedRatios(p.metrics);
              const peerVals: Record<keyof OwnPeerValues, number | null> = {
                ingresos: num(p.metrics.ingresos_ventas),
                roe: num(d.roe),
                margen: num(d.rent_neta_ventas),
                liquidez: num(p.metrics.liquidez_corriente),
              };
              return (
                <tr key={p.expediente} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/empresa/${p.ruc}`} className="hover:text-brand hover:underline">
                      {p.nombre}
                    </Link>
                  </td>
                  {cols.map((c) => (
                    <PairCells
                      key={c.key}
                      peer={c.fmtPeer(peerVals[c.key])}
                      mine={ownFmt[c.key]}
                      cls={tone(own[c.key], peerVals[c.key])}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentHeads({ me }: { me: string }) {
  return (
    <>
      <th className="border-l border-border px-3 py-1.5 text-right font-medium">Comparable</th>
      <th className="max-w-36 whitespace-normal break-words px-3 py-1.5 text-right font-semibold leading-tight text-foreground" title={me}>
        {me}
      </th>
    </>
  );
}

function PairCells({ peer, mine, cls }: { peer: string; mine: string; cls: string }) {
  return (
    <>
      <td className="border-l border-border px-3 py-2.5 text-right tabular-nums">{peer}</td>
      <td className={`px-3 py-2.5 text-right tabular-nums ${cls}`}>{mine}</td>
    </>
  );
}
