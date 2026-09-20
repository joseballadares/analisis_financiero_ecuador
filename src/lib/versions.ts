// Historial de versiones del sitio. Al publicar cambios: agregar la entrada al inicio, subir "version" en
// package.json y crear la etiqueta git (vX.Y).
export type Release = { version: string; date: string; title: string; changes: string[] };

export const RELEASES: Release[] = [
  {
    version: "0.26",
    date: "2026-09-20",
    title: "Datos del RUC en cada perfil",
    changes: [
      "Al inicio del Resumen de cada empresa, datos del catastro público del SRI: inicio de actividades y años de trayectoria, estado del RUC, establecimientos, ubicación de la matriz y obligaciones (contabilidad, contribuyente especial, agente de retención).",
      "Más sorpresas escondidas por el sitio. ¿Las encuentras?",
    ],
  },
  {
    version: "0.25",
    date: "2026-09-20",
    title: "Nuevo pie de página y página Acerca de ampliada",
    changes: [
      "Nuevo pie de página en todo el sitio: descripción, fuente de los datos y mapa de secciones (Plataforma, Producto e Información).",
      "Acerca de: propósito informativo del proyecto, qué viene (mercado de valores, compras públicas), principios y aviso legal.",
      "Otra sorpresa escondida por el sitio. ¿La encuentras?",
    ],
  },
  {
    version: "0.24",
    date: "2026-09-20",
    title: "Más sorpresas",
    changes: ["Dos sorpresas nuevas escondidas por el sitio: una con datos y otra con mucha nostalgia. ¿Las encuentras?"],
  },
  {
    version: "0.23",
    date: "2026-09-19",
    title: "Página 404 nueva y algunas sorpresas",
    changes: [
      "Nueva página 404 con la ecuación contable que no cuadra.",
      "Escondimos algunas sorpresas por el sitio. ¿Las encuentras?",
    ],
  },
  {
    version: "0.22",
    date: "2026-09-19",
    title: "Ratios por grupo y nuevos indicadores",
    changes: [
      "Ratios por año: botones al inicio para ver todos o solo Rentabilidad, Liquidez, Operatividad, Endeudamiento o Retorno sobre la inversión, con el número de ratios de cada grupo; funcionan en la tabla y en las tarjetas.",
      "Ocho indicadores nuevos: independencia financiera, peso del activo corriente, concentración de la deuda a corto plazo, cobertura del activo no corriente, deuda financiera / patrimonio, rotación de inventarios, rotación del capital de trabajo y ROCE.",
      "Cinco de ellos ya se comparan con las empresas similares (semáforo).",
    ],
  },
  {
    version: "0.21",
    date: "2026-09-19",
    title: "Resumen con datos clave y barras pequeñas",
    changes: [
      "Debajo de la estructura del balance y del resultado, dos gráficos de barras pequeños por año: activos, pasivos y efectivo; e ingresos y utilidad neta, con cuadro flotante.",
      "Nuevo panel lateral de Datos clave (estilo Financial Highlights): ejercicio, rentabilidad, eficiencia, resultados, balance, flujo y ciclo de efectivo.",
      "Se retiran las seis tarjetas y la franja del ranking del inicio del Resumen, porque repetían lo que muestran la estructura y el panel de datos clave.",
      "El gráfico de barras de balance muestra activos, pasivos y patrimonio; nueva tarjeta Ingresos vs activos con la rotación de activos.",
    ],
  },
  {
    version: "0.20",
    date: "2026-09-19",
    title: "Radar Estratégico más compacto",
    changes: [
      "La tabla del Radar Estratégico muestra cada señal en una sola línea (etiqueta y detalle) y da más ancho a esa columna; las filas miden menos de la mitad.",
      "Nueva columna con el puesto en el Radar (más señales primero; en empates, mayores ingresos) junto al puesto por ingresos.",
    ],
  },
  {
    version: "0.19",
    date: "2026-09-19",
    title: "Estados financieros más claros y tema claro/oscuro",
    changes: [
      "Estados financieros: la vista compacta usa nombres simples y agrupa lo demás en \"Otros\"; la vista completa mantiene los nombres oficiales.",
      "Las cuentas principales se distinguen con fondo y letra fuerte, y las secundarias con un tono más tenue, en tema claro y oscuro.",
      "Importes completos o abreviados, marca (★) del año seleccionado, y enlace para reportar errores.",
      "Botón en el encabezado para cambiar entre tema claro y oscuro; se recuerda la elección.",
    ],
  },
  {
    version: "0.18",
    date: "2026-09-19",
    title: "Ratios en dos secciones",
    changes: [
      "La pestaña de ratios financieros se divide en dos secciones con un selector al inicio: Ratios estrella y Ratios por año.",
      "Ratios por año abre con la tabla por años; las tarjetas por grupo siguen disponibles con un botón.",
      "Las pestañas del perfil quedan en este orden: Resumen, Estados financieros, Ratios financieros y Alertas y crédito.",
    ],
  },
  {
    version: "0.17",
    date: "2026-09-19",
    title: "Resumen del perfil rediseñado",
    changes: [
      "Ficha de la empresa al inicio del perfil, en forma compacta; se retiran las cuatro tarjetas de cifras que se repetían.",
      "Resumen: se mantienen la estructura de activo, pasivo y patrimonio, y los ingresos y la utilidad neta; los demás gráficos pasan a ser EBITDA y EBITDA Margin, FCF, ROIC, DSO, DIO, DPO, CCC, Current Ratio y Net Debt / EBITDA, cada uno con su definición y fórmula.",
      "Se mantienen la posición en el ranking nacional, la participación en el segmento y la ubicación frente a empresas de su sector y tamaño.",
      "Los gráficos se acortan a los años con movimiento relevante (sin años vacíos o en cero al inicio).",
      "En el celular el cuadro flotante de los gráficos se cierra solo, al tocar fuera o al desplazarse.",
      "Nuevo entorno para probar en el computador sin publicar (probar-local.bat).",
    ],
  },
  {
    version: "0.16",
    date: "2026-09-18",
    title: "Radar Estratégico",
    changes: [
      "Las empresas interesantes pasan a llamarse Radar Estratégico: un watchlist de empresas con alto desempeño, en la portada y en la pestaña del ranking.",
    ],
  },
  {
    version: "0.15",
    date: "2026-09-18",
    title: "Empresas interesantes",
    changes: [
      "Las tarjetas de la portada pasan a ser empresas interesantes: seis señales sobre los últimos 5 años (rentabilidad sostenida, operación eficiente, mejora operativa, crecimiento sostenido, escalada en el ranking y giro de resultados), cada una con la razón que la destaca.",
      "Nueva pestaña Empresas interesantes en el ranking, con la lista completa, selección por señal y flechas para ordenar cada columna.",
      "La metodología explica población, controles de calidad, criterios y sesgos.",
    ],
  },
  {
    version: "0.14",
    date: "2026-09-18",
    title: "Ranking por ingresos con filtros",
    changes: [
      "El ranking se ordena por ingresos operacionales y muestra las 1.000 empresas con más ingresos de cada año.",
      "Flechas para ordenar de mayor a menor (o al revés) en cada columna del ranking.",
      "La cinta de la página principal indica cada dato: Ingresos, Margen y ROE.",
    ],
  },
  {
    version: "0.13",
    date: "2026-09-18",
    title: "Nueva página principal",
    changes: [
      "Cinta de empresas que se desplaza de derecha a izquierda, con ingresos, margen neto y ROE del último año.",
      "Tarjetas de empresas destacadas elegidas al azar entre las 500 con más ingresos, con botón para mostrar otras.",
      "Top 10 de empresas por ingresos, con activos, utilidad neta, margen neto y ROE.",
      "Cifras del país (empresas, ingresos y activos totales con su variación) y los seis sectores más grandes.",
    ],
  },
  {
    version: "0.12",
    date: "2026-09-18",
    title: "Informe profesional en PDF",
    changes: [
      "Nuevo botón en cada perfil para descargar el informe profesional de 12 páginas en PDF.",
      "Estructura de informe de auditoría: portada, contenido y bases de preparación, estados financieros (situación financiera, resultado integral y notas) y luego el análisis.",
      "Análisis con títulos que resumen la conclusión: resumen ejecutivo, perfil y trayectoria, rentabilidad y DuPont, liquidez y solvencia, razones financieras, comparación con pares y riesgo.",
      "Historial desde 2019, gráficos vectoriales, numeración de tablas y figuras, y redacción generada por reglas sobre los datos.",
    ],
  },
  {
    version: "0.11",
    date: "2026-09-18",
    title: "Gráficos de línea interactivos",
    changes: [
      "Ingresos vs utilidad neta, productividad y ciclo de efectivo pasan de columnas a líneas, con un punto por año.",
      "Al pasar el cursor (o tocar) sobre un año aparece un cuadro flotante con el valor y su cambio frente al año anterior.",
      "El gráfico del ciclo de efectivo muestra solo el total (CCC).",
      "Resumen: nuevos gráficos de línea de ROE, ROA, margen EBITDA y razón corriente.",
    ],
  },
  {
    version: "0.10",
    date: "2026-09-18",
    title: "Celular, puntaje con colores y distribución",
    changes: [
      "Gráficos con tamaño de texto legible en celular (se dibujan a un ancho distinto en pantallas angostas).",
      "Ciclo de efectivo: se omiten plazos de cobro no significativos (más de 2 años) que deformaban la escala.",
      "Puntaje de crédito con un color por letra (A verde, B lima, C amarillo, D naranja, E rojo) y escala con la posición de la empresa.",
      "Alertas y crédito: curvas de distribución que muestran dónde está la empresa frente a sus pares en los indicadores del puntaje.",
    ],
  },
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
