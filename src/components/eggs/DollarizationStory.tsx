"use client";

import { useEffect, useRef, useState } from "react";
import { INFLATION as D } from "@/lib/eggs/inflation";

const Y0 = 1970;
const Y1 = 2025;
const N = Y1 - Y0;
const W = 900;
const H = 460;
const ML = 52;
const MR = 20;
const MT = 24;
const MB = 40;
const VMIN = -5;
const VMAX = 100;
const X = (y: number) => ML + ((y - Y0) / (Y1 - Y0)) * (W - ML - MR);
const Y = (v: number) => MT + ((VMAX - v) / (VMAX - VMIN)) * (H - MT - MB);
const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;

// Ritmo de la animación (ms por año): se ralentiza hacia 1999 y 2000 para dar dramatismo.
const dur = (i: number) => {
  const y = Y0 + i;
  if (y === 1999) return 1100;
  if (y === 2000) return 1900;
  if (y === 2001) return 1000;
  if (y === 2002) return 600;
  if (y >= 2003) return 170;
  return 230;
};
const CUM: number[] = [0];
for (let i = 1; i <= N; i++) CUM.push(CUM[i - 1] + dur(i));
const TOTAL = CUM[N];

const MSG = "Hey there, sir. You've just been dollarized. No take-backs!";

const CAP: { from: number; bold: string; rest: string }[] = [
  { from: 1970, bold: "1970:", rest: "everything is fine. Prices go up 5% a year and the sucre is doing okay." },
  { from: 1973, bold: "Oil shows up.", rest: "Money comes in, prices go up. Classic." },
  { from: 1983, bold: "Debt crisis:", rest: "48% in a single year. Oof." },
  { from: 1988, bold: "Rollercoaster mode:", rest: "between 23% and 76% a year, every year. Nobody asked for this ride." },
  { from: 1999, bold: "1999:", rest: "bank freeze and the sucre in free fall. Prices jump 52%. Anon is not okay." },
  { from: 2000, bold: "96.1%.", rest: "Prices nearly double in one year. Somebody has to do something…" },
  { from: 2001, bold: "With dollars, inflation deflates:", rest: "37.7% to 12.5% to 7.9% to 2.7%. Based." },
  { from: 2005, bold: "Normal life:", rest: "mostly between 2% and 5%, with one 8.4% spike in 2008. Comfy." },
  { from: 2017, bold: "Basically zero.", rest: "There was even deflation: -0.2% in 2018 and -0.3% in 2020. Comfy." },
  { from: 2022, bold: "A brief bump", rest: "(3.5% in 2022) and back to chill: 0.7% in 2025." },
];

const EVENTS: { y: number; t: string; dx?: number; dy?: number; yv?: number; a: "middle" | "end" }[] = [
  { y: 1974, t: "Oil boom", dy: -16, a: "middle" },
  { y: 1983, t: "Debt crisis", dy: -16, a: "middle" },
  { y: 1989, t: "The sucre melts", dy: -16, a: "middle" },
  { y: 1999, t: "Bank freeze", dx: -14, yv: 70, a: "end" },
  { y: 2008, t: "Highest since 2002", dy: -16, a: "middle" },
  { y: 2019, t: "Basically zero", dy: -16, a: "middle" },
];

function valAt(yr: number) {
  const i = Math.min(N, Math.max(0, Math.floor(yr - Y0)));
  const f = yr - Y0 - i;
  const a = D[Y0 + i];
  const b = D[Math.min(Y1, Y0 + i + 1)];
  return a + (b - a) * f;
}

const avg = (a: number, b: number) => {
  let s = 0;
  let n = 0;
  for (let y = a; y <= b; y++) {
    s += D[y];
    n++;
  }
  return s / n;
};

// El globo de Pepe escribe su frase letra por letra (o de golpe si se saltó la animación).
function Bubble({ instant }: { instant: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (instant) return;
    const t = setInterval(() => setN((k) => (k >= MSG.length ? k : k + 1)), 38);
    return () => clearInterval(t);
  }, [instant]);
  const text = instant ? MSG : MSG.slice(0, n);
  return (
    <div className="relative mt-2 min-h-[56px] rounded-xl bg-[#eaf3ff] px-3 py-2 text-[13px] font-bold leading-snug text-[#0b1220] max-md:text-center">
      <span aria-hidden className="absolute -top-[7px] right-12 h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-[#eaf3ff] max-md:left-1/2 max-md:right-auto max-md:-ml-[7px]" />
      {text}
    </div>
  );
}

export default function DollarizationStory() {
  const [yr, setYr] = useState(Y0);
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => {
        setSkipped(true);
        setYr(Y1);
      }, 0);
      return () => clearTimeout(t);
    }
    const start = performance.now() + 400;
    function frame(now: number) {
      const ms = now - start;
      if (ms < 0) {
        raf.current = requestAnimationFrame(frame);
        return;
      }
      if (ms >= TOTAL) {
        setYr(Y1);
        return;
      }
      let i = 1;
      while (i < N && CUM[i] < ms) i++;
      const f = (ms - CUM[i - 1]) / (CUM[i] - CUM[i - 1]);
      setYr(Y0 + i - 1 + Math.max(0, Math.min(1, f)));
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [run]);

  function replay() {
    setSkipped(false);
    setYr(Y0);
    setRun((r) => r + 1);
  }
  function skip() {
    cancelAnimationFrame(raf.current);
    setSkipped(true);
    setYr(Y1);
  }

  const year = Math.floor(yr);
  const v = valAt(yr);
  const revealed = yr >= 2000;
  const done = yr >= Y1;
  const cap = [...CAP].reverse().find((c) => year >= c.from) ?? CAP[0];

  let d = `M${X(Y0)} ${Y(D[Y0])}`;
  for (let k = 1; k <= Math.floor(yr - Y0); k++) d += ` L${X(Y0 + k)} ${Y(D[Y0 + k])}`;
  d += ` L${X(yr)} ${Y(v)}`;
  const area = `${d} L${X(yr)} ${Y(0)} L${X(Y0)} ${Y(0)} Z`;

  const tx = X(1995) - 32;
  const ty = Y(96);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ecuador&apos;s Inflation Rollercoaster</h1>
      <p className="mt-1 mb-5 text-muted">Annual inflation, 1970–2025. Spoiler: something happens in 2000.</p>

      <section className={`relative overflow-hidden rounded-2xl border border-border bg-surface p-4 ${revealed && !skipped ? "egg-shake" : ""}`}>
        {revealed && !skipped && (
          <div className="egg-flash pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--positive) 35%, transparent), transparent 65%)" }} />
        )}
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-5xl font-bold leading-none tabular-nums sm:text-6xl">{year}</span>
          <span className={`text-2xl font-semibold tabular-nums sm:text-3xl ${v > 40 ? "text-negative" : year >= 2001 && v < 10 ? "text-positive" : "text-[var(--chart-blue)]"}`}>{pct(v)}</span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block h-auto w-full overflow-visible" role="img" aria-label="Chart of Ecuador's annual inflation from 1970 to 2025">
          <defs>
            <linearGradient id="egg-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--chart-blue)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--chart-blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={Y(t)} y2={Y(t)} stroke="var(--border)" />
              <text x={ML - 8} y={Y(t) + 4} textAnchor="end" className="fill-muted" fontSize="12">
                {t}%
              </text>
            </g>
          ))}
          {Array.from({ length: 12 }, (_, i) => 1970 + i * 5).map((t) => (
            <text key={t} x={X(t)} y={H - 14} textAnchor="middle" className="fill-muted" fontSize="12">
              {t}
            </text>
          ))}
          <rect x={X(2000)} y={MT} width={W - MR - X(2000)} height={H - MT - MB} fill="var(--positive)" fillOpacity={yr >= 2000 ? 0.07 : 0} />
          <path d={area} fill="url(#egg-area)" />
          <path d={d} fill="none" stroke="var(--chart-blue)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

          {EVENTS.map((e) => {
            const px = X(e.y) + (e.dx ?? 0);
            const py = Y(e.yv ?? D[e.y]) + (e.dy ?? 0);
            return (
              <g key={e.y} style={{ opacity: yr >= e.y ? 1 : 0, transition: "opacity .5s" }}>
                <text x={px} y={py} textAnchor={e.a} className="fill-foreground" fontSize="12.5">
                  {e.t}
                </text>
                <text x={px} y={py + 14} textAnchor={e.a} className="fill-muted" fontSize="11.5">
                  {pct(D[e.y])}
                </text>
              </g>
            );
          })}

          <g style={{ opacity: revealed ? 1 : 0, transition: "opacity .5s" }}>
            <line x1={X(2000)} x2={X(2000)} y1={MT} y2={H - MB} stroke="var(--negative)" strokeDasharray="4 4" strokeWidth="1.3" />
            <text x={X(2000) + 10} y={MT + 12} fontSize="13" fontWeight="700" fill="var(--negative)">
              DOLLARIZATION
            </text>
            <text x={X(2000) + 10} y={MT + 28} fontSize="11.5" className="fill-muted">
              January 2000 · {pct(D[2000])}
            </text>
          </g>

          <g style={{ opacity: revealed ? 1 : 0, transform: revealed ? "none" : "translateY(-26px)", transition: "opacity .6s, transform .7s cubic-bezier(.3,1.6,.5,1)" }}>
            <path d={`M${tx} ${ty + 62} V${ty + 22} a32 22 0 0 1 64 0 V${ty + 62} Z`} className="fill-border" stroke="var(--chart-gray)" strokeWidth="2" />
            {[
              ["R.I.P.", ty + 30, 11],
              ["SUCRE", ty + 44, 11],
              ["1884–2000", ty + 57, 9],
            ].map(([s, yy, fs]) => (
              <text key={s as string} x={tx + 32} y={yy as number} textAnchor="middle" fontSize={fs as number} fontWeight="700" className="fill-foreground">
                {s}
              </text>
            ))}
          </g>

          <circle cx={X(yr)} cy={Y(v)} r="6" fill="var(--chart-blue)" stroke="var(--surface)" strokeWidth="2" />
        </svg>

        <p className="mt-2 min-h-[48px] text-[15.5px] md:max-w-[78%]">
          {done ? (
            <>
              <b className="text-accent">The end.</b> Before: a rollercoaster. After: a bike ride.
            </>
          ) : (
            <>
              <b className="text-accent">{cap.bold}</b> {cap.rest}
            </>
          )}
        </p>

        {/* Pepe flotante, sin caja: entra desde el borde derecho justo al llegar a la dolarización. */}
        <div
          className="pointer-events-none absolute right-2.5 top-[70px] w-[170px] max-md:static max-md:mx-auto max-md:mt-2 max-md:w-[150px]"
          style={{ transform: revealed ? "none" : "translateX(130%)", opacity: revealed ? 1 : 0, transition: "transform .8s cubic-bezier(.2,1.3,.4,1), opacity .3s" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/egg/pepe-meme.png" alt="Pepe holding a dollar bill" width={340} height={334} className="block w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]" />
          {revealed && <Bubble key={run} instant={skipped} />}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button type="button" onClick={replay} className="rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand hover:text-brand">
          Replay
        </button>
        <button type="button" onClick={skip} className="rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand hover:text-brand">
          Skip animation
        </button>
      </div>

      {done && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [pct(avg(1970, 1999)), "average inflation 1970–1999 (sucre era)"],
              [pct(avg(2001, 2025)), "average inflation 2001–2025 (dollar era)"],
              ["25 years", "without a sucre. No refunds."],
            ].map(([big, small]) => (
              <div key={small} className="rounded-xl border border-border bg-surface px-4 py-3">
                <b className="block text-2xl tabular-nums">{big}</b>
                <span className="text-[13px] text-muted">{small}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid items-center gap-5 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,300px)_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/egg/billete-pepe.png" alt="Fantasy one-dollar bill with Pepe's face" width={512} height={212} className="block w-full rounded-lg" />
            <div>
              <p>
                <b>Well, well, well&hellip; looks like you&apos;ve been dollarized, buddy.</b>
                <br />
                The U.S. aircraft carriers now back your economy.
              </p>
              <p className="mt-3 font-mono text-[13.5px] leading-relaxed text-[#6f8f1e]">
                &gt;be Ecuador, 1999
                <br />
                &gt;sucre goes down only
                <br />
                &gt;wake up in 2000
                <br />
                &gt;everything costs dollars now
                <br />
                &gt;mfw the central bank can&apos;t print anymore
              </p>
              <p className="mt-3 text-[13px] text-muted">Fantasy bill &laquo;The Dank States of Memes&raquo;. Legal tender for all memes, public and private.</p>
            </div>
          </div>
        </>
      )}

      <p className="mt-5 text-xs text-muted">
        Source: World Bank, indicator FP.CPI.TOTL.ZG (consumer price inflation, annual average). This is not the December-to-December inflation published by INEC, so some figures differ.
      </p>
    </div>
  );
}
