import { db } from "@/lib/db";

// Datos del catastro público del SRI (datos abiertos) para un RUC. No incluye datos de personas.
export type Catastro = {
  ruc: string;
  estado: string | null; // ACTIVO | PASIVO | SUSPENDIDO
  clase: string | null;
  tipo: string | null;
  fecha_inicio: string | null; // AAAA-MM-DD
  fecha_suspension: string | null;
  fecha_reinicio: string | null;
  fecha_actualizacion: string | null;
  obligado: string | null; // S | N (obligado a llevar contabilidad)
  agente_retencion: string | null;
  especial: string | null; // contribuyente especial
  n_establecimientos: number | null;
  n_abiertos: number | null;
  n_provincias: number | null;
  provincia_est: string | null;
  canton_est: string | null;
  parroquia_est: string | null;
  ciiu_sri: string | null;
  nombre_comercial: string | null;
};

export async function getCatastro(ruc: string): Promise<Catastro | null> {
  try {
    const [row] = await db().sql<Catastro>`
      SELECT ruc, estado, clase, tipo,
             to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             to_char(fecha_suspension, 'YYYY-MM-DD') AS fecha_suspension,
             to_char(fecha_reinicio, 'YYYY-MM-DD') AS fecha_reinicio,
             to_char(fecha_actualizacion, 'YYYY-MM-DD') AS fecha_actualizacion,
             obligado, agente_retencion, especial, n_establecimientos, n_abiertos, n_provincias,
             provincia_est, canton_est, parroquia_est, ciiu_sri, nombre_comercial
      FROM ruc_catastro WHERE ruc = ${ruc}
    `;
    return row ?? null;
  } catch {
    return null; // la tabla aún no existe o no está cargada: la ficha simplemente no muestra estos datos
  }
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

// Años completos entre una fecha ISO y hoy (fracción incluida).
export function aniosDesde(iso: string, hoy = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (hoy.getTime() - new Date(y, m - 1, d).getTime()) / (365.25 * 24 * 3600 * 1000);
}

// Frase "más antigua que ..." a partir de la fracción de empresas activas que son más recientes.
export function olderThan(younger: number): string {
  if (younger >= 0.99995) return "que todas las demás empresas activas";
  const p = younger * 100;
  return `que el ${p.toFixed(p > 99 ? 2 : p >= 10 ? 0 : 1).replace(".", ",")} % de las empresas activas`;
}
