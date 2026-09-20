import type { CSSProperties } from "react";
import type { SectorKind } from "@/lib/eggs";
import { SectorIcon } from "@/components/eggs/SectorIcons";

export type Bill = { id: number; left: number; delay: number; dur: number; rot: number; sway: number; size: number };

// Se genera al activar el huevo (en el manejador del evento), no al renderizar.
export function makeBills(n = 60): Bill[] {
  return Array.from({ length: n }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    dur: 2.2 + Math.random() * 1.6,
    rot: Math.random() * 720 - 360,
    sway: Math.random() * 120 - 60,
    size: 46 + Math.random() * 24,
  }));
}

function BillSvg({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 60 28" width={width} aria-hidden>
      <rect x="0.5" y="0.5" width="59" height="27" rx="3" fill="#7fc98f" stroke="#2e6b3d" />
      <rect x="4" y="4" width="52" height="20" rx="2" fill="none" stroke="#2e6b3d" strokeWidth="0.8" />
      <circle cx="30" cy="14" r="7" fill="#a9dcb4" stroke="#2e6b3d" strokeWidth="0.8" />
      <text x="30" y="17.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1f5a2f">
        $1
      </text>
      <text x="8" y="18.5" fontSize="7" fontWeight="700" fill="#1f5a2f">
        1
      </text>
      <text x="52" y="18.5" fontSize="7" fontWeight="700" fill="#1f5a2f" textAnchor="end">
        1
      </text>
    </svg>
  );
}

// HESOYAM: lluvia de billetes de $1 y Pepe de esmoquin que sube desde abajo durante 4 segundos.
export function HesoyamOverlay({ bills }: { bills: Bill[] }) {
  return (
    <>
      {bills.map((b) => (
        <div
          key={b.id}
          className="egg-bill"
          style={
            {
              left: `${b.left}%`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
              "--rot": `${b.rot}deg`,
              "--sway": `${b.sway}px`,
            } as CSSProperties
          }
        >
          <BillSvg width={b.size} />
        </div>
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/egg/pepe-esmoquin.png" alt="" width={220} height={220} className="egg-rise rounded-t-2xl shadow-2xl" />
    </>
  );
}

function Star({ style, delay }: { style: CSSProperties; delay: number }) {
  return (
    <svg className="egg-spark" width="22" height="22" viewBox="0 0 24 24" style={{ ...style, animationDelay: `${delay}s` }} aria-hidden>
      <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#ffe27a" stroke="#e6ac0c" strokeWidth="0.6" />
    </svg>
  );
}

function CacaoOpen() {
  return (
    <div className="egg-cacao" aria-hidden>
      <svg viewBox="0 0 120 120" width="180" height="180">
        <g className="egg-half-l">
          <path d="M60 8 A30 52 0 0 0 60 112 Z" fill="#c8682b" stroke="#6b3110" strokeWidth="2" strokeLinejoin="round" />
          <path d="M60 16 A20 44 0 0 0 60 104 Z" fill="#efe1bd" />
          <path d="M44 26 C36 50 40 80 52 100 M34 40 C30 60 34 82 42 96" fill="none" stroke="#8a4318" strokeWidth="1.6" />
        </g>
        <g className="egg-half-r">
          <path d="M60 8 A30 52 0 0 1 60 112 Z" fill="#c8682b" stroke="#6b3110" strokeWidth="2" strokeLinejoin="round" />
          <path d="M60 16 A20 44 0 0 1 60 104 Z" fill="#efe1bd" />
          <path d="M76 26 C84 50 80 80 68 100 M86 40 C90 60 86 82 78 96" fill="none" stroke="#8a4318" strokeWidth="1.6" />
        </g>
        {[26, 43, 60, 77, 94].map((cy, i) => (
          <ellipse
            key={cy}
            className="egg-bean"
            style={{ animationDelay: `${0.7 + i * 0.12}s` }}
            cx={60 + (i % 2 ? 4 : -4)}
            cy={cy}
            rx="9"
            ry="12"
            fill="#7a4a2a"
            stroke="#4a2a14"
            strokeWidth="1.4"
          />
        ))}
      </svg>
    </div>
  );
}

// Animaciones de tres segundos, sobre la página y sin bloquear los clics.
export function SectorOverlay({ kind }: { kind: SectorKind }) {
  return (
    <div className="egg-stage" aria-hidden>
      {kind === "banano" && (
        <div className="egg-drop">
          <SectorIcon kind="banano" size={96} />
        </div>
      )}
      {kind === "mineria" && (
        <>
          <div className="egg-drop">
            <SectorIcon kind="mineria" size={96} />
          </div>
          <Star style={{ bottom: 150, left: "calc(50% - 86px)" }} delay={1.3} />
          <Star style={{ bottom: 196, left: "calc(50% + 52px)" }} delay={1.42} />
          <Star style={{ bottom: 120, left: "calc(50% + 74px)" }} delay={1.54} />
          <Star style={{ bottom: 214, left: "calc(50% - 40px)" }} delay={1.66} />
        </>
      )}
      {kind === "petroleo" && (
        <>
          <div className="egg-oil">
            <SectorIcon kind="petroleo" size={96} />
          </div>
          <div className="egg-splash" />
          <div className="egg-note rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-lg">
            Ojo con el precio del barril
          </div>
        </>
      )}
      {kind === "camaron" && (
        <div className="egg-hop-x">
          <div className="egg-hop-y">
            <SectorIcon kind="camaron" size={84} />
          </div>
        </div>
      )}
      {kind === "cacao" && <CacaoOpen />}
    </div>
  );
}
