import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "@/lib/db";

// RUTA TEMPORAL: carga el catastro del SRI (ruc_catastro_NN.tsv, guardado en Netlify Blobs) a la tabla ruc_catastro.
// Solo responde con la clave SEED_SECRET y se elimina después de la carga.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const COLS = [
  "ruc", "estado", "clase", "tipo", "fecha_inicio", "fecha_suspension", "fecha_reinicio", "fecha_actualizacion", "obligado", "agente_retencion",
  "especial", "n_establecimientos", "n_abiertos", "n_provincias", "provincia_est", "canton_est", "parroquia_est", "ciiu_sri", "nombre_comercial",
];
const DATES = new Set(["fecha_inicio", "fecha_suspension", "fecha_reinicio", "fecha_actualizacion"]);
const INTS = new Set(["n_establecimientos", "n_abiertos", "n_provincias"]);

function authorized(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return !!secret && !!process.env.SEED_SECRET && secret === process.env.SEED_SECRET;
}

async function ensureTable() {
  await db().pool.query(`
    CREATE TABLE IF NOT EXISTS ruc_catastro (
      ruc text PRIMARY KEY, estado text, clase text, tipo text, fecha_inicio date, fecha_suspension date, fecha_reinicio date,
      fecha_actualizacion date, obligado text, agente_retencion text, especial text, n_establecimientos integer, n_abiertos integer,
      n_provincias integer, provincia_est text, canton_est text, parroquia_est text, ciiu_sri text, nombre_comercial text
    );
    CREATE INDEX IF NOT EXISTS idx_ruc_catastro_inicio ON ruc_catastro (fecha_inicio);
  `);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const part = (req.nextUrl.searchParams.get("part") ?? "").padStart(2, "0");
  const text = await getStore({ name: "afe-seed" }).get(`ruc_catastro_${part}.tsv`, { type: "text" });
  if (!text) return NextResponse.json({ error: `parte ${part} no encontrada` }, { status: 404 });
  await ensureTable();

  const rows = text.split("\n").filter(Boolean).map((l) => l.split("\t"));
  const select = COLS.map((c, i) => {
    const v = `t.c${i}`;
    if (DATES.has(c)) return `NULLIF(${v}, '')::date`;
    if (INTS.has(c)) return `NULLIF(${v}, '')::integer`;
    return `NULLIF(${v}, '')`;
  }).join(", ");
  const args = COLS.map((_, i) => `$${i + 1}::text[]`).join(", ");
  const alias = COLS.map((_, i) => `c${i}`).join(", ");
  const sql = `INSERT INTO ruc_catastro (${COLS.join(", ")}) SELECT ${select} FROM unnest(${args}) AS t(${alias}) ON CONFLICT (ruc) DO NOTHING`;

  let inserted = 0;
  const BATCH = 4000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params = COLS.map((_, c) => chunk.map((r) => (r[c] === undefined || r[c] === "\N" ? "" : r[c])));
    const res = await db().pool.query(sql, params);
    inserted += res.rowCount ?? 0;
  }
  return NextResponse.json({ part, filas: rows.length, insertadas: inserted });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { rows } = await db().pool.query("SELECT count(*)::int AS n, min(fecha_inicio)::text AS min_fecha FROM ruc_catastro");
    return NextResponse.json({ ruc_catastro: rows[0] });
  } catch (e) {
    return NextResponse.json({ ruc_catastro: `error: ${(e as Error).message}` });
  }
}
