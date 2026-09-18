import SearchBox from "@/components/SearchBox";
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-24 text-center">
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
        Análisis financiero de empresas del Ecuador
      </h1>
      <p className="mt-4 text-lg text-muted">
        Ratios, estados financieros y comparables sectoriales de más de 340,000 compañías,
        a partir de datos oficiales de la Superintendencia de Compañías.
      </p>
      <div className="mt-10">
        <SearchBox autoFocus />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted">
        <span>Explora también:</span>
        <Link href="/ranking" className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand transition-colors">
          Ranking de empresas
        </Link>
        <Link href="/sector" className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand transition-colors">
          Análisis por sector
        </Link>
        <Link href="/buscar" className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand transition-colors">
          Búsqueda avanzada
        </Link>
        <Link href="/provincias" className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand transition-colors">
          Provincias
        </Link>
        <Link href="/acerca" className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand transition-colors">
          Metodología
        </Link>
      </div>
    </div>
  );
}
