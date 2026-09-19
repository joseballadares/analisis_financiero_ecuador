"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { expediente: number; ruc: string; nombre: string; provincia: string | null };

export default function SearchBox({ autoFocus = false, compact = false }: { autoFocus?: boolean; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Busca por nombre de empresa o RUC..."
        className={`w-full rounded-xl border border-border bg-surface shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition ${
          compact ? "px-4 py-2.5 text-sm" : "px-5 py-4 text-base"
        }`}
      />
      {open && (query.trim().length >= 2) && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted">Buscando...</div>
          )}
          {!loading && results.length === 0 && (
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
