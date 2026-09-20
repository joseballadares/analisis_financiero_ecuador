"use client";

import { useState, type ReactNode } from "react";

// La pestaña de ratios en dos secciones, con el selector al inicio: ratios estrella (los indicadores clave, el ciclo
// de efectivo y DuPont) y ratios por año (la tabla con todos los indicadores año por año).
export default function RatiosSections({ estrella, porAnio }: { estrella?: ReactNode; porAnio: ReactNode }) {
  const [section, setSection] = useState<"estrella" | "anio">(estrella ? "estrella" : "anio");
  if (!estrella) return <>{porAnio}</>;

  const item = (id: "estrella" | "anio", title: string, desc: string) => {
    const active = section === id;
    return (
      <button
        type="button"
        onClick={() => setSection(id)}
        aria-pressed={active}
        className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
          active ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-brand"
        }`}
      >
        <div className={`text-sm font-semibold ${active ? "text-brand" : ""}`}>{title}</div>
        <div className="mt-0.5 text-xs text-muted">{desc}</div>
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {item("estrella", "Ratios estrella", "Los indicadores clave, el ciclo de efectivo y la pirámide DuPont")}
        {item("anio", "Ratios por año", "Todos los indicadores año por año, en tabla o en tarjetas")}
      </div>
      <div className="pt-8">{section === "estrella" ? estrella : porAnio}</div>
    </div>
  );
}
