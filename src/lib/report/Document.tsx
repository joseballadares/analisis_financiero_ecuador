import { Fragment } from "react";
import { Document } from "@react-pdf/renderer";
import type { CompanyBundle } from "@/lib/companyData";
import { buildCtx } from "@/lib/report/model";
import { CoverPage, ContentsPage, SECTIONS, type TocEntry } from "@/lib/report/pages";

// Informe profesional: portada, contenido y bases de preparación, estados financieros y luego el análisis.
// Las secciones salen del registro SECTIONS; el contenido y los números de página se arman solos.
export default function InformeDocument({ bundle }: { bundle: CompanyBundle }) {
  const c = buildCtx(bundle);
  const secs = SECTIONS.filter((s) => s.enabled(c));
  const counters = { 1: 0, 2: 0 };
  const toc: TocEntry[] = secs.map((s, i) => ({ n: `${s.group}.${++counters[s.group]}`, label: s.label, page: 3 + i }));
  return (
    <Document
      title={`Informe profesional - ${c.name} - ${c.year}`}
      author="Ecuador Financiero"
      creator="Ecuador Financiero"
      producer="Ecuador Financiero"
      subject={`Estados financieros, razones financieras y análisis de ${c.name}, ejercicio ${c.year}`}
      keywords="informe financiero, Ecuador, SCVS, razones financieras"
      language="es"
    >
      <CoverPage c={c} />
      <ContentsPage c={c} toc={toc} />
      {secs.map((s) => (
        <Fragment key={s.id}>{s.page(c)}</Fragment>
      ))}
    </Document>
  );
}
