import type { Metadata } from "next";
import AtmMachine from "@/components/eggs/AtmMachine";

export const metadata: Metadata = {
  title: "1999: cronología de la crisis · Ecuador Financiero",
  robots: { index: false, follow: false },
};

const BCE = "https://contenido.bce.fin.ec/documentos/PublicacionesNotas/Catalogo/Memoria";
type Src = { label: string; href: string };
const S_II: Src = { label: "BCE, Memoria 1999, cap. II", href: `${BCE}/1999/cap2.pdf` };
const S_IV: Src = { label: "BCE, Memoria 1999, cap. IV", href: `${BCE}/1999/cap4.PDF` };
const S_00: Src = { label: "BCE, Memoria 2000, primera parte", href: `${BCE}/2000/1raparte.pdf` };

const TIMELINE: { fecha: string; texto: string; src: Src }[] = [
  {
    fecha: "1998",
    texto:
      "El Banco Central señala que en 1998 el fenómeno de El Niño afectó a la agricultura, cayeron los precios del petróleo y la crisis financiera internacional cerró las líneas de crédito externo. Esto elevó la cartera vencida de los bancos.",
    src: S_IV,
  },
  {
    fecha: "Diciembre de 1998",
    texto: "Punto de partida: la inflación anual era de 43,4 % y el desempleo, de 11,5 %.",
    src: S_II,
  },
  {
    fecha: "12 de febrero de 1999",
    texto:
      "Tras defender la banda cambiaria con reservas internacionales, el Banco Central adopta un esquema de flotación del tipo de cambio para evitar un mayor drenaje de reservas.",
    src: S_IV,
  },
  {
    fecha: "19 de febrero y 1 de marzo de 1999",
    texto: "El tipo de cambio pasa de S/. 7.755 por dólar (19 de febrero) a S/. 9.372 (1 de marzo).",
    src: S_IV,
  },
  {
    fecha: "8 al 12 de marzo de 1999",
    texto: "La Junta Bancaria decreta un feriado bancario, ante la posibilidad de una crisis bancaria sistémica.",
    src: S_IV,
  },
  {
    fecha: "11 de marzo de 1999",
    texto:
      "El Decreto Ejecutivo No. 685 declara en estado de movilización a las instituciones financieras y reprograma los depósitos: se congela el 50 % de la mayoría de los depósitos y cuentas de ahorro en sucres y el 100 % de las cuentas corrientes en dólares; los depósitos a plazo, hasta un año desde su vencimiento. Los créditos bancarios se extienden por un año. Las condiciones y montos mínimos detallados constan en el decreto.",
    src: S_IV,
  },
  {
    fecha: "26 de marzo al 19 de julio de 1999",
    texto:
      "Descongelamiento gradual por decretos: el 748 (26 de marzo) libera ahorros en sucres para vivienda; el 770 (1 de abril) reduce plazos; el 824 (22 de abril) libera los depósitos de cooperativas y de mayores de 65 años; el 1049 (5 de julio) trata fondos y fideicomisos; el 1089 (19 de julio) fija un cronograma de devolución parcial que terminó el 27 de octubre de 1999.",
    src: S_IV,
  },
  {
    fecha: "Durante 1999",
    texto:
      "Las autoridades intervienen ocho entidades financieras, entre ellas Filanbanco, el mayor banco del país por activos, y el Banco del Progreso, el segundo.",
    src: S_IV,
  },
  {
    fecha: "Diciembre de 1999",
    texto: "La inflación anual llega a 60,7 % y el desempleo, a 15,1 %.",
    src: S_II,
  },
  {
    fecha: "10 de enero de 2000",
    texto:
      "El presidente Jamil Mahuad da a conocer la decisión de adoptar la dolarización. El Banco Central fija la cotización en 25.000 sucres por dólar.",
    src: S_00,
  },
  {
    fecha: "13 de marzo de 2000",
    texto:
      "El Congreso Nacional expide la Ley para la Transformación Económica del Ecuador (Ley 2000-4, «Trole I»): plena circulación de divisas, canje a 25.000 sucres por dólar fijos e inalterables y prohibición de emitir sucres, salvo moneda fraccionaria.",
    src: S_00,
  },
  {
    fecha: "13 de septiembre de 2000",
    texto: "Empieza a circular la moneda metálica fraccionaria, equivalente a fracciones de dólar calculadas a 25.000 sucres.",
    src: S_00,
  },
];

const FIGURES: { big: string; small: string }[] = [
  { big: "43,4 % → 60,7 %", small: "inflación anual, diciembre de 1998 a diciembre de 1999" },
  { big: "11,5 % → 15,1 %", small: "desempleo, diciembre de 1998 a diciembre de 1999" },
  { big: "−9,7 %", small: "consumo de los hogares en 1999" },
  { big: "−35,5 %", small: "inversión en 1999 (la privada cayó 38,5 %)" },
];

export default function Crisis1999Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Cronología</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">1999: la crisis financiera</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Una cronología de los hechos, basada en las Memorias del Banco Central del Ecuador. Solo datos; cada uno lleva su fuente.
      </p>

      <div className="mt-8">
        <AtmMachine />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Línea de tiempo</h2>
        <ol className="mt-5 border-l-2 border-border">
          {TIMELINE.map((e) => (
            <li key={e.fecha + e.texto.slice(0, 12)} className="relative pb-6 pl-6 last:pb-0">
              <span aria-hidden className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-brand" />
              <p className="text-sm font-semibold text-brand">{e.fecha}</p>
              <p className="mt-1 text-[15px] leading-relaxed">{e.texto}</p>
              <a href={e.src.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-muted underline hover:text-brand">
                {e.src.label}
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">
          Sobre las causas, el Banco Central atribuye las dificultades de liquidez de los bancos a una administración bancaria inadecuada y a una
          supervisión débil, y menciona acciones dolosas de algunos administradores de bancos y financieras ({S_II.label} y {S_IV.label}).
          Las fechas son las que registran las Memorias del Banco Central; otras publicaciones pueden diferir en un día (por ejemplo, el anuncio de la
          dolarización figura el 9 de enero en varias fuentes).
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Las cifras de 1999</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FIGURES.map((f) => (
            <div key={f.small} className="rounded-xl border border-border bg-surface px-4 py-3">
              <b className="block text-2xl tabular-nums">{f.big}</b>
              <span className="text-[13px] text-muted">{f.small}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Fuente: <a href={S_II.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">{S_II.label}</a>. Según el Banco Mundial, el PIB por
          habitante bajó de US$ 2.284 (1998) a US$ 1.575 (1999) y US$ 1.382 (2000), y las remesas subieron de US$ 799 millones (1998) a US$ 1.090 millones (1999) y
          US$ 1.322 millones (2000) (
          <a href="https://data.worldbank.org/country/ecuador" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">Banco Mundial</a>).
        </p>
      </section>

      <div className="mt-12 rounded-2xl border border-border bg-surface px-6 py-8 text-center">
        <p className="text-lg font-medium leading-relaxed sm:text-xl">Detrás de estas cifras hay millones de personas.</p>
        <p className="mt-1 text-xl font-semibold text-brand sm:text-2xl">Ojalá esto no se repita nunca más.</p>
      </div>

      <p className="mt-8 border-t border-border pt-4 text-xs text-muted">
        Fuentes oficiales: Banco Central del Ecuador,{" "}
        <a href={S_II.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">Memoria 1999, cap. II</a>,{" "}
        <a href={S_IV.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">Memoria 1999, cap. IV</a> y{" "}
        <a href={S_00.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">Memoria 2000, primera parte</a>. Esta página es informativa.
      </p>
    </div>
  );
}
