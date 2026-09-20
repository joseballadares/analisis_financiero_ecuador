import { useSyncExternalStore } from "react";
import type { SectorKind } from "@/lib/eggs";

// "Modo sector": cuando está activo, los gráficos interactivos del Resumen dibujan el ícono del sector en lugar de puntos.
let mode: SectorKind | null = null;
const subs = new Set<() => void>();

export function setSectorMode(next: SectorKind | null) {
  mode = next;
  subs.forEach((fn) => fn());
}
export const getSectorMode = () => mode;

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function useSectorMode(): SectorKind | null {
  return useSyncExternalStore(subscribe, getSectorMode, () => null);
}
