import type { ReactElement, ReactNode } from "react";
import { Page, View } from "@react-pdf/renderer";
import { COLOR, FONT, S, T } from "@/lib/report/theme";
import type { Ctx } from "@/lib/report/model";
import {
  DistCurve,
  DupontTree,
  EquationBars,
  GRADE_HEX,
  LinePanel,
  BarMeter,
  PDF_EVENTS,
  ScoreScale,
  gradeOfScore,
  type TreeBox,
} from "@/lib/report/pdfCharts";
import * as N from "@/lib/report/narrative";
import { formatCompactMoney, formatMoney, formatNumber, formatPercent, segmentName, sentenceCase, titleCase } from "@/lib/format";
import { derivedRatios } from "@/lib/derived";
import { isNum } from "@/lib/chartMath";
import { ratioInfo } from "@/lib/ratioMeta";
import { DIRECTION } from "@/lib/star";

const W = 515; // ancho útil de página (A4 menos márgenes)

// ───────────────────────── piezas comunes ─────────────────────────

function Header({ c }: { c: Ctx }) {
  return (
    <View fixed style={{ position: "absolute", top: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.75, borderBottomColor: COLOR.rule, paddingBottom: 5 }}>
      <T style={{ fontFamily: FONT.sansBold, fontSize: 7.5, color: COLOR.blue, letterSpacing: 0.8 }}>ECUADOR FINANCIERO · INFORME PROFESIONAL</T>
      <T style={{ fontSize: 7.5, color: COLOR.muted }}>{`${c.pretty} · Ejercicio ${c.year}`}</T>
    </View>
  );
}

function Footer({ c }: { c: Ctx }) {
  return (
    <View fixed style={{ position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.75, borderTopColor: COLOR.rule, paddingTop: 5 }}>
      <T style={{ fontSize: 6.5, color: COLOR.muted }}>{`Fuente: Superintendencia de Compañías, Valores y Seguros (SCVS); cálculos de Ecuador Financiero · ${c.version} · ${c.issued}`}</T>
      <T style={{ fontSize: 7, color: COLOR.muted }} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function Sheet({ c, kicker, title, lead, children }: { c: Ctx; kicker: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <Page size="A4" style={S.page}>
      <Header c={c} />
      <T style={S.kicker}>{kicker}</T>
      <T style={S.h1}>{title}</T>
      {lead && <T style={S.lead}>{lead}</T>}
      {children}
      <Footer c={c} />
    </Page>
  );
}

function Fig({ n, title, children, source, width }: { n: string; title: string; children: ReactNode; source?: string; width?: number }) {
  return (
    <View style={{ width, marginTop: 8 }} wrap={false}>
      <T style={S.caption}>{`${n}. ${title}`}</T>
      {children}
      <T style={S.source}>{source ?? "Fuente: SCVS; cálculos de Ecuador Financiero."}</T>
    </View>
  );
}

const Note = ({ children }: { children: string }) => <T style={{ ...S.small, marginTop: 4 }}>{children}</T>;

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: "row", marginTop: 3 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 3.5, marginRight: 5 }} />
          <T style={{ flex: 1, fontSize: 8, lineHeight: 1.35 }}>{t}</T>
        </View>
      ))}
    </View>
  );
}

// ───────────────────────── portada ─────────────────────────

export function CoverPage({ c }: { c: Ctx }) {
  const b = c.b;
  const rows: [string, string][] = [
    ["RUC", b.company.ruc ?? "—"],
    ["Tipo de compañía", b.company.tipo?.trim() || "—"],
    ["Provincia", titleCase(b.company.provincia?.trim())],
    ["Actividad principal", b.current.ciiu_n6 ? `${b.current.ciiu_n6}${b.ciiuDesc ? " · " + sentenceCase(b.ciiuDesc) : ""}` : "—"],
    ["Tamaño (Superintendencia)", segmentName(b.current.cod_segmento)],
    ["Ejercicio analizado", `${c.year} (historial desde ${c.years[0] ?? c.year})`],
  ];
  return (
    <Page size="A4" style={{ fontFamily: FONT.sans, color: COLOR.ink }}>
      <View style={{ backgroundColor: COLOR.blue, height: 150, paddingHorizontal: 48, paddingTop: 48 }}>
        <T style={{ color: COLOR.white, fontFamily: FONT.sansBold, fontSize: 11, letterSpacing: 2 }}>ECUADOR FINANCIERO</T>
        <T style={{ color: "#cfe0fa", fontSize: 8.5, marginTop: 4 }}>Análisis financiero de empresas del Ecuador</T>
      </View>
      <View style={{ paddingHorizontal: 48, marginTop: 70 }}>
        <T style={{ fontSize: 9, letterSpacing: 1.5, color: COLOR.blue, fontFamily: FONT.sansBold }}>INFORME PROFESIONAL</T>
        <T style={{ fontFamily: FONT.serifBold, fontSize: 30, lineHeight: 1.15, marginTop: 8 }}>{c.name}</T>
        <View style={{ height: 3, width: 60, backgroundColor: COLOR.blue, marginTop: 14 }} />
        <T style={{ fontFamily: FONT.serif, fontSize: 13, color: COLOR.muted, marginTop: 14 }}>
          {`Estados financieros ${c.years[0] ?? c.year}–${c.year}, razones financieras, comparación sectorial y capacidad de pago`}
        </T>
        <View style={{ marginTop: 44, borderTopWidth: 0.75, borderTopColor: COLOR.rule }}>
          {rows.map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: COLOR.rule }}>
              <T style={{ width: 150, fontSize: 8, color: COLOR.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</T>
              <T style={{ flex: 1, fontSize: 9.5 }}>{v}</T>
            </View>
          ))}
        </View>
      </View>
      <View style={{ position: "absolute", bottom: 48, left: 48, right: 48 }}>
        <View style={{ borderTopWidth: 0.75, borderTopColor: COLOR.rule, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <T style={{ fontSize: 8, fontFamily: FONT.sansBold }}>Elaborado por Ecuador Financiero</T>
            <T style={{ fontSize: 7.5, color: COLOR.muted, marginTop: 2 }}>{`Fecha de emisión: ${c.issued} · Versión del sitio ${c.version}`}</T>
          </View>
          <T style={{ fontSize: 7.5, color: COLOR.muted, textAlign: "right", maxWidth: 240 }}>
            Datos públicos de la Superintendencia de Compañías, Valores y Seguros. Análisis automatizado; no constituye auditoría.
          </T>
        </View>
      </View>
    </Page>
  );
}

// ───────────────────────── contenido y bases de preparación ─────────────────────────

export type TocEntry = { n: string; label: string; page: number };

export function ContentsPage({ c, toc }: { c: Ctx; toc: TocEntry[] }) {
  const sri = c.b.sriYears.filter((y) => y >= c.years[0] && y <= c.year);
  return (
    <Sheet c={c} kicker="Contenido" title="Contenido y bases de preparación">
      <View style={{ marginTop: 8 }}>
        {toc.map((e) => (
          <View key={e.n} style={{ flexDirection: "row", alignItems: "flex-end", paddingVertical: 3.5 }}>
            <T style={{ width: 22, fontFamily: FONT.sansBold, color: COLOR.blue, fontSize: 9 }}>{e.n}</T>
            <T style={{ fontSize: 9.5 }}>{e.label}</T>
            <View style={{ flex: 1, borderBottomWidth: 0.75, borderBottomColor: COLOR.rule, borderStyle: "dotted", marginHorizontal: 5, marginBottom: 3 }} />
            <T style={{ fontSize: 9.5, color: COLOR.muted }}>{String(e.page)}</T>
          </View>
        ))}
      </View>

      <T style={S.h2}>Naturaleza y alcance del informe</T>
      <T style={S.para}>
        Este informe presenta, de forma automatizada, los estados financieros que la compañía entregó a la Superintendencia de Compañías,
        Valores y Seguros (SCVS) y los analiza mediante razones financieras, comparación con empresas similares y reglas de riesgo. No es una
        auditoría ni una opinión sobre la razonabilidad de los estados financieros: las cifras se reproducen tal como fueron reportadas y los
        cálculos derivados pueden diferir de los que haría la propia compañía.
      </T>

      <T style={S.h2}>Bases de preparación</T>
      <Bullets
        color={COLOR.blue}
        items={[
          "Fuente única: SCVS (registro de compañías, ranking anual con indicadores 2008–2025 y estados financieros línea por línea desde 2019). No se usa información de terceros.",
          "Moneda: dólares de los Estados Unidos, cifras corrientes de cada año, sin ajuste por inflación. Los importes negativos se muestran entre paréntesis.",
          `Marco contable: los años con estados NIIF se presentan línea por línea.${sri.length ? ` Los años ${sri.join(", ")} se presentaron con el formulario tributario del SRI, con otro plan de cuentas, y no pueden alinearse con NIIF; en ellos solo se muestran totales.` : ""}`,
          "Ingresos: corresponden a los ingresos operacionales; no incluyen otros ingresos. Costos y gastos = ingresos menos utilidad neta.",
          "Razones financieras: se recalculan con las cifras exactas de cada empresa, porque la fuente trunca los ratios a dos decimales y en algunos casos los calcula con errores.",
          "Aproximaciones: el EBITDA es aproximado (la depreciación reportada puede estar incompleta) y el flujo de caja libre es una estimación con variaciones del balance. Ambos se marcan como tales.",
          "Comparación: cada razón se compara con las hasta 500 empresas activas (ingresos superiores a US$ 1.000) más cercanas en tamaño dentro de la actividad más específica con al menos 30 empresas.",
          "El estado de flujo de efectivo no puede elaborarse: la SCVS no publica los datos necesarios.",
        ]}
      />

      <T style={S.h2}>Cómo leer las señales</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
        {[
          [COLOR.green, "Verde", "zona favorable frente a los pares"],
          [COLOR.amber, "Ámbar", "zona intermedia"],
          [COLOR.red, "Rojo", "zona desfavorable"],
          [COLOR.blue, "Azul", "la empresa analizada"],
          [COLOR.gray, "Gris", "contexto, sin juicio de valor"],
        ].map(([col, name, txt]) => (
          <View key={name} style={{ flexDirection: "row", alignItems: "flex-start", width: "33%", marginBottom: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col, marginTop: 2.5, marginRight: 4 }} />
            <T style={{ fontSize: 7.5 }}>
              <T style={{ fontFamily: FONT.sansBold }}>{name}</T>
              {`: ${txt}`}
            </T>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

// ───────────────────────── estados financieros ─────────────────────────

const ESF_EXTRA = ["10101", "10102", "10103", "10104", "10105", "10201", "10202", "10203", "10204", "20102", "20103", "20104", "20106", "20201", "20203"];
const ERI_EXTRA = ["40101", "40102", "50201", "50202", "50203", "50204"];

function pickCodes(c: Ctx, kind: "esf" | "eri", max: number): string[] {
  const inStmt = (code: string) => (kind === "esf" ? "123".includes(code[0]) : "4567".includes(code[0]));
  const extra = new Set(kind === "esf" ? ESF_EXTRA : ERI_EXTRA);
  const set = new Set<string>();
  for (const r of c.b.niifRows) for (const [code, v] of Object.entries(r.data)) if (v !== 0 && Number.isFinite(v) && inStmt(code)) set.add(code);
  let codes = [...set].filter((code) => code.length <= 3 || extra.has(code)).sort();
  // Si no caben en una página se retiran primero las cuentas de mayor detalle.
  while (codes.length > max) {
    const deepest = Math.max(...codes.map((x) => x.length));
    if (deepest <= 3) break;
    codes = codes.filter((x) => x.length < deepest);
  }
  return codes.slice(0, max);
}

const accounting = (v: number | undefined | null) => {
  if (v === undefined || v === null || !Number.isFinite(v)) return "—";
  const t = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(Math.abs(v));
  return v < 0 ? `(${t})` : t;
};

function StatementTable({ c, kind, max }: { c: Ctx; kind: "esf" | "eri"; max: number }) {
  const years = c.b.niifRows.map((r) => r.anio).filter((y) => y >= c.years[0] && y <= c.year).sort((a, b) => a - b);
  const byYear = new Map(c.b.niifRows.map((r) => [r.anio, r.data]));
  const codes = pickCodes(c, kind, max);
  const colW = years.length > 6 ? 44 : 50;
  const labelW = W - colW * (years.length + 1);
  const last = years[years.length - 1];
  const prev = years[years.length - 2];
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: COLOR.rule, paddingVertical: 3 }}>
        <T style={{ width: labelW, paddingLeft: 4, fontFamily: FONT.sansBold, fontSize: 7 }}>{kind === "esf" ? "CUENTA (US$)" : "CUENTA (US$)"}</T>
        {years.map((y) => (
          <T key={y} style={{ width: colW, textAlign: "right", fontFamily: FONT.sansBold, fontSize: 7, paddingRight: 3 }}>{String(y)}</T>
        ))}
        <T style={{ width: colW, textAlign: "right", fontFamily: FONT.sansBold, fontSize: 7, paddingRight: 3 }}>{prev ? `Var. ${last}` : ""}</T>
      </View>
      {codes.map((code) => {
        const depth = Math.max(0, Math.floor((code.length - 1) / 2));
        const bold = code.length <= 3;
        const cur = byYear.get(last)?.[code];
        const old = prev ? byYear.get(prev)?.[code] : undefined;
        const varp = isNum(cur as number) && isNum(old as number) && (old as number) > 0 ? (cur as number) / (old as number) - 1 : null;
        return (
          <View key={code} wrap={false} style={{ flexDirection: "row", paddingVertical: 2, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft, borderTopWidth: code.length === 1 ? 0.75 : 0, borderTopColor: COLOR.gray }}>
            <T maxLines={1} style={{ width: labelW, paddingLeft: 4 + depth * 7, paddingRight: 3, fontSize: 7, fontFamily: bold ? FONT.sansBold : FONT.sans }}>{c.b.names[code] ?? code}</T>
            {years.map((y) => (
              <T key={y} style={{ width: colW, textAlign: "right", fontSize: 7, paddingRight: 3, fontFamily: bold ? FONT.sansBold : FONT.sans }}>
                {accounting(byYear.get(y)?.[code])}
              </T>
            ))}
            <T style={{ width: colW, textAlign: "right", fontSize: 6.8, paddingRight: 3, color: varp === null ? COLOR.muted : COLOR.ink }}>
              {varp === null ? "—" : `${varp >= 0 ? "+" : "-"}${formatPercent(Math.abs(varp), 1)}`}
            </T>
          </View>
        );
      })}
    </View>
  );
}

// Cuando no hay detalle NIIF: solo los totales que trae la fuente para cada año.
function SummaryTable({ c }: { c: Ctx }) {
  const rows: [string, (number | null)[]][] = [
    ["Activos", c.met("activos")],
    ["Pasivos", c.met("activos").map((a, i) => (a !== null && c.met("patrimonio")[i] !== null ? a - (c.met("patrimonio")[i] as number) : null))],
    ["Patrimonio", c.met("patrimonio")],
    ["Ingresos operacionales", c.met("ingresos_ventas")],
    ["Utilidad neta", c.met("utilidad_neta")],
  ];
  const colW = 52;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: COLOR.rule, paddingVertical: 3 }}>
        <T style={{ width: W - colW * c.years.length, paddingLeft: 4, fontFamily: FONT.sansBold, fontSize: 7 }}>TOTALES (US$)</T>
        {c.years.map((y) => (
          <T key={y} style={{ width: colW, textAlign: "right", fontFamily: FONT.sansBold, fontSize: 7, paddingRight: 3 }}>{String(y)}</T>
        ))}
      </View>
      {rows.map(([label, vals]) => (
        <View key={label} style={{ flexDirection: "row", paddingVertical: 2.6, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft }}>
          <T style={{ width: W - colW * c.years.length, paddingLeft: 4, fontSize: 7.5, fontFamily: FONT.sansBold }}>{label}</T>
          {vals.map((v, i) => (
            <T key={i} style={{ width: colW, textAlign: "right", fontSize: 7.5, paddingRight: 3 }}>{accounting(v)}</T>
          ))}
        </View>
      ))}
    </View>
  );
}

export function EsfPage({ c }: { c: Ctx }) {
  const has = c.b.niifRows.some((r) => r.anio >= c.years[0]);
  const sri = c.b.sriYears.filter((y) => y >= c.years[0] && y <= c.year);
  return (
    <Sheet c={c} kicker="1 · Estados financieros" title="Estado de situación financiera" lead={N.statementLead(c, "esf")}>
      <Fig n="Tabla 1" title={`Estado de situación financiera comparativo, ${c.years[0]}–${c.year}`}>
        {has ? <StatementTable c={c} kind="esf" max={40} /> : <SummaryTable c={c} />}
      </Fig>
      <Note>
        {`Cifras en dólares de los Estados Unidos; entre paréntesis, importes negativos. La columna "Var." compara ${c.year} con ${c.year - 1}.` +
          (sri.length ? ` Los años ${sri.join(", ")} se presentaron con el formulario del SRI y no se alinean con NIIF.` : "") +
          (has ? "" : " El detalle línea por línea no está disponible para esta empresa; se muestran los totales de la fuente.")}
      </Note>
    </Sheet>
  );
}

export function EriPage({ c }: { c: Ctx }) {
  const has = c.b.niifRows.some((r) => r.anio >= c.years[0]);
  const rat: [string, string][] = [
    ["Margen bruto", "margen_bruto"],
    ["Margen operacional", "margen_operacional"],
    ["Margen neto", "rent_neta_ventas"],
  ];
  return (
    <Sheet c={c} kicker="1 · Estados financieros" title="Estado de resultado integral" lead={N.statementLead(c, "eri")}>
      <Fig n="Tabla 2" title={`Estado de resultado integral comparativo, ${c.years[0]}–${c.year}`}>
        {has ? <StatementTable c={c} kind="eri" max={30} /> : <SummaryTable c={c} />}
      </Fig>
      <Fig n="Tabla 3" title="Márgenes sobre ingresos (calculados con cifras exactas)" width={W}>
        <View style={{ borderTopWidth: 0.75, borderColor: COLOR.rule }}>
          <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, paddingVertical: 3 }}>
            <T style={{ width: W - 50 * c.years.length, paddingLeft: 4, fontFamily: FONT.sansBold, fontSize: 7 }}>MARGEN</T>
            {c.years.map((y) => (
              <T key={y} style={{ width: 50, textAlign: "right", fontFamily: FONT.sansBold, fontSize: 7, paddingRight: 3 }}>{String(y)}</T>
            ))}
          </View>
          {rat.map(([label, key]) => (
            <View key={key} style={{ flexDirection: "row", paddingVertical: 2.6, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft }}>
              <T style={{ width: W - 50 * c.years.length, paddingLeft: 4, fontSize: 7.5 }}>{label}</T>
              {c.val(key).map((v, i) => (
                <T key={i} style={{ width: 50, textAlign: "right", fontSize: 7.5, paddingRight: 3 }}>{v === null ? "—" : formatPercent(v, 1)}</T>
              ))}
            </View>
          ))}
        </View>
      </Fig>
      <Note>
        Los años sin costo de ventas reportado (formulario del SRI) no permiten calcular márgenes y se muestran con guion. Estado de flujo de efectivo: no disponible, la SCVS no publica los movimientos necesarios para elaborarlo.
      </Note>
    </Sheet>
  );
}

// ───────────────────────── notas a los estados financieros ─────────────────────────

export function NotesPage({ c }: { c: Ctx }) {
  const act = c.met("activos");
  const pat = c.met("patrimonio");
  const pas = act.map((a, i) => (a !== null && pat[i] !== null ? a - (pat[i] as number) : null));
  // Variaciones más importantes entre el último año y el anterior (cuentas de hasta 3 dígitos).
  const cur = c.b.niifRows.find((r) => r.anio === c.year)?.data;
  const old = c.b.niifRows.find((r) => r.anio === c.year - 1)?.data;
  const changes =
    cur && old
      ? Object.keys(cur)
          .filter((code) => code.length === 3 && old[code] !== undefined)
          .map((code) => ({ code, a: old[code], b: cur[code], d: cur[code] - old[code] }))
          .filter((x) => x.a !== 0)
          .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
          .slice(0, 6)
      : [];
  const fcf = c.num(c.b.curValues.fcf);
  const ap = c.num(c.b.curValues.dp_apalancamiento);
  return (
    <Sheet
      c={c}
      kicker="1 · Estados financieros"
      title="Notas a los estados financieros"
      lead="Estructura del balance, variaciones significativas y limitaciones de la información. Complementan las tablas 1 y 2."
    >
      <T style={S.h2}>Nota 1 · Estructura del balance</T>
      <T style={S.para}>
        {`El activo se financia con pasivos (${formatCompactMoney(pas[pas.length - 1])} en ${c.year}) y patrimonio (${formatCompactMoney(pat[pat.length - 1])}).` +
          (ap !== null ? ` El apalancamiento (activos ÷ patrimonio) es de ${formatNumber(ap, 2)} veces.` : "")}
      </T>
      <Fig n="Figura 1" title="Activo = pasivo + patrimonio: cómo se financian los activos (US$)">
        <EquationBars categories={c.cats} pasivo={pas} patrimonio={pat} width={W} height={130} />
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          <View style={{ width: 7, height: 7, backgroundColor: COLOR.blueSoft, marginRight: 3, marginTop: 1 }} />
          <T style={{ fontSize: 7, color: COLOR.muted, marginRight: 12 }}>Pasivo</T>
          <View style={{ width: 7, height: 7, backgroundColor: COLOR.blue, marginRight: 3, marginTop: 1 }} />
          <T style={{ fontSize: 7, color: COLOR.muted }}>Patrimonio</T>
        </View>
      </Fig>

      <T style={S.h2}>Nota 2 · Variaciones significativas</T>
      {changes.length ? (
        <View wrap={false}>
          <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: COLOR.rule, paddingVertical: 3 }}>
            <T style={{ flex: 1, paddingLeft: 4, fontFamily: FONT.sansBold, fontSize: 7 }}>CUENTA</T>
            {[`${c.year - 1}`, `${c.year}`, "VARIACIÓN US$", "VAR. %"].map((h) => (
              <T key={h} style={{ width: 70, textAlign: "right", fontFamily: FONT.sansBold, fontSize: 7, paddingRight: 3 }}>{h}</T>
            ))}
          </View>
          {changes.map((x) => (
            <View key={x.code} style={{ flexDirection: "row", paddingVertical: 2.6, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft }}>
              <T style={{ flex: 1, paddingLeft: 4, fontSize: 7.5 }}>{c.b.names[x.code] ?? x.code}</T>
              <T style={{ width: 70, textAlign: "right", fontSize: 7.5, paddingRight: 3 }}>{accounting(x.a)}</T>
              <T style={{ width: 70, textAlign: "right", fontSize: 7.5, paddingRight: 3 }}>{accounting(x.b)}</T>
              <T style={{ width: 70, textAlign: "right", fontSize: 7.5, paddingRight: 3 }}>{accounting(x.d)}</T>
              <T style={{ width: 70, textAlign: "right", fontSize: 7.5, paddingRight: 3 }}>
                {x.a > 0 ? `${x.d >= 0 ? "+" : "-"}${formatPercent(Math.abs(x.d / x.a), 1)}` : "—"}
              </T>
            </View>
          ))}
        </View>
      ) : (
        <T style={S.para}>No hay dos años consecutivos con estados NIIF para calcular variaciones por cuenta.</T>
      )}

      <T style={S.h2}>Nota 3 · Estado de flujo de efectivo</T>
      <T style={S.para}>
        {"La SCVS publica el balance y el estado de resultados, pero no los movimientos de efectivo, por lo que el estado de flujo de efectivo no puede elaborarse. " +
          (fcf !== null
            ? `Como referencia se estima el flujo de caja libre de ${c.year} en ${formatCompactMoney(fcf)}: utilidad neta menos la variación del capital de trabajo operativo y de los activos fijos e intangibles netos. Ignora ventas de activos, revaluaciones y otras partidas no monetarias.`
            : "El flujo de caja libre estimado requiere balances NIIF de dos años consecutivos y no puede calcularse para este ejercicio.")}
      </T>

      <T style={S.h2}>Nota 4 · Calidad y cobertura de los datos</T>
      <Bullets
        color={COLOR.gray}
        items={[
          "Las cifras provienen de lo declarado por la compañía a la SCVS; no han sido verificadas por Ecuador Financiero contra los registros contables de la empresa.",
          "Una validación con la población completa de balances mostró coincidencias de 99,8 % a 99,96 % en activos, patrimonio y utilidad neta entre 2019 y 2024.",
          "Los ingresos son los operacionales. Las diferencias con otras publicaciones suelen deberse a la inclusión de otros ingresos.",
          "Cuando una cifra del último año viene en cero en el ranking pero existe el balance, se toma del balance NIIF.",
        ]}
      />
    </Sheet>
  );
}

// ───────────────────────── resumen ejecutivo ─────────────────────────

function Tile({ label, value, chip, tone }: { label: string; value: string; chip?: string; tone: "blue" | "gray" | "red" }) {
  const col = tone === "blue" ? COLOR.blue : tone === "red" ? COLOR.red : COLOR.gray;
  return (
    <View style={{ width: (W - 25) / 6, borderWidth: 0.75, borderColor: col, borderRadius: 3, padding: 5, backgroundColor: tone === "blue" ? COLOR.blueTint : tone === "red" ? COLOR.redTint : COLOR.soft }}>
      <T style={{ fontSize: 6, fontFamily: FONT.sansBold, color: col, letterSpacing: 0.4 }}>{label.toUpperCase()}</T>
      <T style={{ fontSize: 9, fontFamily: FONT.sansBold, marginTop: 3 }}>{value}</T>
      <T style={{ fontSize: 6.5, color: COLOR.muted, marginTop: 1 }}>{chip ?? " "}</T>
    </View>
  );
}

export function SummaryPage({ c }: { c: Ctx }) {
  const m = c.b.m;
  const act = c.num(m.activos);
  const pat = c.num(m.patrimonio);
  const pas = act !== null && pat !== null ? act - pat : null;
  const ing = c.num(m.ingresos_ventas);
  const uti = c.num(m.utilidad_neta);
  const cost = ing !== null && uti !== null ? ing - uti : null;
  const { strengths, attention } = N.strengthsAndAttention(c);
  const rank = c.b.current.posicion_general;
  const uni = c.b.universe[c.year];
  const seg = c.b.segmentShare;
  const sc = c.b.score;
  return (
    <Sheet c={c} kicker="2 · Análisis" title="Resumen ejecutivo" lead={N.headline(c)}>
      <View style={{ flexDirection: "row", gap: 5, marginTop: 10 }}>
        <Tile label="Activo" value={formatMoney(act)} chip={act ? "100%" : undefined} tone="blue" />
        <Tile label="Pasivo" value={formatMoney(pas)} chip={act && pas !== null ? formatPercent(pas / act, 1) : undefined} tone="gray" />
        <Tile label="Patrimonio" value={formatMoney(pat)} chip={act && pat !== null ? formatPercent(pat / act, 1) : undefined} tone={pat !== null && pat < 0 ? "red" : "blue"} />
        <Tile label="Ingresos" value={formatMoney(ing)} chip={ing ? "100%" : undefined} tone="blue" />
        <Tile label="Costos y gastos" value={formatMoney(cost)} chip={ing && cost !== null ? formatPercent(cost / ing, 1) : undefined} tone="gray" />
        <Tile label={uti !== null && uti < 0 ? "Pérdida neta" : "Utilidad neta"} value={formatMoney(uti)} chip={ing && uti !== null ? `Margen ${formatPercent(uti / ing, 1)}` : undefined} tone={uti !== null && uti < 0 ? "red" : "blue"} />
      </View>
      <Note>Costos y gastos = ingresos menos utilidad neta (incluye costo de ventas, gastos, impuestos y participación de trabajadores, netos de otros ingresos).</Note>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <T style={{ ...S.h2, color: COLOR.green, marginTop: 0 }}>Fortalezas</T>
          <Bullets items={strengths} color={COLOR.green} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ ...S.h2, color: COLOR.red, marginTop: 0 }}>Puntos de atención</T>
          <Bullets items={attention} color={COLOR.red} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
        <View style={{ ...S.card, flex: 1 }} wrap={false}>
          <T style={{ ...S.kicker, color: COLOR.muted }}>Capacidad de pago (orientativa)</T>
          {sc.grado && sc.total !== null ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: GRADE_HEX[sc.grado], alignItems: "center", justifyContent: "center" }}>
                <T style={{ fontFamily: FONT.serifBold, fontSize: 24, color: sc.grado === "B" || sc.grado === "C" ? "#1f2a12" : COLOR.white }}>{sc.grado}</T>
              </View>
              <View style={{ marginLeft: 10 }}>
                <T style={{ fontFamily: FONT.sansBold, fontSize: 13, lineHeight: 1.2 }}>{`${sc.total}/100`}</T>
                <T style={{ fontSize: 8, color: COLOR.muted }}>{sc.etiqueta}</T>
              </View>
            </View>
          ) : (
            <T style={{ ...S.para, color: COLOR.muted }}>{sc.etiqueta}</T>
          )}
          {sc.total !== null && (
            <View style={{ marginTop: 6 }}>
              <ScoreScale total={sc.total} width={215} />
            </View>
          )}
        </View>
        <View style={{ ...S.card, flex: 1 }} wrap={false}>
          <T style={{ ...S.kicker, color: COLOR.muted }}>Posición en el mercado</T>
          <T style={{ fontFamily: FONT.serifBold, fontSize: 20, lineHeight: 1.2, marginTop: 6, color: COLOR.blue }}>
            {rank && uni ? `#${formatNumber(rank, 0)}` : "—"}
          </T>
          <T style={{ fontSize: 8, color: COLOR.muted }}>
            {rank && uni ? `del ranking nacional por ingresos ${c.year}, de ${formatNumber(uni, 0)} empresas (Top ${formatPercent(rank / uni, rank / uni < 0.01 ? 2 : 1)})` : "Sin posición en el ranking nacional."}
          </T>
          {seg && (
            <T style={{ fontSize: 8, marginTop: 5 }}>
              {`En su actividad (CIIU ${seg.prefix}) es la n.º ${seg.rank} de ${formatNumber(seg.empresas, 0)}, con el ${formatPercent(c.b.ownIngresos / seg.total, c.b.ownIngresos / seg.total < 0.1 ? 2 : 1)} de los ingresos de la clase.`}
            </T>
          )}
        </View>
      </View>

      <Fig n="Tabla 4" title={`Indicadores clave ${c.years[0]}–${c.year}`} width={W}>
        <View style={{ borderTopWidth: 0.75, borderColor: COLOR.rule }}>
          <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, paddingVertical: 3 }}>
            <T style={{ width: W - 50 * c.years.length, paddingLeft: 4, fontFamily: FONT.sansBold, fontSize: 7 }}>INDICADOR</T>
            {c.years.map((y) => (
              <T key={y} style={{ width: 50, textAlign: "right", fontFamily: FONT.sansBold, fontSize: 7, paddingRight: 3 }}>{String(y)}</T>
            ))}
          </View>
          {(
            [
              ["Ingresos operacionales", c.met("ingresos_ventas"), (v: number) => formatCompactMoney(v)],
              ["Utilidad neta", c.met("utilidad_neta"), (v: number) => formatCompactMoney(v)],
              ["Margen neto", c.val("rent_neta_ventas"), (v: number) => formatPercent(v, 1)],
              ["ROE", c.val("roe"), (v: number) => formatPercent(v, 1)],
              ["Razón corriente", c.val("liquidez_corriente"), (v: number) => formatNumber(v, 2)],
              ["Endeudamiento del activo", c.val("end_activo"), (v: number) => formatPercent(v, 0)],
            ] as [string, (number | null)[], (v: number) => string][]
          ).map(([label, vals, f]) => (
            <View key={label} style={{ flexDirection: "row", paddingVertical: 2.6, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft }}>
              <T style={{ width: W - 50 * c.years.length, paddingLeft: 4, fontSize: 7.5 }}>{label}</T>
              {vals.map((v, i) => (
                <T key={i} style={{ width: 50, textAlign: "right", fontSize: 7.5, paddingRight: 3, fontFamily: c.years[i] === c.year ? FONT.sansBold : FONT.sans }}>{v === null ? "—" : f(v)}</T>
              ))}
            </View>
          ))}
        </View>
      </Fig>
    </Sheet>
  );
}

// ───────────────────────── perfil y trayectoria ─────────────────────────

export function TrajectoryPage({ c }: { c: Ctx }) {
  const b = c.b;
  const facts: [string, string][] = [
    ["Tipo de compañía", b.company.tipo?.trim() || "—"],
    ["Provincia", titleCase(b.company.provincia?.trim())],
    ["Actividad principal", b.current.ciiu_n6 ? `${b.current.ciiu_n6}${b.ciiuDesc ? " · " + sentenceCase(b.ciiuDesc) : ""}` : "—"],
    ["Tamaño (SCVS)", segmentName(b.current.cod_segmento)],
    ["Empleados " + c.year, b.m.n_empleados ? formatNumber(Number(b.m.n_empleados), 0) : "—"],
    ["Mercado de valores", b.filled.some((f) => f.metrics.cia_imvalores === 1) ? "Participa" : "No participa"],
  ];
  const ing = c.met("ingresos_ventas");
  const prod = c.years.map((y, i) => {
    const e = c.num(b.filled.find((f) => f.anio === y)?.metrics.n_empleados);
    return e && e > 0 && isNum(ing[i] as number) ? (ing[i] as number) / e : null;
  });
  const emp = c.years.map((y) => c.num(b.filled.find((f) => f.anio === y)?.metrics.n_empleados));
  const has = (a: (number | null)[]) => a.filter((v) => v !== null).length >= 2;
  return (
    <Sheet c={c} kicker="2 · Análisis" title={N.trajectoryTitle(c)} lead={N.trajectoryReading(c)}>
      <View style={{ marginTop: 8, borderTopWidth: 0.75, borderColor: COLOR.rule, flexDirection: "row", flexWrap: "wrap" }}>
        {facts.map(([k, v]) => (
          <View key={k} style={{ width: W / 2, flexDirection: "row", paddingVertical: 3, paddingRight: 8, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft }}>
            <T style={{ width: 92, fontSize: 7, color: COLOR.muted, textTransform: "uppercase" }}>{k}</T>
            <T style={{ flex: 1, fontSize: 8 }}>{v}</T>
          </View>
        ))}
      </View>
      <Fig n="Figura 2" title="Ingresos y utilidad neta por año (cada serie con su propia escala)">
        <LinePanel categories={c.cats} values={ing} unit="money" width={W} height={112} color={COLOR.gray} events={PDF_EVENTS} label="Ingresos operacionales" />
        <LinePanel categories={c.cats} values={c.met("utilidad_neta")} unit="money" width={W} height={100} color={COLOR.blue} events={PDF_EVENTS} eventLabels={false} label="Utilidad neta" />
      </Fig>
      <View style={{ flexDirection: "row", gap: 15 }}>
        {has(prod) && (
          <Fig n="Figura 3" title="Ingresos por empleado (US$) y tendencia" width={(W - 15) / 2}>
            <LinePanel categories={c.cats} values={prod} unit="money" width={(W - 15) / 2} height={110} trend />
          </Fig>
        )}
        {has(emp) && (
          <Fig n="Figura 4" title="Empleados reportados" width={(W - 15) / 2}>
            <LinePanel categories={c.cats} values={emp} unit="count" width={(W - 15) / 2} height={110} />
          </Fig>
        )}
      </View>
      <Note>Las líneas rojas punteadas marcan hitos: 2020 (pandemia de COVID-19) y 2024 (crisis energética). Hasta 2021 los datos provienen del formulario tributario del SRI y desde 2022 de estados NIIF; las series antes y después de 2022 pueden no ser comparables línea por línea.</Note>
    </Sheet>
  );
}

// ───────────────────────── rentabilidad ─────────────────────────

const TREE: Record<string, { title: string; formula: string; kind: "pct" | "x"; top?: boolean }> = {
  roe: { title: "ROE", formula: "= ROA × Apalancamiento", kind: "pct", top: true },
  roa: { title: "ROA", formula: "= Margen neto × Rotación", kind: "pct" },
  dp_apalancamiento: { title: "Apalancamiento", formula: "= Activos ÷ Patrimonio", kind: "x" },
  rent_neta_ventas: { title: "Margen neto", formula: "= Carga fiscal × Carga financ. × Margen EBIT", kind: "pct" },
  dp_rotacion: { title: "Rotación de activos", formula: "= Ingresos ÷ Activos", kind: "x" },
  dp_carga_fiscal: { title: "Carga fiscal y laboral", formula: "= Utilidad neta ÷ Utilidad antes de imp.", kind: "x" },
  dp_carga_financiera: { title: "Carga financiera", formula: "= Utilidad antes de imp. ÷ EBIT", kind: "x" },
  dp_margen_ebit: { title: "Margen EBIT", formula: "= EBIT ÷ Ingresos", kind: "pct" },
};

export function ProfitabilityPage({ c }: { c: Ctx }) {
  const v = c.b.curValues;
  const boxes: Record<string, TreeBox> = {};
  for (const [k, d] of Object.entries(TREE)) {
    const x = c.num(v[k]);
    boxes[k] = { key: k, title: d.title, formula: d.formula, top: d.top, value: x === null ? "—" : d.kind === "pct" ? formatPercent(x, 1) : `${formatNumber(x, 2)}×` };
  }
  const withEbitda = c.val("margen_ebitda").map((x, i) => ((c.b.filled.find((f) => f.anio === c.years[i])?.metrics.costos_ventas_prod ?? 0) > 0 ? x : null));
  const w2 = (W - 15) / 2;
  return (
    <Sheet c={c} kicker="2 · Análisis" title={N.profitabilityTitle(c)} lead={N.profitabilityReading(c)}>
      <View style={{ flexDirection: "row", gap: 15 }}>
        <Fig n="Figura 5" title="ROE: utilidad neta ÷ patrimonio" width={w2}>
          <LinePanel categories={c.cats} values={c.val("roe")} unit="percent" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
        <Fig n="Figura 6" title="ROA: utilidad neta ÷ activos" width={w2}>
          <LinePanel categories={c.cats} values={c.val("roa")} unit="percent" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
      </View>
      <View style={{ flexDirection: "row", gap: 15 }}>
        <Fig n="Figura 7" title="Margen EBITDA aproximado (años con costos reportados)" width={w2}>
          <LinePanel categories={c.cats} values={withEbitda} unit="percent" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
        <Fig n="Figura 8" title="Margen neto: utilidad neta ÷ ingresos" width={w2}>
          <LinePanel categories={c.cats} values={c.val("rent_neta_ventas")} unit="percent" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
      </View>
      <Fig n="Figura 9" title={`Descomposición DuPont del ROE, ${c.year}: la pirámide se lee de abajo hacia arriba multiplicando los factores`}>
        {typeof v.dp_carga_fiscal === "number" ? (
          <DupontTree boxes={boxes} width={W} />
        ) : (
          <T style={{ ...S.para, color: COLOR.muted }}>
            {`El desglose DuPont solo se calcula cuando la utilidad antes de impuestos, el EBIT y el patrimonio son positivos; en ${c.year} no se cumple alguna de esas condiciones.`}
          </T>
        )}
      </Fig>
    </Sheet>
  );
}

// ───────────────────────── liquidez, ciclo y solvencia ─────────────────────────

export function LiquidityPage({ c }: { c: Ctx }) {
  const v = c.b.curValues;
  const w2 = (W - 15) / 2;
  const days = (k: string) => c.val(k).map((x) => (x !== null && x >= 0 && x <= 730 ? x : null));
  const ccc = c.val("ccc").map((x) => (x !== null && Math.abs(x) <= 1500 ? x : null));
  const tiles: [string, string | null, string][] = [
    ["Días de cobro (DSO)", c.num(v.per_med_cobranza) !== null ? `${formatNumber(v.per_med_cobranza as number, 0)} d` : null, "+"],
    ["Días de inventario (DIO)", c.num(v.dio) !== null ? `${formatNumber(v.dio as number, 0)} d` : null, "−"],
    ["Días de pago (DPO)", c.num(v.per_med_pago) !== null ? `${formatNumber(v.per_med_pago as number, 0)} d` : null, "="],
    ["Ciclo de efectivo (CCC)", c.num(v.ccc) !== null ? `${formatNumber(v.ccc as number, 0)} d` : null, ""],
  ];
  const cov = c.val("cobertura_ebitda").some((x) => x !== null) ? "cobertura_ebitda" : "cobertura_interes";
  return (
    <Sheet c={c} kicker="2 · Análisis" title={N.liquidityTitle(c)} lead={N.liquidityReading(c)}>
      <View style={{ flexDirection: "row", gap: 15 }}>
        <Fig n="Figura 10" title="Razón corriente: activo corriente ÷ pasivo corriente" width={w2}>
          <LinePanel categories={c.cats} values={c.val("liquidez_corriente")} unit="ratio" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
        <Fig n="Figura 11" title="Prueba ácida: (activo corriente − inventarios) ÷ pasivo corriente" width={w2}>
          <LinePanel categories={c.cats} values={c.val("prueba_acida")} unit="ratio" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
      </View>

      <Fig n="Figura 12" title={`Ciclo de conversión de efectivo, ${c.year}: DSO + DIO − DPO = CCC (días)`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {tiles.map(([label, value, op], i) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={{ flex: 1, borderWidth: 0.75, borderColor: i === 3 ? COLOR.blue : COLOR.rule, backgroundColor: i === 3 ? COLOR.blueTint : COLOR.white, borderRadius: 3, padding: 5 }}>
                <T style={{ fontSize: 6.5, color: COLOR.muted }}>{label}</T>
                <T style={{ fontFamily: FONT.sansBold, fontSize: 12, marginTop: 2 }}>{value ?? "—"}</T>
              </View>
              {op && <T style={{ fontSize: 12, color: COLOR.muted, marginHorizontal: 3 }}>{op}</T>}
            </View>
          ))}
        </View>
        <View style={{ marginTop: 6 }}>
          <LinePanel categories={c.cats} values={ccc} unit="days" width={W} height={100} events={PDF_EVENTS} label="CCC por año (solo años con balance NIIF)" />
        </View>
      </Fig>

      <View style={{ flexDirection: "row", gap: 15 }}>
        <Fig n="Figura 13" title="Endeudamiento del activo: pasivo ÷ activo" width={w2}>
          <LinePanel categories={c.cats} values={c.val("end_activo")} unit="percent" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
        <Fig n="Figura 14" title={cov === "cobertura_ebitda" ? "Cobertura de intereses: EBITDA ÷ gastos financieros" : "Cobertura de intereses: utilidad operacional ÷ gastos financieros"} width={w2}>
          <LinePanel categories={c.cats} values={c.val(cov)} unit="ratio" width={w2} height={112} events={PDF_EVENTS} />
        </Fig>
      </View>
      <T style={{ ...S.para, marginTop: 6 }}>{N.solvencyReading(c)}</T>
    </Sheet>
  );
}

// ───────────────────────── razones financieras ─────────────────────────

const RATIO_TABLE: { group: string; keys: string[] }[] = [
  { group: "Márgenes", keys: ["margen_bruto", "margen_operacional", "margen_ebitda", "rent_neta_ventas"] },
  { group: "Retorno", keys: ["roe", "roa", "roic"] },
  { group: "Liquidez", keys: ["liquidez_corriente", "prueba_acida"] },
  { group: "Endeudamiento y cobertura", keys: ["end_activo", "deuda_neta_ebitda", "cobertura_interes"] },
  { group: "Eficiencia", keys: ["rot_ventas"] },
  { group: "Ciclo de efectivo (días)", keys: ["per_med_cobranza", "dio", "per_med_pago", "ccc"] },
  { group: "Flujo de caja (estimado)", keys: ["fcf"] },
];
const PCT_KEYS = new Set(["margen_bruto", "margen_operacional", "margen_ebitda", "rent_neta_ventas", "roe", "roa", "roic", "fcf_margen", "end_activo"]);
const DAYS = new Set(["per_med_cobranza", "dio", "per_med_pago", "ccc"]);
const MONEY = new Set(["capital_trabajo", "fcf"]);

function cellFmt(key: string, v: number | null): string {
  if (v === null) return "—";
  if (PCT_KEYS.has(key)) return formatPercent(v, 1);
  if (DAYS.has(key)) return formatNumber(v, 0);
  if (MONEY.has(key)) return formatCompactMoney(v);
  return formatNumber(v, 2);
}

export function RatiosPage({ c }: { c: Ctx }) {
  const cur = c.b.byYear[c.year];
  const nameW = 178;
  const parW = 34;
  const colW = Math.min(46, (W - nameW - parW) / Math.max(c.years.length, 1));
  const zone = (key: string) => {
    const dir = DIRECTION[key] ?? "neutral";
    const fav = N.favorability(key, c.b.dist[key]);
    const d = c.b.dist[key];
    if (!d || d.own === null || d.n < 10) return { text: "—", color: COLOR.muted };
    const p = Math.round((d.below / d.n) * 100);
    if (dir === "neutral" || fav === null) return { text: `P${p}`, color: COLOR.gray };
    return { text: `P${p}`, color: fav >= 60 ? COLOR.green : fav >= 33 ? COLOR.amber : COLOR.red };
  };
  return (
    <Sheet
      c={c}
      kicker="2 · Análisis"
      title="Razones financieras"
      lead={`Indicadores calculados con las cifras exactas de cada año. La última columna es el percentil de ${c.year} entre las empresas comparables (P80: supera al 80 % de ellas), en verde, ámbar o rojo según sea favorable, intermedia o desfavorable.`}
    >
      <Fig n="Tabla 5" title={`Razones financieras ${c.years[0]}–${c.year} y posición frente a los pares`} width={W} source="Fuente: SCVS; cálculos de Ecuador Financiero. Un guion indica que la razón no es calculable (p. ej., patrimonio negativo o sin balance NIIF); (aprox.) y (est.): ver bases de preparación; percentil en gris: la razón no tiene un sentido claramente mejor.">
        <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: COLOR.rule, paddingVertical: 3 }}>
          <T style={{ width: nameW, paddingLeft: 4, fontFamily: FONT.sansBold, fontSize: 7 }}>RAZÓN</T>
          {c.years.map((y) => (
            <T key={y} style={{ width: colW, textAlign: "right", fontFamily: FONT.sansBold, fontSize: 7, paddingRight: 3 }}>{String(y)}</T>
          ))}
          <T style={{ width: parW, textAlign: "center", fontFamily: FONT.sansBold, fontSize: 7 }}>PARES</T>
        </View>
        {RATIO_TABLE.filter((g) => g.keys.some((k) => c.val(k).some((x) => x !== null))).map((g) => (
          <View key={g.group} wrap={false}>
            <View style={{ backgroundColor: COLOR.blueTint, paddingVertical: 2, paddingLeft: 4 }}>
              <T style={{ fontFamily: FONT.sansBold, fontSize: 6.8, color: COLOR.blue, textTransform: "uppercase", letterSpacing: 0.4 }}>{g.group}</T>
            </View>
            {g.keys.map((k) => {
              const info = ratioInfo(k);
              const series = c.val(k);
              if (series.every((x) => x === null)) return null;
              const flag = cur?.flags[k];
              const z = zone(k);
              return (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 1.3, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft }}>
                  <View style={{ width: nameW, paddingLeft: 4 }}>
                    <T style={{ fontSize: 7.2 }}>{`${info?.nombre ?? k}${flag ? (flag === "estimado" ? " (est.)" : " (aprox.)") : ""}`}</T>
                    <T style={{ fontSize: 5.4, color: COLOR.muted }}>{info?.formula ?? ""}</T>
                  </View>
                  {series.map((x, i) => (
                    <T key={i} style={{ width: colW, textAlign: "right", fontSize: 7, paddingRight: 3, fontFamily: c.years[i] === c.year ? FONT.sansBold : FONT.sans }}>{cellFmt(k, x)}</T>
                  ))}
                  <T style={{ width: parW, textAlign: "center", fontSize: 7, fontFamily: FONT.sansBold, color: z.color }}>{z.text}</T>
                </View>
              );
            })}
          </View>
        ))}
      </Fig>
    </Sheet>
  );
}

// ───────────────────────── frente a sus pares ─────────────────────────

const CURVES: { key: string; label: string; dir: "higher" | "lower" }[] = [
  { key: "rent_neta_ventas", label: "Margen neto", dir: "higher" },
  { key: "roe", label: "ROE", dir: "higher" },
  { key: "roa", label: "ROA", dir: "higher" },
  { key: "liquidez_corriente", label: "Razón corriente", dir: "higher" },
  { key: "end_activo", label: "Endeudamiento del activo", dir: "lower" },
  { key: "margen_ebitda", label: "Margen EBITDA", dir: "higher" },
];

export function PeersPage({ c }: { c: Ctx }) {
  const g = c.b.peerGroup!;
  const w3 = (W - 20) / 3;
  const own = {
    ingresos: c.b.ownIngresos > 0 ? c.b.ownIngresos : null,
    roe: c.num(c.b.curValues.roe),
    margen: c.num(c.b.curValues.rent_neta_ventas),
    liquidez: c.num(c.b.curValues.liquidez_corriente) ?? c.num(c.b.m.liquidez_corriente),
  };
  const cols: [string, keyof typeof own, (v: number | null) => string][] = [
    ["Ingresos", "ingresos", (v) => formatCompactMoney(v)],
    ["ROE", "roe", (v) => (v === null ? "—" : formatPercent(v, 1))],
    ["Margen neto", "margen", (v) => (v === null ? "—" : formatPercent(v, 1))],
    ["Razón corriente", "liquidez", (v) => (v === null ? "—" : formatNumber(v, 2))],
  ];
  const tone = (a: number | null, p: number | null) => (a === null || p === null || a === p ? COLOR.ink : a > p ? COLOR.green : COLOR.red);
  return (
    <Sheet c={c} kicker="2 · Análisis" title={N.peersTitle(c)} lead={N.peersReading(c)}>
      <Fig n="Figura 15" title="Dónde se ubica la empresa en la distribución de sus pares (curva normal aproximada; sombreado = pares que quedan por debajo)">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {CURVES.map((cv) => {
            const d = c.b.dist[cv.key];
            if (!d || d.own === null || d.median === null || d.p25 === null || d.p75 === null || d.n < 10) return null;
            const fav = N.favorability(cv.key, d);
            const color = fav === null ? COLOR.gray : fav >= 60 ? COLOR.green : fav >= 33 ? COLOR.amber : COLOR.red;
            return (
              <DistCurve
                key={cv.key}
                label={cv.label}
                own={d.own}
                median={d.median}
                p25={d.p25}
                p75={d.p75}
                ownText={N.fmrShort(cv.key, d.own)}
                medianText={N.fmrShort(cv.key, d.median)}
                width={w3 - 4}
                height={88}
                color={color}
                percentile={(d.below / d.n) * 100}
              />
            );
          })}
        </View>
      </Fig>
      <Fig n="Tabla 6" title={`Las diez empresas comparables más cercanas en ingresos (${g.levelLabel}, CIIU ${g.prefix})`}>
        <View style={{ borderTopWidth: 0.75, borderColor: COLOR.rule }}>
          <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, paddingTop: 3 }}>
            <T style={{ flex: 1, paddingLeft: 4, fontFamily: FONT.sansBold, fontSize: 7 }}>EMPRESA</T>
            {cols.map(([h]) => (
              <T key={h} style={{ width: 90, textAlign: "center", fontFamily: FONT.sansBold, fontSize: 6.8 }}>{h.toUpperCase()}</T>
            ))}
          </View>
          <View style={{ flexDirection: "row", backgroundColor: COLOR.soft, paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: COLOR.rule }}>
            <T style={{ flex: 1 }}> </T>
            {cols.map(([h]) => (
              <View key={h} style={{ width: 90, flexDirection: "row" }}>
                <T style={{ width: 45, textAlign: "right", fontSize: 6, color: COLOR.muted, paddingRight: 3 }}>COMPARABLE</T>
                <T style={{ width: 45, textAlign: "right", fontSize: 6, fontFamily: FONT.sansBold, paddingRight: 3 }}>{c.pretty.split(" ")[0].toUpperCase().slice(0, 9)}</T>
              </View>
            ))}
          </View>
          {g.peers.map((p) => {
            const d = derivedRatios(p.metrics);
            const vals: Record<keyof typeof own, number | null> = {
              ingresos: c.num(p.metrics.ingresos_ventas),
              roe: c.num(d.roe),
              margen: c.num(d.rent_neta_ventas),
              liquidez: c.num(p.metrics.liquidez_corriente),
            };
            return (
              <View key={p.expediente} style={{ flexDirection: "row", paddingVertical: 2.4, borderBottomWidth: 0.4, borderBottomColor: COLOR.graySoft }} wrap={false}>
                <T style={{ flex: 1, paddingLeft: 4, fontSize: 6.8, paddingRight: 4 }}>{p.nombre}</T>
                {cols.map(([h, k, f]) => (
                  <View key={h} style={{ width: 90, flexDirection: "row" }}>
                    <T style={{ width: 45, textAlign: "right", fontSize: 6.8, paddingRight: 3 }}>{f(vals[k])}</T>
                    <T style={{ width: 45, textAlign: "right", fontSize: 6.8, paddingRight: 3, fontFamily: FONT.sansBold, color: tone(own[k], vals[k]) }}>{f(own[k])}</T>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </Fig>
      <Note>
        {`Las cifras de esta empresa aparecen en verde si superan a las del comparable de la fila y en rojo si quedan por debajo (mayor es mejor en las cuatro métricas). ` +
          `Las curvas y los percentiles se calculan sobre las ${formatNumber(g.benchmark.n, 0)} empresas más cercanas en tamaño, no solo sobre estas diez.`}
      </Note>
    </Sheet>
  );
}

// ───────────────────────── riesgo y crédito ─────────────────────────

export function RiskPage({ c }: { c: Ctx }) {
  const sc = c.b.score;
  const flags = c.b.flags;
  const sevColor = { alta: COLOR.red, media: COLOR.amber, info: COLOR.gray } as const;
  const sevName = { alta: "ALTA", media: "MEDIA", info: "INFORMATIVA" } as const;
  return (
    <Sheet c={c} kicker="2 · Análisis" title={N.riskTitle(c)} lead={N.riskReading(c)}>
      <T style={S.h2}>Puntaje orientativo de capacidad de pago</T>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ ...S.card, width: 150, alignItems: "center" }} wrap={false}>
          {sc.grado && sc.total !== null ? (
            <>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: GRADE_HEX[sc.grado], alignItems: "center", justifyContent: "center" }}>
                <T style={{ fontFamily: FONT.serifBold, fontSize: 30, color: sc.grado === "B" || sc.grado === "C" ? "#1f2a12" : COLOR.white }}>{sc.grado}</T>
              </View>
              <T style={{ fontFamily: FONT.sansBold, fontSize: 15, lineHeight: 1.2, marginTop: 5, color: GRADE_HEX[sc.grado] }}>{`${sc.total}/100`}</T>
              <T style={{ fontSize: 8, color: COLOR.muted }}>{sc.etiqueta}</T>
              <View style={{ marginTop: 6 }}>
                <ScoreScale total={sc.total} width={126} />
              </View>
            </>
          ) : (
            <T style={{ fontSize: 8, color: COLOR.muted }}>{sc.etiqueta}</T>
          )}
        </View>
        <View style={{ flex: 1 }}>
          {sc.componentes.map((k) => (
            <View key={k.id} style={{ marginBottom: 4 }} wrap={false}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T style={{ fontSize: 7.8, fontFamily: FONT.sansBold }}>{`${k.label} (${k.peso}%)`}</T>
                <T style={{ fontSize: 7.2, color: COLOR.muted }}>{`${k.valor} · ${k.puntaje === null ? "sin dato" : k.puntaje + "/100"}`}</T>
              </View>
              {k.puntaje !== null && <BarMeter value={k.puntaje} width={300} color={GRADE_HEX[gradeOfScore(k.puntaje)]} />}
            </View>
          ))}
        </View>
      </View>
      <Note>
        El puntaje es el promedio ponderado de seis componentes (si falta alguno, los demás se reponderan). Grados: A desde 80, B desde 65, C desde 50, D desde 35 y E por debajo. Los umbrales son generales, no ajustados por sector. Es una referencia para el análisis y no reemplaza una calificación crediticia oficial.
      </Note>

      <T style={S.h2}>Alertas de control</T>
      {flags.length === 0 ? (
        <T style={S.para}>{`No se detectaron alertas con las reglas aplicadas para ${c.year}.`}</T>
      ) : (
        flags.slice(0, 6).map((f) => (
          <View key={f.id} wrap={false} style={{ borderLeftWidth: 3, borderLeftColor: sevColor[f.severity], paddingLeft: 7, marginTop: 5 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <T style={{ fontFamily: FONT.sansBold, fontSize: 8 }}>{f.titulo}</T>
              <T style={{ fontSize: 6, fontFamily: FONT.sansBold, color: sevColor[f.severity], letterSpacing: 0.4 }}>{sevName[f.severity]}</T>
            </View>
            <T style={{ fontSize: 7.5, color: COLOR.muted }}>{f.detalle}</T>
            {f.evidencia && <T style={{ fontSize: 7, marginTop: 1 }}>{f.evidencia}</T>}
          </View>
        ))
      )}

      <T style={S.h2}>Conclusión</T>
      <T style={S.para}>{`${N.headline(c)} ${N.peersTitle(c)}. ${N.riskTitle(c)}.`}</T>
      <View style={{ ...S.card, marginTop: 14, backgroundColor: COLOR.soft }} wrap={false}>
        <T style={{ fontFamily: FONT.sansBold, fontSize: 7.5 }}>Aviso legal</T>
        <T style={{ fontSize: 7, color: COLOR.muted, marginTop: 2 }}>
          Este informe fue generado automáticamente por Ecuador Financiero a partir de información pública de la Superintendencia de Compañías, Valores y Seguros. Ecuador Financiero es un proyecto independiente, sin afiliación oficial. La información se ofrece con fines de análisis y no constituye asesoría financiera, de inversión ni de crédito, ni una auditoría. Las alertas indican dónde conviene mirar y pedir explicaciones; no prueban un problema. Antes de tomar decisiones, contraste las cifras con los estados financieros presentados por la compañía.
        </T>
      </View>
    </Sheet>
  );
}

// ───────────────────────── registro de secciones ─────────────────────────
// Para agregar una sección nueva: crear su página y añadirla aquí; el contenido y la numeración se actualizan solos.

export type SectionDef = {
  id: string;
  group: 1 | 2;
  label: string;
  enabled: (c: Ctx) => boolean;
  page: (c: Ctx) => ReactElement;
};

export const SECTIONS: SectionDef[] = [
  { id: "esf", group: 1, label: "Estado de situación financiera", enabled: () => true, page: (c) => <EsfPage c={c} /> },
  { id: "eri", group: 1, label: "Estado de resultado integral", enabled: () => true, page: (c) => <EriPage c={c} /> },
  { id: "notas", group: 1, label: "Notas a los estados financieros", enabled: () => true, page: (c) => <NotesPage c={c} /> },
  { id: "resumen", group: 2, label: "Resumen ejecutivo", enabled: () => true, page: (c) => <SummaryPage c={c} /> },
  { id: "trayectoria", group: 2, label: "Perfil y trayectoria", enabled: () => true, page: (c) => <TrajectoryPage c={c} /> },
  { id: "rentabilidad", group: 2, label: "Rentabilidad y descomposición DuPont", enabled: (c) => !c.b.inactive, page: (c) => <ProfitabilityPage c={c} /> },
  { id: "liquidez", group: 2, label: "Liquidez, ciclo de efectivo y solvencia", enabled: (c) => !c.b.inactive, page: (c) => <LiquidityPage c={c} /> },
  { id: "razones", group: 2, label: "Razones financieras", enabled: (c) => !c.b.inactive, page: (c) => <RatiosPage c={c} /> },
  { id: "pares", group: 2, label: "Comparación con empresas similares", enabled: (c) => !c.b.inactive && !!c.b.peerGroup, page: (c) => <PeersPage c={c} /> },
  { id: "riesgo", group: 2, label: "Riesgo y capacidad de pago", enabled: (c) => !c.b.inactive, page: (c) => <RiskPage c={c} /> },
];
