// Carga unica de datos a Postgres desde Netlify Blobs. Pensado para correr
// UNA vez como parte del build de produccion (ver netlify.toml / SEED_ON_DEPLOY),
// leyendo los archivos subidos previamente con `netlify blobs:set afe-seed <file>`.
//
// Se activa solo si SEED_ON_DEPLOY=true está seteado como env var del sitio,
// para no re-ejecutar la carga en cada deploy futuro.

import { getStore } from "@netlify/blobs";
import { getConnectionString } from "@netlify/database";
import pg from "pg";
import copyFrom from "pg-copy-streams";
import { Readable } from "node:stream";

if (process.env.SEED_ON_DEPLOY !== "true") {
  console.log("[seed] SEED_ON_DEPLOY != true, skipping.");
  process.exit(0);
}

const RANKING_PARTS = Array.from(
  { length: 12 },
  (_, i) => `company_year_financials_part_${String(i).padStart(2, "0")}.tsv`
);

const TABLES = [
  {
    table: "companies",
    columns: ["expediente", "ruc", "nombre", "tipo", "provincia_codigo", "provincia"],
    files: ["companies.tsv"],
  },
  { table: "ciiu", columns: ["codigo", "descripcion"], files: ["ciiu.tsv"] },
  { table: "segmentos", columns: ["id", "nombre"], files: ["segmentos.tsv"] },
  {
    table: "sector_indicators",
    columns: ["anio", "ciiu_n1", "descripcion", "metrics"],
    files: ["sector_indicators.tsv"],
  },
  {
    table: "company_year_financials",
    columns: ["anio", "expediente", "posicion_general", "cod_segmento", "ciiu_n1", "ciiu_n6", "metrics"],
    files: RANKING_PARTS,
  },
  {
    table: "chart_of_accounts_catalogs",
    columns: ["id", "sha1", "label", "first_year", "last_year", "n_entries"],
    files: ["chart_of_accounts_catalogs.tsv"],
  },
  {
    table: "chart_of_accounts_entries",
    columns: ["catalog_id", "codigo", "nombre"],
    files: ["chart_of_accounts_entries.tsv"],
  },
  {
    table: "balance_line_items",
    columns: ["expediente", "ruc", "anio", "catalog_id", "ciiu", "data"],
    files: ["balance_line_items.tsv"],
  },
];

async function main() {
  const store = getStore({ name: "afe-seed", consistency: "strong" });
  const client = new pg.Client({ connectionString: getConnectionString() });
  await client.connect();

  const [{ n: already }] = (
    await client.query("select count(*)::int as n from companies")
  ).rows;
  if (already > 0) {
    console.log(`[seed] companies ya tiene ${already} filas, se asume ya cargado. Abortando.`);
    await client.end();
    return;
  }

  for (const t of TABLES) {
    const started = Date.now();
    for (const file of t.files) {
      const blob = await store.get(file, { type: "stream" });
      if (!blob) {
        console.log(`[seed] ${file} no encontrado en el store, se salta.`);
        continue;
      }
      const sql = `COPY ${t.table} (${t.columns.join(", ")}) FROM STDIN WITH (FORMAT text)`;
      const dbStream = client.query(copyFrom.from(sql));
      await new Promise((resolve, reject) => {
        const nodeStream = Readable.fromWeb(blob);
        nodeStream.on("error", reject);
        dbStream.on("error", reject);
        dbStream.on("finish", resolve);
        nodeStream.pipe(dbStream);
      });
    }
    console.log(
      `[seed] ${t.table} <- ${t.files.length} archivo(s) ok en ${((Date.now() - started) / 1000).toFixed(1)}s`
    );
  }

  await client.end();
  console.log("[seed] listo.");
}

main().catch((err) => {
  console.error("[seed] error:", err);
  process.exit(1);
});
