import Link from "next/link";
import { getLatestRankingYear, getTopLevelSectors } from "@/lib/db";
import { getTopHome } from "@/lib/queries";
import { getInteresting } from "@/lib/interesting";
import { SIGNALS } from "@/lib/interestingMeta";
import { sentenceCase } from "@/lib/format";
import RankingTable from "@/components/RankingTable";
import InterestingTable from "@/components/InterestingTable";

export const dynamic = "force-dynamic";

const LIMIT = 1000;

const tab = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? "bg-brand text-white" : "border border-border text-muted hover:border-brand hover:text-brand"
  }`;

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; vista?: string }>;
}) {
  const { anio: anioParam, vista } = await searchParams;
  const interesantes = vista === "radar" || vista === "interesantes";
  const latestYear = await getLatestRankingYear();
  const parsed = anioParam ? parseInt(anioParam, 10) : latestYear;
  const anio = interesantes ? latestYear : Number.isFinite(parsed) ? parsed : latestYear;
  const years = Array.from({ length: 10 }, (_, i) => latestYear - i);
  const sectors = await getTopLevelSectors();
  const names = Object.fromEntries(sectors.map((s) => [s.codigo, sentenceCase(s.descripcion)]));

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/ranking" className={tab(!interesantes)}>
        Por ingresos
      </Link>
      <Link href="/ranking?vista=radar" className={tab(interesantes)}>
        Radar Estratégico
      </Link>
    </div>
  );

  if (interesantes) {
    const pool = await getInteresting(latestYear);
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ranking de empresas</h1>
        <div className="mt-4">{header}</div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight">Radar Estratégico</h2>
        <p className="mt-0.5 text-sm font-medium text-brand">Un Watchlist de Empresas con Alto Desempeño</p>
        <p className="mt-3 max-w-3xl text-muted">
          Empresas que vale la pena leer y seguir en el tiempo, elegidas con reglas automáticas sobre la ventana {pool.desde}–
          {pool.anio}. Cada una aparece por una o más señales; toca una señal para ver solo esas empresas y usa las flechas
          para ordenar. No es una recomendación de inversión.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Empresas evaluadas" value={pool.evaluadas.toLocaleString("es-EC")} note={`las 2.000 con más ingresos de ${pool.anio}`} />
          <Stat label="Pasan los controles de calidad" value={pool.elegibles.toLocaleString("es-EC")} note="datos completos en los 5 años, balance NIIF y patrimonio positivo" />
          <Stat label="Con al menos una señal" value={pool.empresas.length.toLocaleString("es-EC")} note="10 % superior en alguna de las seis señales" />
        </div>
        <p className="mt-3 text-xs text-muted">
          Excluidas por los controles: {pool.excluidas.sinCincoAnios.toLocaleString("es-EC")} sin ingresos en los 5 años,{" "}
          {pool.excluidas.sinNiif.toLocaleString("es-EC")} sin balance NIIF, {pool.excluidas.patrimonio.toLocaleString("es-EC")} con patrimonio
          negativo o menor a 10 % del activo, {pool.excluidas.inactivaOParcial.toLocaleString("es-EC")} inactivas o con datos parciales y{" "}
          {pool.excluidas.holding.toLocaleString("es-EC")} holdings.
        </p>
        <div className="mt-6">
          <InterestingTable rows={pool.empresas} sectors={names} counts={pool.porSenal} />
        </div>
        <details className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <summary className="cursor-pointer font-medium text-foreground">Cómo se eligen</summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            {SIGNALS.map((s) => (
              <li key={s.id}>
                <strong className="text-foreground">{s.label}:</strong> {s.desc}
              </li>
            ))}
            <li>
              Controles: ingresos positivos los 5 años, balance NIIF en {pool.anio}, patrimonio positivo y de al menos 10 % del
              activo, empresa activa, sin holdings puros y sin datos parciales.
            </li>
            <li>
              Límites: exigir 5 años de datos excluye a empresas nuevas; el filtro por ingresos favorece a ciertos sectores; los
              cambios extremos suelen revertirse; el EBITDA es aproximado. Ver la{" "}
              <Link href="/acerca" className="text-brand hover:underline">
                metodología
              </Link>
              .
            </li>
          </ul>
        </details>
      </div>
    );
  }

  const rows = await getTopHome(anio, LIMIT);
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ranking de empresas</h1>
          <div className="mt-4">{header}</div>
          <p className="mt-5 max-w-2xl text-muted">
            Las {LIMIT.toLocaleString("es-EC")} empresas con más ingresos operacionales — {anio}. Usa las flechas
            de cada columna para ordenar de mayor a menor o de menor a mayor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/ranking?anio=${y}`}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                y === anio ? "bg-brand text-white" : "border border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <RankingTable rows={rows} sectors={names} />
      </div>
      <p className="mt-4 text-xs text-muted">
        El puesto se calcula por ingresos operacionales (ventas y servicios). La posición general que publica la
        Superintendencia usa otra base y puede diferir; la verás en el perfil de cada empresa.
      </p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-2xl font-semibold tabular-nums text-brand">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xs text-muted">{note}</div>
    </div>
  );
}
