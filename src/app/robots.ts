import type { MetadataRoute } from "next";

// Objetivo: gastar pocos creditos de Netlify. Cada visita a una pagina con datos despierta la base de datos (se cobra por
// hora encendida), asi que se deja pasar a los buscadores reales y se bloquea a los rastreadores de SEO, IA y copiado masivo.
// Los bots educados obedecen este archivo; los que no, no se pueden frenar desde aqui.
const BLOCKED_BOTS = [
  // Rastreadores de IA y entrenamiento
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "CCBot", "PerplexityBot",
  "Bytespider", "Amazonbot", "Applebot-Extended", "Google-Extended", "meta-externalagent", "FacebookBot", "cohere-ai",
  "Diffbot", "ImagesiftBot", "Omgilibot", "YouBot", "Timpibot",
  // Herramientas de SEO y datos
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "DataForSeoBot", "BLEXBot", "serpstatbot", "SeznamBot",
  "MegaIndex", "Barkrowler", "ZoominfoBot",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/buscar", "/empresas-antiguas", "/1999", "/2008", "/sucre", "/dolarizacion"];
  return {
    rules: [
      { userAgent: BLOCKED_BOTS, disallow: "/" },
      // Buscadores: pueden ver todo salvo las rutas de arriba. Crawl-delay lo respetan Bing y otros (Google lo ignora).
      { userAgent: "*", allow: "/", disallow, crawlDelay: 10 },
    ],
    sitemap: "https://analisisfinancieroecuador.netlify.app/sitemap.xml",
  };
}
