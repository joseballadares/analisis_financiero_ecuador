"use client";

import { useEffect, useState } from "react";
import { markSeen, norm, seenThisSession } from "@/lib/eggs";

const CHANCE = 0.25;

// Tortuga gigante que cruza la pantalla al abrir la búsqueda de Galápagos: 25 % de probabilidad, una vez por sesión.
export default function TurtleEgg({ provincia }: { provincia?: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!provincia || norm(provincia) !== "galapagos") return;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      if (seenThisSession("egg_tortuga") || Math.random() >= CHANCE) return;
      markSeen("egg_tortuga");
      setOn(true);
      hide = setTimeout(() => setOn(false), 8600);
    }, 0);
    return () => {
      clearTimeout(t);
      clearTimeout(hide);
    };
  }, [provincia]);

  if (!on) return null;
  return (
    <div className="egg-turtle-x" aria-hidden>
      <div className="relative w-[200px]">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold shadow-lg">
          Ciclo de conversión de efectivo: 150 años
        </div>
        <svg viewBox="0 0 200 116" width="200" height="116" className="egg-turtle-bob">
          <g fill="#98a55b" stroke="#3c4a1a" strokeWidth="2.5" strokeLinejoin="round">
            <rect className="egg-leg egg-leg-b" x="44" y="82" width="17" height="26" rx="8" />
            <rect className="egg-leg" x="118" y="82" width="17" height="26" rx="8" />
          </g>
          <path d="M30 84 L14 92 L32 92 Z" fill="#98a55b" stroke="#3c4a1a" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M150 64 C160 56 168 56 176 58" fill="none" stroke="#3c4a1a" strokeWidth="14" strokeLinecap="round" />
          <path d="M150 64 C160 56 168 56 176 58" fill="none" stroke="#98a55b" strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="180" cy="60" rx="16" ry="12" fill="#98a55b" stroke="#3c4a1a" strokeWidth="2.5" />
          <circle cx="186" cy="56" r="2.6" fill="#20260c" />
          <path d="M186 66 Q192 67 195 63" fill="none" stroke="#3c4a1a" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 88 C28 30 152 30 152 88 Z" fill="#7d8f45" stroke="#3c4a1a" strokeWidth="3" strokeLinejoin="round" />
          <path d="M40 80 C46 52 60 42 74 40 M90 34 C86 52 86 68 90 84 M120 38 C126 52 128 68 124 84 M58 84 C60 66 70 52 90 44 M124 46 C136 54 142 68 142 84" fill="none" stroke="#3c4a1a" strokeWidth="2" opacity="0.7" />
          <rect x="28" y="86" width="124" height="9" rx="4.5" fill="#cfc98c" stroke="#3c4a1a" strokeWidth="2.5" />
          <g fill="#98a55b" stroke="#3c4a1a" strokeWidth="2.5" strokeLinejoin="round">
            <rect className="egg-leg" x="62" y="88" width="17" height="24" rx="8" />
            <rect className="egg-leg egg-leg-b" x="134" y="88" width="17" height="24" rx="8" />
          </g>
        </svg>
      </div>
    </div>
  );
}
