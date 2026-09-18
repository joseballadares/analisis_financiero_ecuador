import { NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  const results = await searchCompanies(q, 15);
  return NextResponse.json({ results });
}
