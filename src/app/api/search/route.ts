import { NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  const results = await searchCompanies(q, 15);
  // Cache solo del navegador (private): repetir la misma busqueda no vuelve a despertar la base de datos.
  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
