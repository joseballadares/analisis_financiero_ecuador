import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { loadCompanyBundle } from "@/lib/companyData";
import InformeDocument from "@/lib/report/Document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Informe profesional en PDF de una empresa y un año: /api/empresa/<ruc>/informe?anio=2025
export async function GET(request: Request, ctx: { params: Promise<{ ruc: string }> }) {
  const { ruc } = await ctx.params;
  const anio = new URL(request.url).searchParams.get("anio") ?? undefined;
  const loaded = await loadCompanyBundle(ruc, anio);
  if (loaded.kind === "notfound") return new Response("Empresa no encontrada", { status: 404 });
  if (loaded.kind === "nodata") return new Response("La empresa no tiene información financiera registrada", { status: 404 });

  const element = createElement(InformeDocument, { bundle: loaded.bundle }) as unknown as React.ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  const safeName = (loaded.bundle.company.nombre ?? "empresa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Informe-EcuadorFinanciero-${safeName}-${loaded.bundle.current.anio}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
