"use client";

import { useState } from "react";

const SCREENS = {
  inicio: { title: "BIENVENIDO", lines: ["Seleccione una operación."] },
  retirar: { title: "RETIRO", lines: ["OPERACIÓN NO DISPONIBLE.", "Saldo disponible: S/. 0", "Intente nuevamente en 365 días."] },
  consultar: { title: "CONSULTA DE SALDO", lines: ["Saldo disponible: S/. 0  (US$ 0,00)", "Depósitos reprogramados por decreto: 365 días."] },
  transferir: { title: "TRANSFERENCIA", lines: ["OPERACIÓN NO DISPONIBLE.", "Los depósitos están reprogramados por decreto."] },
  salir: { title: "GRACIAS POR SU PACIENCIA", lines: ["Ojalá esto no se repita nunca más."] },
} as const;
type Key = keyof typeof SCREENS;

const KEYS: { id: Key; label: string }[] = [
  { id: "retirar", label: "Retirar" },
  { id: "consultar", label: "Consultar saldo" },
  { id: "transferir", label: "Transferir" },
  { id: "salir", label: "Salir" },
];

// Cajero automático que siempre muestra saldo cero, con Pepe esperando en la pantalla.
export default function AtmMachine() {
  const [screen, setScreen] = useState<Key>("inicio");
  const s = SCREENS[screen];

  return (
    <div className="mx-auto w-full max-w-xl rounded-[28px] border border-[#7d8794] bg-gradient-to-b from-[#d5d9df] to-[#a4acb7] p-4 shadow-2xl sm:p-6">
      <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[#3a4452]">
        <span>Cajero automático</span>
        <span className="rounded bg-[#3a4452] px-2 py-0.5 text-[#d5d9df]">24 horas</span>
      </div>

      {/* Pantalla */}
      <div className="rounded-xl border-4 border-[#4a5462] bg-[#08202b] p-3 text-[#7dffb2] shadow-inner sm:p-4" style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}>
        <div className="flex items-center justify-between border-b border-[#1f5a45] pb-1 text-[11px] uppercase tracking-widest">
          <span>{s.title}</span>
          <span aria-hidden>▮▯▯</span>
        </div>
        <div className="mt-3 flex items-end gap-3 sm:gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/egg/pepe-tricolor.png"
            alt="Pepe con una camiseta tricolor, triste, frente al cajero"
            width={360}
            height={594}
            className="h-40 w-auto shrink-0 sm:h-52"
            style={{ filter: "drop-shadow(0 0 6px rgba(125,255,178,0.25))" }}
          />
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[11px] uppercase tracking-widest text-[#4fd18a]">Saldo disponible</p>
            <p className="mt-1 text-4xl font-bold leading-none sm:text-5xl">S/. 0</p>
            <p className="mt-1 text-xl font-semibold text-[#c9ffe0] sm:text-2xl">US$ 0,00</p>
            <div className="mt-3 min-h-[76px] text-[13px] leading-snug" role="status" aria-live="polite">
              {s.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Teclas de función */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KEYS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setScreen(k.id)}
            className={`rounded-md border-b-4 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-[#1d2530] transition-transform active:translate-y-0.5 active:border-b-2 ${
              screen === k.id ? "border-[#3c8a63] bg-[#b9e8cf]" : "border-[#6c7683] bg-[#e9ecf0] hover:bg-white"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Ranuras decorativas */}
      <div className="mt-4 flex items-center gap-4" aria-hidden>
        <div className="grid grid-cols-3 gap-1.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((n) => (
            <span key={n} className="flex h-6 w-8 items-center justify-center rounded bg-[#eef0f3] text-[11px] font-bold text-[#3a4452] shadow-[0_2px_0_#7d8794]">
              {n}
            </span>
          ))}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#3a4452]">Inserte su tarjeta</div>
            <div className="h-2.5 rounded-full bg-[#1c222b]" />
          </div>
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#3a4452]">Retire su dinero</div>
            <div className="flex h-7 items-center justify-center rounded bg-[#1c222b] text-[10px] font-semibold uppercase tracking-widest text-[#8a94a3]">
              vacío
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
