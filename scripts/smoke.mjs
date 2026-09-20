// Robot de humo: recorre las paginas y APIs clave del sitio EN TU COMPUTADOR y avisa si algo falla.
// No usa Netlify ni gasta creditos: levanta la base local (muestra de 12.000 empresas) y el sitio compilado (`next start`).
//
// Uso:
//   npm run smoke                 requiere haber compilado antes (npm run build); lo hace `npm run check`
//   npm run smoke -- --url=http://localhost:3000    prueba un sitio ya corriendo (p. ej. `npm run dev:local`)
//
// Por seguridad NO prueba sitios remotos (cada visita a produccion despierta la base y gasta creditos),
// salvo que agregues --allow-remote.
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { LOCAL_URL, startLocalDb } from "./localdb.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argUrl = args.find((a) => a.startsWith("--url="))?.slice(6);
const allowRemote = args.includes("--allow-remote");
const PORT = 3100;
const BASE = (argUrl ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const SLOW_MS = 8000; // Netlify corta las funciones a ~10 s: avisar antes de llegar ahi
const TIMEOUT_MS = 90000;

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", D = "\x1b[2m", X = "\x1b[0m";
const results = [];
// Rutas que deben (true) o no deben (false) llevar cache de CDN. Se ajusta junto con next.config.ts.
const CDN_PATHS = [
  ["/", true], ["/sector", true], ["/provincias", true], ["/api/empresa/<RUC>/estados", true],
  // Deben salir SIN cache: dependen de parametros de la URL (ver next.config.ts)
  ["/empresa/<RUC>", false], ["/empresa/<RUC>?anio=2023", false], ["/ranking?vista=radar", false], ["/buscar", false], ["/api/search?q=a", false],
];
const LOG_FILE = path.join(ROOT, ".next", "smoke-server.log");
let logFd = null;
let dbDown = false;

function record(ok, name, ms, note = "", warn = false) {
  results.push({ ok, warn });
  const tag = ok ? (warn ? `${Y}LENTO${X}` : `${G}  OK ${X}`) : `${R}FALLA${X}`;
  console.log(`${tag}  ${name.padEnd(46)} ${String(ms).padStart(6)} ms  ${note ? D + note + X : ""}`);
}

async function get(url, init) {
  const t0 = Date.now();
  const res = await fetch(BASE + url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { res, t0, ms: () => Date.now() - t0 };
}

const BAD_HTML = ["Application error", "Internal Server Error", "Unhandled Runtime Error", "This page couldn’t load", "This page could not be found"];

// Pagina HTML: estado esperado, sin mensajes de error de Next y con contenido real.
async function page(url, { status = 200, expect = [], label } = {}) {
  const name = label ?? url;
  try {
    const { res, ms } = await get(url);
    const body = await res.text();
    const t = ms();
    const problems = [];
    if (res.status !== status) problems.push(`estado ${res.status} (se esperaba ${status})`);
    if (status === 200) {
      if (body.length < 2000) problems.push(`respuesta muy corta (${body.length} bytes)`);
      const bad = BAD_HTML.find((s) => body.includes(s));
      if (bad) problems.push(`contiene "${bad}"`);
      for (const e of expect) if (!body.toLowerCase().includes(String(e).toLowerCase())) problems.push(`no aparece "${e}"`);
    }
    if (problems.length) record(false, name, t, problems.join("; "));
    else record(true, name, t, `${Math.round(body.length / 1024)} KB`, t > SLOW_MS);
    return body;
  } catch (e) {
    record(false, name, 0, String(e.message ?? e));
    return "";
  }
}

async function waitFor(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function dbReachable() {
  const c = new pg.Client({ connectionString: LOCAL_URL, connectionTimeoutMillis: 2000 });
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    return false;
  }
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill();
  } catch {}
}

async function main() {
  const host = new URL(BASE).hostname;
  if (!["localhost", "127.0.0.1"].includes(host) && !allowRemote) {
    console.error(`${R}Rechazado:${X} ${BASE} no es local. Cada visita a produccion gasta creditos de Netlify. Usa --allow-remote solo si de verdad quieres hacerlo.`);
    process.exit(2);
  }

  let dbServer = null;
  let next = null;
  const cleanup = async () => {
    killTree(next);
    if (dbServer) await dbServer.stop().catch(() => {});
  };
  process.on("SIGINT", async () => { await cleanup(); process.exit(130); });

  try {
    // 1. Base local (se reutiliza si ya esta corriendo por probar-local.bat)
    if (await dbReachable()) {
      console.log(`${D}Base local ya activa: se reutiliza.${X}`);
    } else {
      console.log(`${D}Iniciando base local...${X}`);
      dbServer = await startLocalDb();
    }

    // 2. Sitio
    if (!argUrl) {
      if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
        console.error(`${R}No hay compilacion.${X} Ejecuta primero: npm run build   (o usa: npm run check)`);
        await cleanup();
        process.exit(2);
      }
      console.log(`${D}Iniciando el sitio compilado en ${BASE} ...${X}`);
      const env = { ...process.env, NETLIFY_DB_URL: LOCAL_URL, PORT: String(PORT) };
      delete env.NETLIFY_DB_DRIVER;
      logFd = fs.openSync(LOG_FILE, "w");
      next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { cwd: ROOT, env, stdio: ["ignore", logFd, logFd] });
      if (!(await waitFor(BASE + "/acerca", 60000))) {
        console.error(`${R}El sitio no arranco en 60 s.${X} Revisa que el puerto ${PORT} este libre y que npm run build termino bien.`);
        await cleanup();
        process.exit(1);
      }
    } else if (!(await waitFor(BASE + "/acerca", 15000))) {
      console.error(`${R}No hay sitio respondiendo en ${BASE}.${X}`);
      process.exit(1);
    }

    // 3. Datos de prueba: la empresa numero 1 del ranking local
    const c = new pg.Client({ connectionString: LOCAL_URL });
    await c.connect();
    const top = (
      await c.query(
        `SELECT c.ruc, c.nombre, f.anio FROM company_year_financials f JOIN companies c ON c.expediente = f.expediente
         WHERE f.anio = (SELECT max(anio) FROM company_year_financials WHERE posicion_general IS NOT NULL)
         ORDER BY f.posicion_general ASC NULLS LAST LIMIT 1`,
      )
    ).rows[0];
    await c.end();
    if (!top) throw new Error("La base local no tiene empresas. Ejecuta: python scripts/make-local-seed.py");
    const word = top.nombre.split(/\s+/).find((w) => w.length >= 4) ?? top.nombre;
    console.log(`\nEmpresa de prueba: ${top.nombre} (RUC ${top.ruc}, anio ${top.anio})\n`);

    // 4. Paginas principales
    const home = await page("/", { label: "/  (inicio)" });
    await page("/buscar");
    await page("/ranking");
    await page("/ranking?vista=radar", { label: "/ranking?vista=radar  (Radar Estrategico)" });
    const sectors = await page("/sector");
    await page("/provincias");
    await page("/acerca");
    await page("/versiones");

    // 5. Perfil de empresa y sector
    await page(`/empresa/${top.ruc}`, { expect: [word], label: "/empresa/<RUC>  (perfil)" });
    await page(`/empresa/${top.ruc}?anio=${top.anio - 2}`, { label: "/empresa/<RUC>?anio=<hace 2 anios>" });
    const sectorHref = sectors.match(/href="(\/sector\/[^"?#]+)"/)?.[1];
    if (sectorHref) await page(sectorHref, { label: `${sectorHref}  (detalle de sector)` });
    else record(false, "/sector/<codigo>", 0, "no se encontro ningun enlace a un sector en /sector");

    // 6. Paginas escondidas (huevos de pascua) y de error
    for (const p of ["/1999", "/2008", "/sucre", "/dolarizacion", "/empresas-antiguas"]) await page(p, { label: `${p}  (escondida)` });
    await page("/empresa/9999999999999", { status: 404, label: "/empresa/<RUC inexistente>  -> 404" });
    await page("/sector/ZZZ", { status: 404, label: "/sector/ZZZ  -> 404" });

    // 6b. Ahorro de creditos: robots.txt, sitemap y cabeceras de cache del CDN
    try {
      const { res, ms } = await get("/robots.txt");
      const txt = await res.text();
      const ok = res.status === 200 && txt.includes("GPTBot") && /Sitemap:/i.test(txt) && /User-Agent: \*/i.test(txt);
      record(ok, "/robots.txt  (bloquea bots, permite Google)", ms(), ok ? "" : `estado ${res.status}`);
    } catch (e) { record(false, "/robots.txt", 0, String(e.message ?? e)); }
    try {
      const { res, ms } = await get("/sitemap.xml");
      const txt = await res.text();
      const n = (txt.match(/<loc>/g) ?? []).length;
      record(res.status === 200 && n > 10, "/sitemap.xml", ms(), `${n} URLs`);
    } catch (e) { record(false, "/sitemap.xml", 0, String(e.message ?? e)); }
    for (const [p, expectCdn] of CDN_PATHS) {
      try {
        const { res, ms } = await get(p.replace("<RUC>", top.ruc));
        await res.arrayBuffer();
        const h = res.headers.get("netlify-cdn-cache-control") ?? "";
        const ok = expectCdn ? /s-maxage=\d+/.test(h) : !h;
        record(ok, `cache CDN ${expectCdn ? "activo" : "ausente"}: ${p}`, ms(), h || "(sin cache)");
      } catch (e) { record(false, `cache CDN ${p}`, 0, String(e.message ?? e)); }
    }

    // 7. APIs
    try {
      const { res, ms } = await get(`/api/search?q=${encodeURIComponent(word)}`);
      const j = await res.json();
      const ok = res.status === 200 && Array.isArray(j.results) && j.results.length > 0;
      record(ok, "/api/search?q=<nombre>", ms(), ok ? `${j.results.length} resultados` : "sin resultados o error");
    } catch (e) {
      record(false, "/api/search", 0, String(e.message ?? e));
    }
    try {
      const { res, ms } = await get(`/api/empresa/${top.ruc}/estados`);
      const txt = await res.text();
      const ok = res.status === 200 && txt.includes("anio,plan_de_cuentas");
      record(ok, "/api/empresa/<RUC>/estados  (CSV)", ms(), ok ? `${txt.split("\n").length - 1} filas` : `estado ${res.status}`);
    } catch (e) {
      record(false, "/api/empresa/<RUC>/estados", 0, String(e.message ?? e));
    }
    try {
      const { res, ms } = await get(`/api/empresa/${top.ruc}/informe?anio=${top.anio}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const t = ms();
      const ok = res.status === 200 && buf.subarray(0, 4).toString() === "%PDF" && buf.length > 20000;
      record(ok, "/api/empresa/<RUC>/informe  (PDF)", t, ok ? `${Math.round(buf.length / 1024)} KB` : `estado ${res.status}, ${buf.length} bytes`, ok && t > SLOW_MS);
    } catch (e) {
      record(false, "/api/empresa/<RUC>/informe", 0, String(e.message ?? e));
    }

    // 8. Archivos estaticos (CSS/JS) referenciados por la portada
    const assets = [...new Set([...home.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))].slice(0, 8);
    let assetFail = 0;
    for (const a of assets) {
      try {
        const { res } = await get(a);
        if (res.status !== 200) assetFail++;
      } catch { assetFail++; }
    }
    record(assets.length > 0 && assetFail === 0, "archivos CSS/JS de la portada", 0, `${assets.length - assetFail}/${assets.length} cargan`);

    // 9. Enlaces internos de la portada: ninguno debe estar roto
    const links = [...new Set([...home.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))].filter((l) => !l.startsWith("/_next") && !l.startsWith("/api/") && l !== "/").slice(0, 25);
    const broken = [];
    for (const l of links) {
      try {
        const { res } = await get(l);
        await res.arrayBuffer();
        if (res.status >= 400) broken.push(`${l} (${res.status})`);
      } catch (e) { broken.push(`${l} (${e.message})`); }
    }
    record(broken.length === 0, `enlaces de la portada (${links.length})`, 0, broken.length ? "rotos: " + broken.join(", ") : "todos responden");
  } finally {
    dbDown = !(await dbReachable()); // antes de apagarla, para saber si se cayo durante la prueba
    await cleanup();
  }

  const fails = results.filter((r) => !r.ok).length;
  if (fails > 0) {
    if (dbDown) {
      console.log(`\n${Y}Ojo:${X} la base local ya no responde. Si cerraste probar-local.bat durante la prueba, repite; los errores 500 pueden ser por eso.`);
    }
    try {
      const errs = fs.readFileSync(LOG_FILE, "utf8").split("\n").filter((l) => /⨯|Error:/.test(l)).slice(0, 5);
      if (errs.length) console.log(`${D}Errores del servidor (log completo: ${LOG_FILE}):\n  ${errs.map((l) => l.trim().slice(0, 160)).join("\n  ")}${X}`);
    } catch {}
  }
  const slow = results.filter((r) => r.ok && r.warn).length;
  console.log(`\n${fails === 0 ? G : R}${results.length - fails} de ${results.length} pruebas correctas${X}${slow ? `  ${Y}(${slow} lentas: cerca del limite de ~10 s de Netlify)${X}` : ""}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(`${R}Error del robot:${X}`, e);
  process.exit(1);
});
