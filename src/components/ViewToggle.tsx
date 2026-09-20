"use client";

import { useState, type ReactNode } from "react";

export default function ViewToggle({
  cards,
  table,
  cardsLabel = "Tarjetas por grupo",
  tableLabel = "Tabla por años",
}: {
  cards: ReactNode;
  table: ReactNode;
  cardsLabel?: string;
  tableLabel?: string;
}) {
  const [view, setView] = useState<"cards" | "table">("table");
  const btn = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs transition-colors ${
      active ? "bg-brand text-white" : "border border-border text-muted hover:border-brand hover:text-brand"
    }`;
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button className={btn(view === "table")} onClick={() => setView("table")}>
          {tableLabel}
        </button>
        <button className={btn(view === "cards")} onClick={() => setView("cards")}>
          {cardsLabel}
        </button>
      </div>
      {view === "cards" ? cards : table}
    </div>
  );
}
