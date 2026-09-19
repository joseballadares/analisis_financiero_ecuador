// Tipos y descripciones de las señales del Radar Estratégico (sin dependencias del servidor).
export type SignalId = "roe" | "ebitda" | "mejora" | "crecimiento" | "escalada" | "giro";
export type Signal = { id: SignalId; label: string; detail: string; tone: "up" | "down" };

export const SIGNALS: { id: SignalId; label: string; desc: string }[] = [
  { id: "roe", label: "Rentabilidad sostenida", desc: "ROE promedio de los últimos 3 años en el 10 % superior (con patrimonio de al menos 15 % del activo)." },
  { id: "ebitda", label: "Operación eficiente", desc: "Margen EBITDA aproximado del último año en el 10 % superior de su sector." },
  { id: "mejora", label: "Mejora operativa", desc: "Mayor aumento del margen EBITDA desde 2022 (años con balance NIIF)." },
  { id: "crecimiento", label: "Crecimiento sostenido", desc: "Mayor crecimiento anual compuesto de ingresos en 5 años, con alza en al menos 3 de 4 años." },
  { id: "escalada", label: "Escalada en el ranking", desc: "Más puestos ganados en 5 años en el ranking general de la Superintendencia." },
  { id: "giro", label: "Giro de resultados", desc: "Mayor cambio del margen neto en 5 años, hacia arriba (por ejemplo de pérdida a utilidad) o hacia abajo." },
];

export type Interesting = {
  ruc: string;
  nombre: string;
  sector: string | null;
  rank: number;
  ingresos: number;
  activos: number | null;
  utilidad: number | null;
  margen: number | null;
  roe: number | null;
  signals: Signal[];
};

export type InterestingPool = {
  anio: number;
  desde: number;
  evaluadas: number;
  elegibles: number;
  excluidas: { sinCincoAnios: number; sinNiif: number; patrimonio: number; inactivaOParcial: number; holding: number };
  porSenal: Record<SignalId, number>;
  empresas: Interesting[];
};

