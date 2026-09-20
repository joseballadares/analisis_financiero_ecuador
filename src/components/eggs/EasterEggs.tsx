"use client";

import { useEffect, useState } from "react";
import { EGG_EVENT, markSeen, seenThisSession, type EggDetail, type SectorKind } from "@/lib/eggs";
import { HesoyamOverlay, SectorOverlay, makeBills, type Bill } from "@/components/eggs/Overlays";
import { NAME_ART } from "@/lib/eggs/consoleArt";

type Overlay = { id: number; kind: "hesoyam"; bills: Bill[] } | { id: number; kind: SectorKind };
type Toast = { id: number; text: string };

const COOLDOWN_MS = 10_000;

// Capa global de sorpresas: animaciones activadas por el buscador y avisos (por ejemplo el de la madrugada).
export default function EasterEggs() {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    // Mensaje escondido para quien abra la consola del navegador (una sola vez por carga).
    const w = window as unknown as { __efConsole?: boolean };
    if (!w.__efConsole) {
      w.__efConsole = true;
      console.log(`%c${NAME_ART}`, "color:#2bb894;font-family:monospace;font-weight:bold");
    }

    let seq = 0;
    let overlayTimer: ReturnType<typeof setTimeout> | undefined;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    let nightTimer: ReturnType<typeof setTimeout> | undefined;
    const last: Record<string, number> = {};

    function showToast(text: string, ms = 6000) {
      clearTimeout(toastTimer);
      setToast({ id: ++seq, text });
      toastTimer = setTimeout(() => setToast(null), ms);
    }

    function showOverlay(kind: "hesoyam" | SectorKind) {
      const now = Date.now();
      if (last[kind] && now - last[kind] < COOLDOWN_MS) return;
      last[kind] = now;
      clearTimeout(overlayTimer);
      setOverlay(kind === "hesoyam" ? { id: ++seq, kind, bills: makeBills() } : { id: ++seq, kind });
      overlayTimer = setTimeout(() => setOverlay(null), kind === "hesoyam" ? 5600 : 3500);
    }

    function onEgg(e: Event) {
      const d = (e as CustomEvent<EggDetail>).detail;
      if (!d) return;
      if (d.type === "hesoyam") showOverlay("hesoyam");
      else if (d.type === "sector") showOverlay(d.kind);
      else if (d.type === "toast") showToast(d.text, d.ms);
    }
    window.addEventListener(EGG_EVENT, onEgg);

    // Madrugada: entre las 00:00 y las 03:59 (hora del navegador), una vez por sesión.
    if (new Date().getHours() < 4 && !seenThisSession("egg_madrugada")) {
      nightTimer = setTimeout(() => {
        markSeen("egg_madrugada");
        showToast("¿Analizando empresas a esta hora? Ánimo 💪");
      }, 3000);
    }

    return () => {
      window.removeEventListener(EGG_EVENT, onEgg);
      clearTimeout(overlayTimer);
      clearTimeout(toastTimer);
      clearTimeout(nightTimer);
    };
  }, []);

  return (
    <>
      {overlay?.kind === "hesoyam" && <HesoyamOverlay key={overlay.id} bills={overlay.bills} />}
      {overlay && overlay.kind !== "hesoyam" && <SectorOverlay key={overlay.id} kind={overlay.kind} />}
      {toast && (
        <div
          key={toast.id}
          role="status"
          onClick={() => setToast(null)}
          className="egg-toast fixed bottom-4 left-4 z-[60] flex max-w-xs cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-lg"
        >
          <span>{toast.text}</span>
          <button type="button" aria-label="Cerrar aviso" className="-mr-1 leading-none text-muted hover:text-foreground">
            ×
          </button>
        </div>
      )}
    </>
  );
}
