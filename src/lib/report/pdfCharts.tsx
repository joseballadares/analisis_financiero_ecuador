import { Circle, G, Line, Path, Rect, Svg, Text as SvgText, View } from "@react-pdf/renderer";
import { COLOR, FONT, S, T, pdfText } from "@/lib/report/theme";
import { fmtShort, fmtTick, isNum, lineScale, niceStep, type Unit } from "@/lib/chartMath";
import { formatCompactMoney } from "@/lib/format";

export type PdfEvent = { year: number; label: string };
export const PDF_EVENTS: PdfEvent[] = [
  { year: 2020, label: "Pandemia" },
  { year: 2024, label: "Crisis energética" },
];

function regression(values: (number | null)[]) {
  const pts = values.map((v, i) => (isNum(v) ? { x: i, y: v } : null)).filter((p): p is { x: number; y: number } => p !== null);
  if (pts.length < 3) return null;
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const b = (n * sxy - sx * sy) / den;
  return { a: (sy - b * sx) / n, b, x0: pts[0].x, x1: pts[pts.length - 1].x };
}

function Txt(props: { x: number; y: number; size?: number; fill?: string; anchor?: "start" | "middle" | "end"; bold?: boolean; children: string }) {
  return (
    <SvgText
      x={props.x}
      y={props.y}
      fill={props.fill ?? COLOR.muted}
      textAnchor={props.anchor ?? "start"}
      style={{ fontSize: props.size ?? 6.5, fontFamily: props.bold ? FONT.sansBold : FONT.sans }}
    >
      {pdfText(props.children)}
    </SvgText>
  );
}

// Gráfico de líneas de una serie: un punto por año, etiqueta del último valor, hitos opcionales y tendencia.
export function LinePanel({
  categories: categoriesIn,
  values: valuesIn,
  unit,
  width,
  height,
  color = COLOR.blue,
  events,
  trend = false,
  label,
  eventLabels = true,
}: {
  categories: string[];
  values: (number | null)[];
  unit: Unit;
  width: number;
  height: number;
  color?: string;
  events?: PdfEvent[];
  trend?: boolean;
  label?: string;
  eventLabels?: boolean;
}) {
  // El eje se acorta a los años con movimiento relevante (en importes, al menos 0,5 % del mayor valor); mínimo 3 años.
  const maxAbs = Math.max(0, ...valuesIn.filter(isNum).map((v) => Math.abs(v)));
  const active = (i: number) => {
    const v = valuesIn[i];
    return isNum(v) && (unit === "money" ? v !== 0 && Math.abs(v) >= 0.005 * maxAbs : true);
  };
  let from = 0;
  let to = categoriesIn.length - 1;
  while (from < to && !active(from)) from++;
  while (to > from && !active(to)) to--;
  from = Math.max(0, Math.min(from, to - 2));
  const categories = categoriesIn.slice(from, to + 1);
  const values = valuesIn.slice(from, to + 1);
  const PAD = { l: 34, r: 12, t: events && eventLabels ? 15 : 9, b: 14 };
  const n = categories.length;
  const iw = width - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const step = n > 1 ? (iw - 12) / (n - 1) : 0;
  const x = (i: number) => PAD.l + 6 + (n > 1 ? step * i : (iw - 12) / 2);
  const sc = lineScale(values);
  const y = (v: number) => PAD.t + ih - ((v - sc.min) / (sc.max - sc.min)) * ih;
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (!isNum(v)) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });
  let last = -1;
  values.forEach((v, i) => {
    if (isNum(v)) last = i;
  });
  const reg = trend ? regression(values) : null;
  const clampY = (v: number) => Math.min(Math.max(v, PAD.t), PAD.t + ih);
  const every = n > 8 ? 2 : 1;
  const svg = (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {sc.ticks.map((t) => (
        <G key={t}>
          <Line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? COLOR.gray : COLOR.graySoft} strokeWidth={0.5} />
          <Txt x={PAD.l - 4} y={y(t) + 2.2} anchor="end">{fmtTick(unit, t, sc.step)}</Txt>
        </G>
      ))}
      {events?.map((e) => {
        const i = categories.indexOf(String(e.year));
        if (i < 0) return null;
        return (
          <G key={e.year}>
            <Line x1={x(i)} x2={x(i)} y1={PAD.t - 4} y2={PAD.t + ih} stroke={COLOR.red} strokeWidth={0.7} strokeDasharray="2.5 2" />
            {eventLabels && (
              <Txt x={x(i) + (x(i) + 75 > width - PAD.r ? -2.5 : 2.5)} y={PAD.t - 6} size={6} anchor={x(i) + 75 > width - PAD.r ? "end" : "start"} fill={COLOR.red}>{`${e.year} ${e.label}`}</Txt>
            )}
          </G>
        );
      })}
      {reg && (
        <Line
          x1={x(reg.x0)}
          x2={x(reg.x1)}
          y1={clampY(y(reg.a + reg.b * reg.x0))}
          y2={clampY(y(reg.a + reg.b * reg.x1))}
          stroke={COLOR.gray}
          strokeWidth={0.9}
          strokeDasharray="3 2"
        />
      )}
      <Path d={d} stroke={color} strokeWidth={1.4} fill="none" />
      {values.map((v, i) => (isNum(v) ? <Circle key={i} cx={x(i)} cy={y(v)} r={1.9} fill={color} /> : null))}
      {last >= 0 && (
        <Txt x={x(last)} y={y(values[last] as number) - 4.5} anchor={x(last) > width - 40 ? "end" : "middle"} size={6.8} bold fill={color}>
          {fmtShort(unit, values[last] as number)}
        </Txt>
      )}
      {categories.map((c, i) =>
        i % every === 0 || i === n - 1 ? <Txt key={c} x={x(i)} y={height - 3} anchor="middle" size={6.3}>{c}</Txt> : null,
      )}
    </Svg>
  );
  if (!label) return svg;
  return (
    <View>
      <T style={{ fontFamily: FONT.sansBold, fontSize: 7, color, marginBottom: 1 }}>{label}</T>
      {svg}
    </View>
  );
}

// Activo = Pasivo + Patrimonio: una columna por año, con el pasivo (gris) y el patrimonio (azul) apilados.
export function EquationBars({
  categories,
  pasivo,
  patrimonio,
  width,
  height,
}: {
  categories: string[];
  pasivo: (number | null)[];
  patrimonio: (number | null)[];
  width: number;
  height: number;
}) {
  const PAD = { l: 38, r: 8, t: 14, b: 14 };
  const n = categories.length;
  const totals = categories.map((_, i) => (isNum(pasivo[i]) && isNum(patrimonio[i]) ? (pasivo[i] as number) + (patrimonio[i] as number) : null));
  const max = Math.max(0, ...totals.filter(isNum));
  const stepv = niceStep(max || 1, 3);
  const top = Math.ceil((max || 1) / stepv) * stepv;
  const ticks: number[] = [];
  for (let v = 0; v <= top + stepv / 2; v += stepv) ticks.push(v);
  const iw = width - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const slot = iw / n;
  const bw = Math.min(30, slot * 0.6);
  const y = (v: number) => PAD.t + ih - (v / top) * ih;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {ticks.map((t) => (
        <G key={t}>
          <Line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? COLOR.gray : COLOR.graySoft} strokeWidth={0.5} />
          <Txt x={PAD.l - 4} y={y(t) + 2.2} anchor="end">{formatCompactMoney(t)}</Txt>
        </G>
      ))}
      {categories.map((c, i) => {
        const cx = PAD.l + slot * i + slot / 2;
        const p = pasivo[i];
        const q = patrimonio[i];
        if (!isNum(p) || !isNum(q)) return <Txt key={c} x={cx} y={height - 3} anchor="middle" size={6.3}>{c}</Txt>;
        const yPas = y(Math.max(p, 0));
        const yTot = y(Math.max(p, 0) + Math.max(q, 0));
        return (
          <G key={c}>
            <Rect x={cx - bw / 2} y={yPas} width={bw} height={y(0) - yPas} fill={COLOR.blueSoft} />
            {q > 0 && <Rect x={cx - bw / 2} y={yTot} width={bw} height={yPas - yTot} fill={COLOR.blue} />}
            {isNum(totals[i]) && i === n - 1 && (
              <Txt x={cx} y={yTot - 3} anchor="middle" size={6.5} bold fill={COLOR.ink}>{formatCompactMoney(totals[i] as number)}</Txt>
            )}
            <Txt x={cx} y={height - 3} anchor="middle" size={6.3}>{c}</Txt>
          </G>
        );
      })}
    </Svg>
  );
}

// Curva normal aproximada (mediana y rango intercuartílico de los pares) con la posición de la empresa.
export function DistCurve({
  label,
  own,
  median,
  p25,
  p75,
  ownText,
  medianText,
  width,
  height,
  color,
  percentile,
}: {
  label: string;
  own: number;
  median: number;
  p25: number;
  p75: number;
  ownText: string;
  medianText: string;
  width: number;
  height: number;
  color: string;
  percentile: number | null;
}) {
  const sigma = (p75 - p25) / 1.349;
  if (!(sigma > 0)) return null;
  const lo = Math.min(median - 3.2 * sigma, own - 0.5 * sigma);
  const hi = Math.max(median + 3.2 * sigma, own + 0.5 * sigma);
  const pl = 4;
  const pt = 24;
  const pb = 14;
  const xs = (v: number) => pl + ((v - lo) / (hi - lo)) * (width - 2 * pl);
  const ys = (p: number) => pt + (1 - p) * (height - pt - pb);
  const pdf = (v: number) => Math.exp(-0.5 * Math.pow((v - median) / sigma, 2));
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const v = lo + ((hi - lo) * i) / 60;
    pts.push([xs(v), ys(pdf(v))]);
  }
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const ownX = Math.min(Math.max(xs(own), pl), width - pl);
  const below = pts.filter((p) => p[0] <= ownX);
  const area =
    below.length > 1
      ? `${below.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} L${ownX.toFixed(1)} ${ys(0)} L${xs(lo).toFixed(1)} ${ys(0)} Z`
      : "";
  const anchor = ownX > width - 45 ? "end" : ownX < 45 ? "start" : "middle";
  return (
    <View style={{ width }}>
      <T style={{ fontFamily: FONT.sansBold, fontSize: 7 }}>{label}</T>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {area && <Path d={area} fill={color} fillOpacity={0.25} />}
        <Path d={path} stroke={COLOR.blue} strokeWidth={1.2} fill="none" />
        <Line x1={xs(median)} x2={xs(median)} y1={ys(1)} y2={ys(0)} stroke={COLOR.gray} strokeWidth={0.7} strokeDasharray="2.5 2" />
        <Txt x={xs(median)} y={height - 3} anchor="middle" size={6}>{`mediana ${medianText}`}</Txt>
        <Line x1={ownX} x2={ownX} y1={pt - 8} y2={ys(0)} stroke={color} strokeWidth={1.6} />
        <Path d={`M${ownX - 3} ${pt - 12} L${ownX + 3} ${pt - 12} L${ownX} ${pt - 6} Z`} fill={color} />
        <Txt x={ownX} y={pt - 16} anchor={anchor} size={7} bold fill={color}>{`Empresa: ${ownText}`}</Txt>
      </Svg>
      <T style={S.small}>{percentile === null ? " " : `Supera al ${Math.round(percentile)}% de los pares`}</T>
    </View>
  );
}

export type TreeBox = { key: string; title: string; value: string; formula: string; top?: boolean };

// Pirámide DuPont: ROE = ROA x Apalancamiento; ROA = Margen neto x Rotación; Margen neto = tres factores.
export function DupontTree({ boxes, width }: { boxes: Record<string, TreeBox>; width: number }) {
  const bw = 112;
  const bh = 40;
  const gapY = 22;
  const rowY = (r: number) => 4 + r * (bh + gapY);
  const height = rowY(3) + bh + 4;
  const scale = width / 500;
  // Coordenadas en una malla de 500 de ancho, escaladas al ancho disponible.
  const pos: Record<string, [number, number]> = {
    dp_carga_fiscal: [0, 3],
    dp_carga_financiera: [124, 3],
    dp_margen_ebit: [248, 3],
    rent_neta_ventas: [124, 2],
    dp_rotacion: [372, 2],
    roa: [248, 1],
    dp_apalancamiento: [372, 1],
    roe: [310, 0],
  };
  const links: [string, string][] = [
    ["roe", "roa"],
    ["roe", "dp_apalancamiento"],
    ["roa", "rent_neta_ventas"],
    ["roa", "dp_rotacion"],
    ["rent_neta_ventas", "dp_carga_fiscal"],
    ["rent_neta_ventas", "dp_carga_financiera"],
    ["rent_neta_ventas", "dp_margen_ebit"],
  ];
  const cx = (k: string) => pos[k][0] + bw / 2;
  return (
    <Svg width={width} height={height * scale} viewBox={`0 0 500 ${height}`}>
      {links.map(([p, c]) => {
        const x1 = cx(p);
        const y1 = rowY(pos[p][1]) + bh;
        const x2 = cx(c);
        const y2 = rowY(pos[c][1]);
        const mid = (y1 + y2) / 2;
        return <Path key={`${p}-${c}`} d={`M${x1} ${y1} L${x1} ${mid} L${x2} ${mid} L${x2} ${y2}`} stroke={COLOR.gray} strokeWidth={0.8} fill="none" />;
      })}
      {Object.entries(pos).map(([k, [px, r]]) => {
        const b = boxes[k];
        if (!b) return null;
        const y0 = rowY(r);
        return (
          <G key={k}>
            <Rect x={px} y={y0} width={bw} height={bh} rx={3} fill={b.top ? COLOR.blueTint : COLOR.white} stroke={b.top ? COLOR.blue : COLOR.rule} strokeWidth={b.top ? 1.2 : 0.8} />
            <Txt x={px + 6} y={y0 + 11} size={6.8} bold fill={COLOR.ink}>{b.title}</Txt>
            <Txt x={px + 6} y={y0 + 25} size={b.top ? 12 : 10.5} bold fill={COLOR.blue}>{b.value}</Txt>
            <Txt x={px + 6} y={y0 + 35} size={5.2}>{b.formula}</Txt>
          </G>
        );
      })}
    </Svg>
  );
}

// Escala A–E del puntaje con la posición de la empresa.
export const GRADE_HEX: Record<string, string> = { A: "#1f9d55", B: "#84cc16", C: "#e0b100", D: "#f97316", E: "#dc2626" };
const BANDS: { g: string; from: number; to: number }[] = [
  { g: "E", from: 0, to: 35 },
  { g: "D", from: 35, to: 50 },
  { g: "C", from: 50, to: 65 },
  { g: "B", from: 65, to: 80 },
  { g: "A", from: 80, to: 100 },
];
export const gradeOfScore = (p: number) => (p >= 80 ? "A" : p >= 65 ? "B" : p >= 50 ? "C" : p >= 35 ? "D" : "E");

export function ScoreScale({ total, width }: { total: number; width: number }) {
  const px = (v: number) => (v / 100) * width;
  const g = gradeOfScore(total);
  return (
    <Svg width={width} height={30} viewBox={`0 0 ${width} 30`}>
      {BANDS.map((b) => (
        <G key={b.g}>
          <Rect x={px(b.from)} y={10} width={px(b.to - b.from) - 1} height={7} fill={GRADE_HEX[b.g]} fillOpacity={b.g === g ? 1 : 0.35} />
          <Txt x={px((b.from + b.to) / 2)} y={27} anchor="middle" size={6.5} bold>{b.g}</Txt>
        </G>
      ))}
      <Path d={`M${px(total) - 3.5} 3 L${px(total) + 3.5} 3 L${px(total)} 9.5 Z`} fill={COLOR.ink} />
    </Svg>
  );
}

// Sombra tenue de un bloque de tabla con barras (puntaje por componente).
export function BarMeter({ value, width, color }: { value: number; width: number; color: string }) {
  return (
    <Svg width={width} height={6} viewBox={`0 0 ${width} 6`}>
      <Rect x={0} y={0} width={width} height={6} rx={3} fill={COLOR.graySoft} />
      <Rect x={0} y={0} width={Math.max((value / 100) * width, 3)} height={6} rx={3} fill={color} />
    </Svg>
  );
}
