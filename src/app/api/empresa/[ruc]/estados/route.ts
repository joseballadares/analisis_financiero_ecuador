import { NextRequest, NextResponse } from "next/server";
import { getCompanyByRuc } from "@/lib/db";
import { getCatalogNames, getCompanyBalanceRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ ruc: string }> }) {
  const { ruc } = await ctx.params;
  const company = await getCompanyByRuc(ruc);
  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  const rows = await getCompanyBalanceRows(company.expediente);
  const names = await getCatalogNames([...new Set(rows.map((r) => r.catalog_id))]);
  const lines = ["anio,plan_de_cuentas,codigo,cuenta,valor_usd"];
  for (const r of rows) {
    const catalog = r.catalog_id === 3 ? "NIIF" : "Formulario SRI";
    for (const code of Object.keys(r.data).sort()) {
      lines.push([r.anio, catalog, code, esc(names[r.catalog_id]?.[code] ?? code), r.data[code]].join(","));
    }
  }
  const filename = `estados-financieros-${company.ruc}.csv`;
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
