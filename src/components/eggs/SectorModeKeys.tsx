"use client";

import { useEffect } from "react";
import { SECTOR_LABEL, TYPED_WORDS, fireEgg, sectorOfCiiu } from "@/lib/eggs";
import { getSectorMode, setSectorMode } from "@/components/eggs/sectorMode";

// En el perfil de una empresa de banano, cacao, camarón, petróleo o minería, teclear la palabra de su sector
// cambia los puntos de los gráficos del Resumen por el ícono del sector. Teclearla de nuevo lo apaga.
export default function SectorModeKeys({ ciiu }: { ciiu: string | null }) {
  useEffect(() => {
    const own = sectorOfCiiu(ciiu);
    setSectorMode(null);
    if (!own) return;
    let buf = "";
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      buf = (buf + e.key.toLowerCase()).slice(-12);
      const word = TYPED_WORDS.find((w) => buf.endsWith(w));
      if (word !== own) return;
      buf = "";
      const next = getSectorMode() === own ? null : own;
      setSectorMode(next);
      fireEgg({ type: "toast", text: next ? `Modo ${SECTOR_LABEL[own]}` : `Modo ${SECTOR_LABEL[own]} desactivado`, ms: 2500 });
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setSectorMode(null);
    };
  }, [ciiu]);
  return null;
}
