import { BOOBY, GALAPAGOS_MAP } from "@/lib/eggs/galapagosArt";

const artCls = "m-0 whitespace-pre bg-transparent font-mono text-[6.6px] leading-[6.6px] opacity-90";

// Sorpresa para las empresas radicadas en Galápagos: el archipiélago y el piquero de patas azules, en arte ASCII.
export default function GalapagosArt() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-6 overflow-x-auto border-t border-border pt-8 text-foreground">
      <pre className={artCls} role="img" aria-label="Mapa de las islas Galápagos">
        {GALAPAGOS_MAP}
      </pre>
      <p className="text-center font-mono text-xl font-bold leading-tight">
        I love
        <br />
        Boobies
      </p>
      <pre className={artCls} role="img" aria-label="Piquero de patas azules">
        {BOOBY}
      </pre>
    </div>
  );
}
