import Link from "next/link";
import { CURRENT_VERSION } from "@/lib/versions";

const linkCls = "text-muted transition-colors hover:text-foreground";
const headCls = "text-[11px] font-semibold uppercase tracking-wider text-foreground";

function Soon({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted">
      {children} <em className="text-[12px]">— Pronto</em>
    </span>
  );
}

// Pie de página de todo el sitio: quiénes somos, de dónde salen los datos y mapa de secciones.
export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">EF</span>
            Ecuador Financiero
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Datos financieros de empresas ecuatorianas. Fuente: Superintendencia de Compañías, Valores y Seguros del Ecuador — 2008–2025.
          </p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">
            Proyecto independiente, sin afiliación oficial. Solo informativo: no ofrece consejos de inversión ni asesoría financiera.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <h3 className={headCls}>Plataforma</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/" className={linkCls}>Inicio</Link></li>
              <li><Link href="/buscar" className={linkCls}>Buscar empresas</Link></li>
              <li><Link href="/ranking" className={linkCls}>Ranking</Link></li>
              <li><Link href="/sector" className={linkCls}>Sectores</Link></li>
              <li><Link href="/provincias" className={linkCls}>Provincias</Link></li>
            </ul>
          </div>
          <div>
            <h3 className={headCls}>Producto</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/ranking?vista=radar" className={linkCls}>Radar Estratégico</Link></li>
              <li><Soon>Mercado de Valores</Soon></li>
              <li><Soon>Compras Públicas</Soon></li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <h3 className={headCls}>Información</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/acerca" className={linkCls}>Acerca de</Link></li>
              <li><Link href="/acerca#metodologia" className={linkCls}>Metodología y fuentes</Link></li>
              <li><Link href="/acerca#aviso" className={linkCls}>Aviso legal</Link></li>
              <li><Link href="/versiones" className={linkCls}>Versiones</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl border-t border-border px-4 py-4 text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} Ecuador Financiero · Datos públicos de la Superintendencia de Compañías, Valores y Seguros ·{" "}
        <span className="group relative inline-block">
          <Link href="/versiones" className="underline hover:text-foreground">
            v{CURRENT_VERSION.version}
          </Link>
          {/* Sorpresa: al pasar el cursor (o enfocar la versión) aparece el autor, con enlace a su perfil. */}
          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 -translate-x-1/2 pb-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <a
              href="https://www.linkedin.com/in/joseballadares/"
              target="_blank"
              rel="noopener noreferrer"
              className="block whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground shadow-md hover:text-brand"
            >
              Hecho por José Balladares
            </a>
          </span>
        </span>
      </div>
    </footer>
  );
}
