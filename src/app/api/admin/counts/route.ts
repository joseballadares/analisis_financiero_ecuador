import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@netlify/database";

export const dynamic = "force-dynamic";

const TABLES = [
  "companies",
  "ciiu",
  "segmentos",
  "sector_indicators",
  "company_year_financials",
  "chart_of_accounts_catalogs",
  "chart_of_accounts_entries",
  "balance_line_items",
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getDatabase();
  const counts: Record<string, number | string> = {};
  for (const table of TABLES) {
    try {
      const [row] = await db.sql<{ n: number }>`SELECT count(*)::int as n FROM ${db.sql.identifier({ table })}`;
      counts[table] = row?.n ?? -1;
    } catch (e) {
      counts[table] = `error: ${(e as Error).message}`;
    }
  }
  return NextResponse.json({ counts });
}
