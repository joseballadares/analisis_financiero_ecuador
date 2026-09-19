import { Font, StyleSheet, Text, type TextProps } from "@react-pdf/renderer";
import type { ReactNode } from "react";

// Sin guiones automáticos: con las fuentes estándar cortan las palabras en español de forma extraña.
Font.registerHyphenationCallback((word) => [word]);

export const COLOR = {
  ink: "#182033",
  muted: "#5d6677",
  rule: "#d3d8e2",
  soft: "#f2f4f8",
  blue: "#1f5fbf",
  blueSoft: "#9dbbe8",
  blueTint: "#e8effb",
  gray: "#8a93a3",
  graySoft: "#dde1e8",
  red: "#c0392b",
  redTint: "#fbeceb",
  green: "#1f8f4e",
  greenTint: "#e7f5ec",
  amber: "#c98a12",
  white: "#ffffff",
};

export const FONT = {
  serif: "Times-Roman",
  serifBold: "Times-Bold",
  sans: "Helvetica",
  sansBold: "Helvetica-Bold",
  sansItalic: "Helvetica-Oblique",
};

// Las fuentes estándar del PDF solo cubren Latin-1 y unos pocos signos; el resto se reemplaza por equivalentes.
const REPLACE: Record<string, string> = {
  "−": "-",
  "≤": "<=",
  "≥": ">=",
  "Δ": "Var.",
  "→": "->",
  "≈": "~",
  "▲": "+",
  "▼": "-",
  "⚠": "(!)",
  " ": " ",
  " ": " ",
  " ": " ",
  "‑": "-",
};
const KEEP = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac]);

export function pdfText(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (REPLACE[ch] !== undefined) out += REPLACE[ch];
    else if (code <= 0xff || KEEP.has(code)) out += ch;
  }
  return out;
}

// Texto que limpia lo que las fuentes del PDF no pueden dibujar.
export function T({ children, ...rest }: TextProps & { children?: ReactNode }) {
  const clean = (n: ReactNode): ReactNode => (typeof n === "string" ? pdfText(n) : Array.isArray(n) ? n.map(clean) : n);
  return <Text {...rest}>{clean(children)}</Text>;
}

export const S = StyleSheet.create({
  page: {
    paddingTop: 62,
    paddingBottom: 54,
    paddingHorizontal: 40,
    fontFamily: FONT.sans,
    fontSize: 8.5,
    color: COLOR.ink,
    lineHeight: 1.35,
  },
  kicker: { fontSize: 7, letterSpacing: 1, color: COLOR.blue, fontFamily: FONT.sansBold, textTransform: "uppercase" },
  h1: { fontFamily: FONT.serifBold, fontSize: 17, lineHeight: 1.2, marginTop: 3, color: COLOR.ink },
  h2: { fontFamily: FONT.serifBold, fontSize: 11.5, marginTop: 10, marginBottom: 3, color: COLOR.ink },
  lead: { fontSize: 9, color: COLOR.ink, marginTop: 5, lineHeight: 1.4 },
  para: { fontSize: 8.5, marginTop: 4, lineHeight: 1.4 },
  small: { fontSize: 7.5, color: COLOR.muted, lineHeight: 1.35 },
  caption: { fontSize: 7.5, fontFamily: FONT.sansBold, color: COLOR.ink, marginBottom: 2 },
  source: { fontSize: 6.5, fontFamily: FONT.sansItalic, color: COLOR.muted, marginTop: 2 },
  rule: { borderBottomWidth: 0.75, borderBottomColor: COLOR.rule },
  card: { borderWidth: 0.75, borderColor: COLOR.rule, borderRadius: 3, padding: 7 },
  row: { flexDirection: "row" },
});
