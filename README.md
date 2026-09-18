# Análisis Financiero Ecuador

Buscador y análisis financiero de empresas del Ecuador: ratios, estados
financieros completos, comparables y análisis por sector, a partir de datos
públicos de la Superintendencia de Compañías, Valores y Seguros.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Netlify DB](https://docs.netlify.com/build/data-and-storage/netlify-db/) (Postgres) vía `@netlify/database`
- Desplegado en Netlify

## Desarrollo local

```bash
npm install
netlify dev
```

`netlify dev` provisiona automáticamente una base de datos de desarrollo y
aplica las migraciones en `netlify/database/migrations/`.

## Datos

El pipeline de carga (`../etl` en el repo del proyecto) transforma los
archivos crudos de la Superintendencia (catálogo de compañías, ranking con
ratios ya calculados, e indicadores por sector, más el detalle de balances
línea por línea desde 2019) en tablas de Postgres. Ver `etl/schema.sql` y
`etl/load_to_netlify_db.mjs`.
