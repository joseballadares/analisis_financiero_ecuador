// Historial de versiones del sitio. Al publicar cambios: agregar la entrada al inicio, subir "version" en
// package.json y crear la etiqueta git (vX.Y).
export type Release = { version: string; date: string; title: string; changes: string[] };

export const RELEASES: Release[] = [
  {
    version: "0.9",
    date: "2026-09-18",
    title: "Historial de versiones y legibilidad",
    changes: [
      "Nueva página de historial de versiones y versión visible en el pie de página.",
      "Textos de los gráficos más grandes y bloques pequeños de la ecuación contable sin texto tapado.",
    ],
  },
  {
    version: "0.8",
    date: "2026-09-18",
    title: "Navegación del perfil y comparables",
    changes: [
      "Buscador al inicio de cada perfil de empresa.",
      "Selector desplegable de año en lugar de tarjetas.",
      "Tabla de empresas comparables con una columna de la empresa en verde (supera) o rojo (por debajo).",
    ],
  },
  {
    version: "0.7",
    date: "2026-09-18",
    title: "Rediseño visual y crédito",
    changes: [
      "Paleta de dos colores (azul y gris) siguiendo principios de Storytelling with Data.",
      "Resumen con seis tarjetas, ranking nacional, ecuación contable vertical y distribución frente a pares.",
      "Ratios agrupados por tipo, ciclo de efectivo como fórmula y colores de tendencia.",
      "Pestaña Alertas y crédito: puntaje orientativo A–E y lista de banderas rojas.",
    ],
  },
  {
    version: "0.6",
    date: "2026-09-18",
    title: "Ratios estrella y estados",
    changes: [
      "Ratios estrella: EBITDA aproximado, FCF estimado, ROIC, ciclo de efectivo y liquidez exacta.",
      "ROE en pirámide DuPont.",
      "Estados financieros ESF y ERI en pestañas separadas, con minigráficos de tendencia.",
    ],
  },
  {
    version: "0.5",
    date: "2026-09-18",
    title: "Trayectoria del perfil",
    changes: [
      "Gráficos de trayectoria, variación anual y participación en el segmento.",
      "Estados multi-año con descarga en CSV.",
      "Variaciones sectoriales con clasificación CIIU constante; caché de agregaciones.",
    ],
  },
  {
    version: "0.4",
    date: "2026-09-18",
    title: "Búsqueda avanzada y metodología",
    changes: ["Búsqueda avanzada con filtros.", "Páginas de provincias y sectores enriquecidos.", "Página de metodología."],
  },
  {
    version: "0.3",
    date: "2026-09-18",
    title: "Referencia por pares activos",
    changes: [
      "Mediana y semáforo sobre las 500 empresas activas más cercanas en tamaño.",
      "Aviso para empresas sin actividad operativa.",
    ],
  },
  {
    version: "0.2",
    date: "2026-09-18",
    title: "Ratios exactos y validación",
    changes: [
      "Ratios recalculados con cifras exactas (la fuente los trunca a 2 decimales).",
      "Relleno de 2025 desde el balance cuando la fuente trae ceros.",
      "Validación de datos frente a fuentes públicas.",
    ],
  },
  {
    version: "0.1",
    date: "2026-09-17",
    title: "Base del sitio",
    changes: [
      "Buscador, perfil de empresa, sectores y ranking.",
      "Carga de datos de la Superintendencia en la base de datos.",
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0];
