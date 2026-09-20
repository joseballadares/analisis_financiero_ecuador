import type { NextConfig } from "next";

// Cache del CDN de Netlify. Objetivo: que las visitas repetidas NO ejecuten funciones ni despierten la base de datos
// (cada hora de base despierta cuesta creditos). Cada deploy invalida todo el cache automaticamente.
//
// SOLO se cachean rutas que ignoran los parametros de la URL (?anio=, ?vista=, ?q=...). El runtime de Next en Netlify
// envia `Netlify-Vary: query=__nextDataReq|_rsc`, que hace que el CDN ignore cualquier otro parametro: cachear una ruta
// que si los usa serviria la copia equivocada (p. ej. la busqueda de otro texto o el anio de otra visita).
// NO agregar aqui: /empresa/[ruc], /sector/[ciiu], /ranking, /buscar, /api/search, /api/empresa/[ruc]/informe.
const DAY = 86400;
const cdn = (sMaxAge: number, swr: number) => [
  { key: "Netlify-CDN-Cache-Control", value: `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}, durable` },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      // Portada: 1 h fresca (tarjetas al azar y Radar con respaldo), luego se sirve vieja mientras se renueva.
      { source: "/", headers: cdn(3600, DAY) },
      // Datos anuales sin parametros.
      { source: "/sector", headers: cdn(7 * DAY, 30 * DAY) },
      { source: "/provincias", headers: cdn(7 * DAY, 30 * DAY) },
      { source: "/api/empresa/:ruc/estados", headers: cdn(7 * DAY, 30 * DAY) },
    ];
  },
};

export default nextConfig;
