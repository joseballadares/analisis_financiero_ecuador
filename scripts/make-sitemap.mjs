// Genera public/sitemap.xml (archivo estatico: no usa funciones ni base de datos en produccion).
// Lista las paginas principales, los sectores y las N empresas mas grandes (segun la base local).
// Se mantiene chico a proposito: cada pagina que Google rastrea por primera vez despierta la base de datos y cuesta creditos.
// Uso: node scripts/make-sitemap.mjs [N]      (N = empresas a incluir, por defecto 300)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { LOCAL_URL, startLocalDb } from "./localdb.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://analisisfinancieroecuador.netlify.app";
const N = Number(process.argv[2] ?? 300);

async function reachable() {
  const c = new pg.Client({ connectionString: LOCAL_URL, connectionTimeoutMillis: 2000 });
  try { await c.connect(); await c.end(); return true; } catch { return false; }
}

const server = (await reachable()) ? null : await startLocalDb();
const c = new pg.Client({ connectionString: LOCAL_URL });
await c.connect();
const anio = (await c.query("SELECT max(anio) AS a FROM company_year_financials WHERE posicion_general IS NOT NULL")).rows[0].a;
const sectors = (await c.query("SELECT codigo FROM ciiu WHERE length(codigo) = 1 ORDER BY codigo")).rows.map((r) => r.codigo);
const companies = (
  await c.query(
    `SELECT c.ruc FROM company_year_financials f JOIN companies c ON c.expediente = f.expediente
     WHERE f.anio = $1 AND f.posicion_general IS NOT NULL AND c.ruc ~ '^[0-9]{13}$'
     ORDER BY f.posicion_general ASC LIMIT $2`,
    [anio, N],
  )
).rows.map((r) => r.ruc);
await c.end();
if (server) await server.stop().catch(() => {});

const urls = ["/", "/ranking", "/sector", "/provincias", "/acerca", "/versiones", ...sectors.map((s) => `/sector/${s}`), ...[...new Set(companies)].map((r) => `/empresa/${r}`)];
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, "public", "sitemap.xml"), xml);
console.log(`public/sitemap.xml: ${urls.length} URLs (${sectors.length} sectores, ${new Set(companies).size} empresas, anio ${anio})`);
