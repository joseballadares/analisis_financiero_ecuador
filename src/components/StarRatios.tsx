import type { RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatRatioValue, formatPercent } from "@/lib/format";
import { FLAG_HELP, FLAG_LABEL, ratioInfo } from "@/lib/ratioMeta";
import Sparkline from "@/components/Sparkline";
import Semaforo from "@/components/Semaforo";

const STAR_KEYS = [
  "margen_ebitda",
  "fcf",
  "per_med_cobranza",
  "dio",
  "per_med_pago",
  "ccc",
  "roic",
  "liquidez_corriente",
  "deuda_neta_ebitda",
  "roa",
  "roe",
  "rot_ventas",
];

const HELP: Record<string, string> = {
  margen_ebitda: "Rentabilidad operativa antes de intereses, impuestos, depreciación y amortización.",
  fcf: "¿Cuánto efectivo genera el negocio después de las inversiones necesarias?",
  per_med_cobranza: "¿Cuántos días tarda en convertir sus ventas en efectivo?",
  dio: "¿Cuántos días permanece el inventario antes de venderse?",
  per_med_pago: "¿Cuántos días tarda en pagar a sus proveedores?",
  ccc: "Tiempo que el capital queda atrapado en la operación: DSO + DIO − DPO.",
  roic: "¿Genera retornos sobre el capital invertido (deuda + patrimonio − efectivo)?",
  liquidez_corriente: "Capacidad de cubrir las obligaciones de corto plazo.",
  deuda_neta_ebitda: "Años de EBITDA que tomaría pagar la deuda neta. Negativo = más efectivo que deuda.",
  roa: "Utilidad neta por cada dólar de activos.",
  roe: "Utilidad neta por cada dólar de patrimonio.",
  rot_ventas: "Ingresos que genera cada dólar de activos.",
};

const DUPONT = [
  {
    key: "dp_carga_fiscal",
    nombre: "Carga fiscal y laboral",
    formula: "Utilidad neta ÷ Utilidad antes de impuestos",
    help: "Qué parte de la utilidad antes de impuestos se queda tras impuesto a la renta.",
    pct: false,
  },
  {
    key: "dp_carga_financiera",
    nombre: "Carga financiera",
    formula: "Utilidad antes de impuestos ÷ EBIT",
    help: "Cuánto del resultado operativo absorben los intereses y otros gastos financieros.",
    pct: false,
  },
  {
    key: "dp_margen_ebit",
    nombre: "Margen EBIT",
    formula: "EBIT ÷ Ingresos",
    help: "Rentabilidad operativa: cuánto queda de cada dólar vendido.",
    pct: true,
  },
  {
    key: "dp_rotacion",
    nombre: "Rotación de activos",
    formula: "Ingresos ÷ Activos",
    help: "Eficiencia: ingresos que genera cada dólar de activos.",
    pct: false,
  },
  {
    key: "dp_apalancamiento",
    nombre: "Apalancamiento",
    formula: "Activos ÷ Patrimonio",
    help: "Cuánto de los activos se financia con deuda y no con patrimonio.",
    pct: false,
  },
];

function fmtFactor(v: number | null | undefined, pct: boolean) {
  if (typeof v !== "number") return "—";
  return pct ? formatPercent(v, 1) : `${new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v)}×`;
}

export default function StarRatios({
  years,
  byYear,
  dist,
}: {
  years: number[];
  byYear: Record<number, YearRatios>;
  dist: Record<string, RatioDist>;
}) {
  const current = years[years.length - 1];
  const cur = byYear[current];
  const seriesOf = (k: string) =>
    years.map((y) => {
      const v = byYear[y]?.values[k];
      return typeof v === "number" ? v : null;
    });
  const roe = cur?.values.roe;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold">Ratios estrella — {current}</h3>
        <p className="mt-1 text-sm text-muted">
          Los indicadores que todo financiero debería tener en el radar. Un KPI aislado puede engañar: léelos
          en conjunto (por ejemplo, un EBITDA que sube con un flujo de caja que cae es una señal de alerta).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAR_KEYS.map((k) => {
            const info = ratioInfo(k);
            if (!info) return null;
            const v = cur?.values[k];
            const flag = cur?.flags[k];
            return (
              <div key={k} className="rounded-xl border border-border bg-surface p-4" title={info.formula}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium leading-snug">{info.nombre}</div>
                  {flag && (
                    <span
                      className="shrink-0 rounded border border-border px-1 text-[10px] uppercase tracking-wide text-muted"
                      title={FLAG_HELP[flag]}
                    >
                      {flag === "aprox_bajo" ? "⚠ " : ""}
                      {FLAG_LABEL[flag]}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold tabular-nums">{formatRatioValue(k, typeof v === "number" ? v : null, 1)}</div>
                  <Sparkline values={seriesOf(k)} width={96} height={28} title={`${info.nombre}: ${years[0]}–${current}`} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs leading-snug text-muted">{HELP[k]}</p>
                  <div className="shrink-0">
                    <Semaforo ratioKey={k} dist={dist[k]} dir={info.direction} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          La barra del semáforo muestra la posición de la empresa entre sus pares (percentil); la marca central es
          la mediana. Verde: zona favorable; ámbar: intermedia; rojo: desfavorable. Pasa el cursor para ver los
          valores.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold">ROE en formato DuPont</h3>
        <p className="mt-1 text-sm text-muted">
          El ROE se descompone en cinco factores: cuánto retiene tras impuestos, cuánto pagan los intereses, qué tan
          rentable es la operación, qué tan eficiente es el uso de activos y cuánto se financia con deuda.
        </p>
        {typeof cur?.values.dp_carga_fiscal === "number" ? (
          <div className="mt-4 flex flex-wrap items-stretch gap-1.5">
            {DUPONT.map((f, i) => (
              <div key={f.key} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-lg text-muted">×</span>}
                <div className="w-[9.25rem] rounded-xl border border-border bg-surface p-3" title={f.formula}>
                  <div className="text-xs font-medium leading-snug">{f.nombre}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-lg font-semibold tabular-nums">{fmtFactor(cur.values[f.key], f.pct)}</span>
                    <Sparkline values={seriesOf(f.key)} width={44} height={20} title={f.nombre} />
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-muted">{f.help}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="text-lg text-muted">=</span>
              <div className="w-32 rounded-xl border border-brand bg-brand-soft p-3">
                <div className="text-xs font-medium">ROE</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{typeof roe === "number" ? formatPercent(roe, 1) : "—"}</div>
                <div className="mt-1 text-[11px] text-muted">Utilidad neta ÷ Patrimonio</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm text-muted">
            El desglose DuPont solo se calcula cuando la utilidad antes de impuestos, el EBIT y el patrimonio son
            positivos. En {current} no se cumple alguna de esas condiciones.
          </p>
        )}
      </div>

      <details className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <summary className="cursor-pointer font-medium text-foreground">Metodología de los ratios estrella</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">EBITDA (aproximado):</strong> utilidad operacional (ingresos − costo de
            ventas − gastos de administración y ventas) + depreciación + amortización. La Superintendencia reporta la
            depreciación y amortización de forma incompleta en muchas empresas, por lo que el EBITDA puede estar
            subestimado; se marca con ⚠ cuando esos valores son nulos o muy bajos frente al activo fijo.
          </li>
          <li>
            <strong className="text-foreground">Flujo de caja libre (estimado):</strong> utilidad neta − variación del
            capital de trabajo operativo (cuentas por cobrar comerciales y relacionadas + inventarios − cuentas por
            pagar comerciales y relacionadas) − variación de activos fijos e intangibles netos (propiedad, planta y
            equipo, propiedades de inversión, activos biológicos e intangibles). Equivale a utilidad + depreciación −
            Δ capital de trabajo − CAPEX, con CAPEX = Δ activo fijo neto + depreciación; la depreciación se cancela, por
            lo que no depende del dato incompleto. Ignora ventas de activos, revaluaciones, impuestos diferidos y
            otras partidas no monetarias; requiere balances NIIF de dos años seguidos.
          </li>
          <li>
            <strong className="text-foreground">Deuda financiera:</strong> suma de los pasivos financieros del balance
            NIIF (obligaciones con instituciones financieras, valores emitidos, arrendamientos y otros pasivos
            financieros, corrientes y no corrientes). Deuda neta = deuda financiera − efectivo y equivalentes.
          </li>
          <li>
            <strong className="text-foreground">ROIC:</strong> utilidad operacional × (1 − 25%) ÷ (deuda financiera +
            patrimonio − efectivo). Usa la tasa de impuesto a la renta general como aproximación.
          </li>
          <li>
            <strong className="text-foreground">Días de cobro (DSO):</strong> 365 ÷ rotación de cartera de la
            Superintendencia, sobre ventas totales (no se distinguen las ventas a crédito).{" "}
            <strong className="text-foreground">Días de inventario (DIO):</strong> inventarios ÷ costo de ventas × 365.{" "}
            <strong className="text-foreground">Días de pago (DPO):</strong> cuentas y documentos por pagar ÷ costo de
            ventas × 365, porque la fuente no informa las compras. <strong className="text-foreground">CCC:</strong>{" "}
            DSO + DIO − DPO.
          </li>
          <li>
            <strong className="text-foreground">Alcance:</strong> los ratios que usan el balance detallado (EBITDA con
            deuda, ROIC, DIO, DPO, CCC, flujo de caja) existen desde los años con balance NIIF (mayormente 2022 en
            adelante). Los años anteriores solo muestran los ratios básicos.
          </li>
          <li>
            <strong className="text-foreground">Semáforo:</strong> percentil de la empresa entre hasta 500 empresas
            activas comparables (misma actividad y tamaño cercano). Para los ratios donde no hay una dirección claramente
            mejor (por ejemplo, el apalancamiento financiero) la barra es gris.
          </li>
        </ul>
      </details>
    </div>
  );
}
