"use client";

import { useState } from "react";

const RATE = 25_000; // sucres por dólar, tipo de cambio fijado al dolarizar (año 2000)

// En sucres, el punto separa miles y la coma los decimales ("1.250.000"). En dólares se acepta además el punto decimal ("0.25").
function parse(s: string, thousandsDot: boolean): number | null {
  let t = s.replace(/\s/g, "");
  if (t === "") return null;
  if (thousandsDot || t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const fmt = (n: number, d: number) => n.toLocaleString("es-EC", { maximumFractionDigits: d });

export default function SucreConverter() {
  const [usd, setUsd] = useState("1");
  const [sucres, setSucres] = useState(fmt(RATE, 0));

  function onUsd(v: string) {
    setUsd(v);
    const n = parse(v, false);
    setSucres(n === null ? "" : fmt(n * RATE, 0));
  }
  function onSucres(v: string) {
    setSucres(v);
    const n = parse(v, true);
    setUsd(n === null ? "" : fmt(n / RATE, 4));
  }

  return (
    <div>
      <label style={{ display: "block", fontWeight: "bold" }} htmlFor="y2k-usd">
        Dólares (US$):
      </label>
      <input id="y2k-usd" className="y2k-input" inputMode="decimal" value={usd} onChange={(e) => onUsd(e.target.value)} />
      <div style={{ textAlign: "center", fontSize: 22, margin: "4px 0" }} aria-hidden>
        ⇅
      </div>
      <label style={{ display: "block", fontWeight: "bold" }} htmlFor="y2k-sucres">
        Sucres:
      </label>
      <input id="y2k-sucres" className="y2k-input" inputMode="decimal" value={sucres} onChange={(e) => onSucres(e.target.value)} />
      <p style={{ margin: "8px 0 0", fontSize: 12 }}>
        Tipo de cambio fijo: <b>US$ 1 = {fmt(RATE, 0)} sucres</b>
      </p>
      <button type="button" className="y2k-btn" style={{ marginTop: 8, width: "auto", display: "inline-block" }} onClick={() => onUsd("1")}>
        Reiniciar
      </button>
    </div>
  );
}
