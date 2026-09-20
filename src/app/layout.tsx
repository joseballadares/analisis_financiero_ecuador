import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import EasterEggs from "@/components/eggs/EasterEggs";
import SiteFooter from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ecuador Financiero — Perfiles y ratios de empresas",
  description:
    "Buscador y análisis financiero de empresas del Ecuador: ratios, comparables y benchmarks por sector, a partir de datos de la Superintendencia de Compañías.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white text-sm font-bold">
                EF
              </span>
              Ecuador Financiero
            </Link>
            <nav className="flex items-center gap-4 sm:gap-6 text-sm text-muted">
              <Link href="/buscar" className="hover:text-foreground transition-colors">
                Buscar
              </Link>
              <Link href="/ranking" className="hover:text-foreground transition-colors">
                Ranking
              </Link>
              <Link href="/sector" className="hover:text-foreground transition-colors">
                Sectores
              </Link>
              <Link href="/provincias" className="hidden sm:inline hover:text-foreground transition-colors">
                Provincias
              </Link>
              <Link href="/acerca" className="hidden sm:inline hover:text-foreground transition-colors">
                Metodología
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <EasterEggs />
      </body>
    </html>
  );
}
