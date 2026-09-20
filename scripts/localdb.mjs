// Base de datos PostgreSQL local para probar el sitio sin publicar en Netlify.
// Uso: node scripts/localdb.mjs        (deja la base corriendo; Ctrl+C para detenerla)
// La primera vez crea la base, aplica las migraciones y carga los datos de C:\dev\afe-localdb\seed
// (se generan con: python scripts/make-local-seed.py).
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = process.env.AFE_LOCALDB_DIR ?? "C:/dev/afe-localdb";
const PORT = Number(process.env.AFE_LOCALDB_PORT ?? 54329);
export const LOCAL_URL = `postgres://postgres:postgres@localhost:${PORT}/afe`;

// tabla -> columnas en el orden del archivo TSV
const SEED = [
  ["chart_of_accounts_catalogs", "id, sha1, label, first_year, last_year, n_entries"],
  ["chart_of_accounts_entries", "catalog_id, codigo, nombre"],
  ["ciiu", "codigo, descripcion"],
  ["segmentos", "id, nombre"],
  ["sector_indicators", "anio, ciiu_n1, descripcion, metrics"],
  ["companies", "expediente, ruc, nombre, tipo, provincia_codigo, provincia"],
  ["company_year_financials", "anio, expediente, posicion_general, cod_segmento, ciiu_n1, ciiu_n6, metrics"],
  ["balance_line_items", "expediente, ruc, anio, catalog_id, ciiu, data"],
];

export async function startLocalDb() {
  const dataDir = path.join(DIR, "data");
  const first = !fs.existsSync(path.join(dataDir, "PG_VERSION"));
  const server = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "postgres", port: PORT, persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"] });
  if (first) await server.initialise();
  await server.start();
  if (first) await server.createDatabase("afe");

  const client = new pg.Client({ connectionString: LOCAL_URL });
  await client.connect();
  const { rows } = await client.query("SELECT to_regclass('public.companies') AS t");
  if (!rows[0].t) {
    console.log("Creando tablas (migraciones)…");
    const migDir = path.join(ROOT, "netlify", "database", "migrations");
    for (const d of fs.readdirSync(migDir).sort()) {
      const file = path.join(migDir, d, "migration.sql");
      if (fs.existsSync(file)) await client.query(fs.readFileSync(file, "utf-8"));
    }
    const seedDir = path.join(DIR, "seed");
    if (!fs.existsSync(seedDir)) {
      console.log(`Falta ${seedDir}. Ejecuta primero: python scripts/make-local-seed.py`);
    } else {
      for (const [table, cols] of SEED) {
        const file = path.join(seedDir, `${table}.tsv`).replace(/\\/g, "/");
        const t0 = Date.now();
        await client.query(`COPY ${table} (${cols}) FROM '${file}'`);
        const n = (await client.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
        console.log(`  ${table}: ${n} filas (${Math.round((Date.now() - t0) / 1000)} s)`);
      }
      await client.query("ANALYZE");
    }
  }
  await client.end();
  return server;
}

// Ejecución directa: deja la base corriendo hasta Ctrl+C.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startLocalDb();
  console.log(`Base local lista en ${LOCAL_URL}`);
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
