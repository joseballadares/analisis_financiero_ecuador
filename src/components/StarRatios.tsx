import type { RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatRatioValue, formatPercent } from "@/lib/format";
import { FLAG_HELP, FLAG_LABEL, ratioInfo } from "@/lib/ratioMeta";
import Sparkline from "@/components/Sparkline";
import Semaforo from "@/components/Semaforo";
import { trendTone } from "@/lib/trend";

const STAR_KEYS = [
  "margen_ebitda",
  "fcf",
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

type TNode = {
  key: string;
  nombre: string;
  formula: string;
  kind: "pct" | "x";
  children?: TNode[];
};

// ROE = ROA x Apalancamiento; ROA = Margen neto x Rotación; Margen neto = Carga fiscal x Carga financiera x Margen EBIT.
const TREE: TNode = {
  key: "roe",
  nombre: "ROE",
  formula: "ROA × Apalancamiento",
  kind: "pct",
  children: [
    {
      key: "roa",
      nombre: "ROA",
      formula: "Margen neto × Rotación de activos",
      kind: "pct",
      children: [
        {
          key: "rent_neta_ventas",
          nombre: "Margen neto",
          formula: "Carga fiscal × Carga financiera × Margen EBIT",
          kind: "pct",
          children: [
            { key: "dp_carga_fiscal", nombre: "Carga fiscal y laboral", formula: "Utilidad neta ÷ Utilidad antes de impuestos", kind: "x" },
            { key: "dp_carga_financiera", nombre: "Carga financiera", formula: "Utilidad antes de impuestos ÷ EBIT", kind: "x" },
            { key: "dp_margen_ebit", nombre: "Margen EBIT", formula: "EBIT ÷ Ingresos", kind: "pct" },
          ],
        },
        { key: "dp_rotacion", nombre: "Rotación de activos", formula: "Ingresos ÷ Activos", kind: "x" },
      ],
    },
    { key: "dp_apalancamiento", nombre: "Apalancamiento", formula: "Activos ÷ Patrimonio", kind: "x" },
  ],
};

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
                      className="shrink-0 rounded border border-border px-1 text-[11px] uppercase tracking-wide text-muted"
                      title={FLAG_HELP[flag]}
                    >
                      {flag === "aprox_bajo" ? "⚠ " : ""}
                      {FLAG_LABEL[flag]}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold tabular-nums">{formatRatioValue(k, typeof v === "number" ? v : null, 1)}</div>
                  <Sparkline values={seriesOf(k)} width={96} height={28} tone={trendTone(seriesOf(k), info.direction)} title={`${info.nombre}: ${years[0]}–${current}`} />
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

      <CycleFormula years={years} byYear={byYear} dist={dist} />

      <div>
        <h3 className="text-lg font-semibold">ROE en formato DuPont</h3>
        <p className="mt-1 text-sm text-muted">
          La pirámide descompone el ROE: arriba el resultado, abajo los factores que lo producen. Cada nivel se
          obtiene multiplicando los cuadros que están debajo de él.
        </p>
        {typeof cur?.values.dp_carga_fiscal === "number" ? (
          <>
            <div className="mt-5 overflow-x-auto pb-2">
              <div className="dtree mx-auto w-max min-w-full">
                <ul>
                  <DuPontNode node={TREE} values={cur.values} seriesOf={seriesOf} />
                </ul>
              </div>
            </div>
            <ul className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">
              <li>
                <strong className="text-foreground">Margen (rentabilidad):</strong> cuánto queda de cada dólar vendido,
                tras costos, intereses e impuestos.
              </li>
              <li>
                <strong className="text-foreground">Rotación (eficiencia):</strong> ingresos que genera cada dólar de
                activos.
              </li>
              <li>
                <strong className="text-foreground">Apalancamiento (financiamiento):</strong> cuánto de los activos se
                financia con deuda y no con patrimonio.
              </li>
            </ul>
          </>
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

function DuPontNode({
  node,
  values,
  seriesOf,
}: {
  node: TNode;
  values: Record<string, number | null>;
  seriesOf: (k: string) => (number | null)[];
}) {
  const v = values[node.key];
  const isTop = node.key === "roe";
  const hasChildren = !!node.children?.length;
  return (
    <li>
      <div
        className={`mx-auto w-40 rounded-xl border p-3 text-left ${
          isTop ? "border-brand bg-brand-soft" : hasChildren ? "border-brand/60 bg-surface" : "border-border bg-surface"
        }`}
        title={`${node.nombre} = ${node.formula}`}
      >
        <div className="text-xs font-medium leading-snug">{node.nombre}</div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className={`font-semibold tabular-nums ${isTop ? "text-2xl" : "text-lg"}`}>
            {fmtFactor(v, node.kind === "pct")}
          </span>
          <Sparkline values={seriesOf(node.key)} width={44} height={20} title={node.nombre} />
        </div>
        <div className="mt-1 text-[11px] leading-snug text-muted">= {node.formula}</div>
      </div>
      {hasChildren && (
        <ul>
          {node.children!.map((c) => (
            <DuPontNode key={c.key} node={c} values={values} seriesOf={seriesOf} />
          ))}
        </ul>
      )}
    </li>
  );
}

const CYCLE = [
  { key: "per_med_cobranza", help: "Días que tarda en cobrar a sus clientes." },
  { key: "dio", help: "Días que el inventario espera antes de venderse." },
  { key: "per_med_pago", help: "Días que tarda en pagar a sus proveedores." },
];

// Ciclo de conversión de efectivo como fórmula: DSO + DIO - DPO = CCC.
function CycleFormula({
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
  const any = ["per_med_cobranza", "dio", "per_med_pago", "ccc"].some((k) => typeof cur?.values[k] === "number");
  if (!any) return null;
  const ccc = cur?.values.ccc;
  const nf = (v: number) => new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(v);
  const tile = (key: string, help: string, big = false) => {
    const info = ratioInfo(key)!;
    const v = cur?.values[key];
    return (
      <div
        className={`min-w-[10rem] flex-1 rounded-xl border p-3 ${big ? "border-brand bg-brand-soft sm:flex-[1.25]" : "border-border bg-surface"}`}
        title={info.formula}
      >
        <div className="text-xs font-medium leading-snug">{info.nombre}</div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className={`whitespace-nowrap font-semibold tabular-nums ${big ? "text-2xl" : "text-lg"}`}>
            {formatRatioValue(key, typeof v === "number" ? v : null, 1)}
          </span>
          <Sparkline values={seriesOf(key)} width={48} height={20} tone={trendTone(seriesOf(key), info.direction)} title={info.nombre} />
        </div>
        <div className="mt-1 text-[11.5px] leading-snug text-muted">{help}</div>
        <div className="mt-2">
          <Semaforo ratioKey={key} dist={dist[key]} dir={info.direction} width={72} />
        </div>
      </div>
    );
  };
  return (
    <div>
      <h3 className="text-lg font-semibold">Ciclo de conversión de efectivo (CCC)</h3>
      <p className="mt-1 text-sm text-muted">
        Cuánto tiempo permanece el capital atrapado en la operación: lo que se tarda en cobrar y en vender el inventario,
        menos lo que se tarda en pagar a los proveedores.
      </p>
      <div className="mt-4 flex flex-wrap items-stretch gap-2">
        {tile("per_med_cobranza", CYCLE[0].help)}
        <span className="self-center text-xl text-muted">+</span>
        {tile("dio", CYCLE[1].help)}
        <span className="self-center text-xl text-muted">−</span>
        {tile("per_med_pago", CYCLE[2].help)}
        <span className="self-center text-xl text-muted">=</span>
        {tile("ccc", "Días de capital atrapado en la operación", true)}
      </div>
      {typeof ccc === "number" && (
        <p className="mt-3 text-sm text-muted">
          {ccc >= 0
            ? `La empresa necesita financiar ${nf(ccc)} días de operación con capital propio o deuda. Menos días es mejor.`
            : `Los proveedores financian ${nf(Math.abs(ccc))} días de la operación: la empresa cobra y vende antes de pagar.`}
        </p>
      )}
    </div>
  );
}
