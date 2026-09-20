"use client";

import { useEffect, useState } from "react";
import { SITE_BIRTH_YEAR, guayaquilDate, markSeen, seenThisSession } from "@/lib/eggs";

type Piece = { id: number; left: number; delay: number; dur: number; rot: number; sway: number; color: string };
const COLORS = ["#f5c542", "#ff6b7a", "#5b9dff", "#2bb894", "#e0973f", "#c084fc"];

function makeConfetti(n = 70): Piece[] {
  return Array.from({ length: n }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 1.6 + Math.random() * 0.9,
    rot: Math.random() * 900 - 450,
    sway: Math.random() * 160 - 80,
    color: COLORS[id % COLORS.length],
  }));
}

// Cada 18 de septiembre (fecha de Ecuador): franja con los años del sitio y un poco de confeti, una vez por sesión.
export default function BirthdayStrip() {
  const [years, setYears] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<Piece[]>([]);

  useEffect(() => {
    const { year, month, day } = guayaquilDate();
    if (month !== 9 || day !== 18 || year <= SITE_BIRTH_YEAR) return;
    let clear: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      if (seenThisSession("egg_cumple")) return;
      markSeen("egg_cumple");
      setYears(year - SITE_BIRTH_YEAR);
      setConfetti(makeConfetti());
      clear = setTimeout(() => setConfetti([]), 3200);
    }, 0);
    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
  }, []);

  if (years === null) return null;
  return (
    <>
      {confetti.map((p) => (
        <div
          key={p.id}
          className="egg-bill"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--rot": `${p.rot}deg`,
              "--sway": `${p.sway}px`,
              width: 8,
              height: 13,
              background: p.color,
              borderRadius: 2,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="border-b border-border bg-brand-soft px-4 py-2 text-center text-sm font-medium text-brand">
        Hoy este sitio cumple {years} {years === 1 ? "año" : "años"} 🎂
        <button type="button" onClick={() => setYears(null)} aria-label="Cerrar" className="ml-3 text-muted hover:text-foreground">
          ×
        </button>
      </div>
    </>
  );
}
