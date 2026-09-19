"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Pide al servidor una nueva selección aleatoria de empresas.
export default function ShuffleButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
    >
      <span aria-hidden className={pending ? "animate-spin" : ""}>
        ↻
      </span>
      Mostrar otras
    </button>
  );
}
