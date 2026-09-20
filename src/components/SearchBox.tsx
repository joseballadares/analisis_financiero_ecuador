"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { PEPE_NAME, PEPE_SLUG, fireEgg, norm, sectorFromWord } from "@/lib/eggs";

type Result = { expediente: number; ruc: string; nombre: string; provincia: string | null };

export default function SearchBox({ autoFocus = false, compact = false }: { autoFocus?: boolean; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Solo el nombre exacto revela el resultado escondido; con texto parcial no hay ninguna pista.
  const isPepe = norm(query) === norm(PEPE_NAME);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Palabras secretas: solo actúan al presionar Enter; la búsqueda normal no cambia.
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const n = norm(query);
    if (n === "hesoyam") {
      fireEgg({ type: "hesoyam" });
    } else if (n === "dolarizacion") {
      router.push("/dolarizacion");
    } else if (isPepe) {
      router.push(`/empresa/${PEPE_SLUG}`);
    } else {
      const kind = sectorFromWord(query);
      if (kind) fireEgg({ type: "sector", kind });
    }
  }

  const showBox = query.trim().length >= 2 && (open || isPepe);

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Busca por nombre de empresa o RUC..."
        className={`w-full rounded-xl border border-border bg-surface shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition ${
          compact ? "px-4 py-2.5 text-sm" : "px-5 py-4 text-base"
        }`}
      />
      {showBox && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {isPepe && (
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/empresa/${PEPE_SLUG}`);
              }}
              className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left hover:bg-brand-soft transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                {PEPE_NAME}
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                  ficticia
                </span>
              </span>
              <span className="text-xs text-muted">RUC ficticio · Pantano del Guayas</span>
            </button>
          )}
          {loading && !isPepe && (
            <div className="px-4 py-3 text-sm text-muted">Buscando...</div>
          )}
          {!loading && results.length === 0 && !isPepe && (
            <div className="px-4 py-3 text-sm text-muted">Sin resultados para &quot;{query}&quot;</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.expediente}
                onClick={() => {
                  setOpen(false);
                  router.push(`/empresa/${r.ruc}`);
                }}
                className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-brand-soft transition-colors"
              >
                <span className="font-medium">{r.nombre}</span>
                <span className="text-xs text-muted">
                  RUC {r.ruc}
                  {r.provincia ? ` · ${r.provincia.trim()}` : ""}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
