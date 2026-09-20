import type { Metadata } from "next";

export const metadata: Metadata = { title: "404 · Ecuador Financiero" };

// Página 404: ventana de navegador con la ecuación contable que no cuadra.
export default function NotFound() {
  return (
    <div className="px-4 py-10 sm:px-6 sm:py-16" style={{ background: "var(--nf-outer)" }}>
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-surface shadow-xl">
        <div className="flex h-9 items-center gap-1.5 px-4" style={{ background: "var(--nf-bar)" }} aria-hidden>
          <span className="h-2 w-2 rounded-full bg-white" />
          <span className="h-2 w-2 rounded-full bg-white" />
          <span className="h-2 w-2 rounded-full bg-white" />
        </div>
        <div className="relative flex min-h-[340px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[400px]">
          <h1 className="text-8xl font-semibold leading-none tracking-tight sm:text-[10rem]" style={{ color: "var(--nf-ink)" }}>
            404
          </h1>
          <p className="mt-6 text-xl font-semibold sm:text-2xl" style={{ color: "var(--nf-ink)" }}>
            Activo ≠ Pasivo + Patrimonio
          </p>
          {/* Hoja de papel triste asomada en la esquina inferior izquierda */}
          <svg viewBox="0 0 150 150" className="absolute -bottom-3 -left-3 h-28 w-28 sm:h-40 sm:w-40" aria-hidden>
            <path d="M8 40 L58 22 L128 52 L92 158 L8 158 Z" fill="var(--surface)" stroke="var(--nf-ink)" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M8 40 L58 22 C46 34 40 48 38 62 C28 58 16 50 8 40 Z" fill="var(--brand-soft)" stroke="var(--nf-ink)" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M22 78 Q29 74 36 78" fill="none" stroke="var(--nf-ink)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M62 78 Q68 74 72 84" fill="none" stroke="var(--nf-ink)" strokeWidth="2.4" strokeLinecap="round" />
            <ellipse cx="22" cy="94" rx="3" ry="4.5" fill="var(--nf-ink)" />
            <ellipse cx="66" cy="102" rx="3" ry="4.5" fill="var(--nf-ink)" />
            <path d="M32 116 Q42 108 56 116" fill="none" stroke="var(--nf-ink)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
