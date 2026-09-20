"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

// Mensajes que aparecen al hacer clics seguidos (cada uno con menos de 4 s de diferencia).
const GAP_MS = 4000;
function messageFor(n: number): string | null {
  if (n === 10) return "Ya, elige una 😅";
  if (n === 20) return "En serio, elige una";
  if (n >= 30 && n % 10 === 0) return "Me rindo 🏳️";
  return null;
}

// Pide al servidor una nueva selección aleatoria de empresas.
export default function ShuffleButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const count = useRef(0);
  const lastClick = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function onClick() {
    const now = Date.now();
    count.current = now - lastClick.current > GAP_MS ? 1 : count.current + 1;
    lastClick.current = now;
    const m = messageFor(count.current);
    if (m) {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 3000);
    }
    start(() => router.refresh());
  }

  return (
    <span className="relative inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
      >
        <span aria-hidden className={pending ? "animate-spin" : ""}>
          ↻
        </span>
        Mostrar otras
      </button>
      {msg && (
        <span role="status" className="egg-toast relative rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium shadow-sm">
          <span aria-hidden className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-border bg-surface" />
          {msg}
        </span>
      )}
    </span>
  );
}
