import type { SectorKind } from "@/lib/eggs";

// Dibujos de los sectores en una cuadrícula de 24 x 24. Se usan en las animaciones y como marcadores de los gráficos.
export function SectorGlyph({ kind }: { kind: SectorKind }) {
  switch (kind) {
    case "banano":
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M3.2 8.6 C4.6 18.6 15.4 22.4 21.4 7.8 L19.2 7 C14.6 15.2 8.4 14.8 5.6 7.9 Z" fill="#f7cd3b" stroke="#8a6a00" strokeWidth="1.1" />
          <path d="M3.2 8.6 L2.6 5.6 L5.2 6.2 L5.6 7.9 Z" fill="#6b4f1d" stroke="#4a3510" strokeWidth="0.8" />
          <path d="M19.2 7 L21.4 7.8 L21.9 6.4 L20.1 5.8 Z" fill="#6b4f1d" stroke="#4a3510" strokeWidth="0.6" />
          <path d="M6.2 11.2 C10 15.2 15 14.2 18.4 9.6" fill="none" stroke="#d9a800" strokeWidth="0.9" />
        </g>
      );
    case "cacao":
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <ellipse cx="12" cy="13" rx="6" ry="9" transform="rotate(28 12 13)" fill="#c8682b" stroke="#6b3110" strokeWidth="1.1" />
          <path d="M9.6 5.6 C7 10 8 16.4 12.8 20.4" fill="none" stroke="#8a4318" strokeWidth="0.9" />
          <path d="M12.8 4.6 C11.4 9.4 12.8 15 17.4 18.6" fill="none" stroke="#8a4318" strokeWidth="0.9" />
          <path d="M16 6.4 C15.6 10.4 17 14 19.8 16.2" fill="none" stroke="#8a4318" strokeWidth="0.9" />
          <path d="M8.4 3.2 L9.8 5.4" stroke="#5a3d18" strokeWidth="1.6" />
        </g>
      );
    case "camaron":
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M6 5.6 C13.6 2.6 21.4 8.4 18 16.4 C16.8 19.2 13 20.2 10.8 18 C15.2 16 15.8 11.4 12.2 9.6 C9.2 8.2 7 8.8 6 5.6 Z" fill="#ff8d5e" stroke="#a5401d" strokeWidth="1.1" />
          <path d="M10.8 18 L8 21.4 L12.4 21.4 L14.6 19.2 Z" fill="#ff6f3d" stroke="#a5401d" strokeWidth="1" />
          <path d="M6 5.6 L3 3.4 M6.4 6.6 L2.8 6.4" stroke="#a5401d" strokeWidth="0.9" fill="none" />
          <circle cx="8" cy="6.9" r="0.9" fill="#20120b" />
          <path d="M14 7.4 C15.6 9 16 11.4 15.2 13.4 M17 8.6 C18.2 10.6 18 13 17.2 14.6" stroke="#c9532a" strokeWidth="0.8" fill="none" />
        </g>
      );
    case "petroleo":
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 2.4 C12 2.4 5 10.2 5 15 A7 7 0 0 0 19 15 C19 10.2 12 2.4 12 2.4 Z" fill="#1b1d22" stroke="#8b93a3" strokeWidth="1" />
          <path d="M8.6 14.4 C8.6 16.2 9.6 17.8 11.2 18.6" fill="none" stroke="#aab2c0" strokeWidth="1.3" />
        </g>
      );
    case "mineria":
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M6.4 8.4 H17.6 L21.2 12.6 H2.8 Z" fill="#ffe27a" stroke="#8a6500" strokeWidth="1" />
          <path d="M2.8 12.6 H21.2 V18 H2.8 Z" fill="#e6ac0c" stroke="#8a6500" strokeWidth="1" />
          <path d="M5.4 14.4 H9 M5.4 16.2 H7.4" stroke="#fff3b0" strokeWidth="0.9" />
        </g>
      );
  }
}

export function SectorIcon({ kind, size = 64, className }: { kind: SectorKind; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <SectorGlyph kind={kind} />
    </svg>
  );
}
