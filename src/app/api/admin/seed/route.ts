import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { getDatabase } from "@netlify/database";
import copyFrom from "pg-copy-streams";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const RANKING_PARTS = Array.from(
  { length: 12 },
  (_, i) => `company_year_financials_part_${String(i).padStart(2, "0")}.tsv`
);

const TABLES: { table: string; columns: string[]; files: string[] }[] = [
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

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const only = req.nextUrl.searchParams.get("only");

  const store = getStore({ name: "afe-seed" });
  const db = getDatabase();
  const results: Record<string, string> = {};

  for (const t of TABLES) {
    if (only && t.table !== only) continue;
    const started = Date.now();
    try {
      for (const file of t.files) {
        const blob = await store.get(file, { type: "stream" });
        if (!blob) {
          results[t.table] = `${file}: not found in blob store`;
          continue;
        }
        const client = await db.pool.connect();
        try {
          const sql = `COPY ${t.table} (${t.columns.join(", ")}) FROM STDIN WITH (FORMAT text)`;
          const dbStream = client.query(copyFrom.from(sql));
          const nodeStream = Readable.fromWeb(blob as never);
          await new Promise<void>((resolve, reject) => {
            nodeStream.on("error", reject);
            dbStream.on("error", reject);
            dbStream.on("finish", () => resolve());
            nodeStream.pipe(dbStream);
          });
        } finally {
          client.release();
        }
      }
      results[t.table] = `ok (${t.files.length} archivo(s)) en ${((Date.now() - started) / 1000).toFixed(1)}s`;
    } catch (e) {
      results[t.table] = `error: ${(e as Error).message}`;
    }
  }

  return NextResponse.json({ results });
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getDatabase();
  const counts: Record<string, number | string> = {};
  for (const t of TABLES) {
    try {
      const [row] = await db.sql<{ n: number }>`SELECT count(*)::int as n FROM ${db.sql.identifier({ table: t.table })}`;
      counts[t.table] = row?.n ?? -1;
    } catch (e) {
      counts[t.table] = `error: ${(e as Error).message}`;
    }
  }
  return NextResponse.json({ counts });
}
