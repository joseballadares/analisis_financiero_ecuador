import { db, VEN } from "@/lib/db";

export const dynamic = "force-dynamic";
const VEN_F = VEN.replace(/metrics/g, "f.metrics");

// TEMPORAL: mide cada consulta de "empresas interesantes".
export async function GET(request: Request) {
  const step = new URL(request.url).searchParams.get("s") ?? "a";
  const anio = 2025;
  const database = db();
  const t0 = Date.now();
  let n = 0;
  if (step === "a") {
    const r = await database.sql`SELECT f.expediente FROM company_year_financials f WHERE f.anio = ${anio} AND ${database.sql.raw(VEN_F)} > 0 ORDER BY ${database.sql.raw(VEN_F)} DESC LIMIT 2000`;
    n = r.length;
  } else if (step === "b") {
    const r = await database.sql`SELECT count(*)::int AS n FROM (SELECT f.expediente, rank() OVER (PARTITION BY f.anio ORDER BY ${database.sql.raw(VEN_F)} DESC) AS r FROM company_year_financials f WHERE f.anio IN (2021, 2025) AND ${database.sql.raw(VEN_F)} > 0) x`;
    n = (r[0] as { n: number }).n;
  } else if (step === "c") {
    const r = await database.sql`
      WITH pool AS (SELECT f.expediente FROM company_year_financials f WHERE f.anio = ${anio} AND ${database.sql.raw(VEN_F)} > 0 ORDER BY ${database.sql.raw(VEN_F)} DESC LIMIT 2000)
      SELECT f.expediente FROM company_year_financials f JOIN pool p ON p.expediente = f.expediente JOIN companies c ON c.expediente = f.expediente WHERE f.anio BETWEEN 2021 AND 2025`;
    n = r.length;
  } else if (step === "d") {
    const r = await database.sql`
      WITH pool AS (SELECT f.expediente FROM company_year_financials f WHERE f.anio = ${anio} AND ${database.sql.raw(VEN_F)} > 0 ORDER BY ${database.sql.raw(VEN_F)} DESC LIMIT 2000)
      SELECT b.expediente FROM balance_line_items b JOIN pool p ON p.expediente = b.expediente WHERE b.anio = ${anio} AND b.catalog_id = 3`;
    n = r.length;
  } else if (step === "e") {
    const r = await database.sql`SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('company_year_financials','balance_line_items','companies')`;
    return Response.json(r);
  }
  return Response.json({ step, n, ms: Date.now() - t0 });
}
