# Análisis Financiero Ecuador

Buscador y análisis financiero de empresas del Ecuador: ratios, estados
financieros completos, comparables y análisis por sector, a partir de datos
públicos de la Superintendencia de Compañías, Valores y Seguros.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Netlify DB](https://docs.netlify.com/build/data-and-storage/netlify-db/) (Postgres) vía `@netlify/database`
- Desplegado en Netlify

## Probar en tu computador (sin gastar créditos de Netlify)

El sitio se puede ejecutar completo en tu computador, con una base de datos local que contiene una muestra de los
datos reales (las 12.000 empresas con más ingresos, con todos sus años y balances, más todo el catálogo de
compañías para la búsqueda).

- **Cada vez que quieras probar:** doble clic en `probar-local.bat` (o, en una terminal, `npm run dev:local`) y abre
  <http://localhost:3000>. Los cambios en el código se ven al guardar el archivo. Para detener, Ctrl+C.
- **Solo la primera vez en otro computador:** `npm install`, luego `npm run db:seed` (prepara los datos de muestra
  desde `C:\dev\afe-processed` en `C:\dev\afe-localdb\seed`) y después `npm run dev:local`, que crea la base y la carga.
- Es la misma aplicación que se publica; solo cambia la base de datos. Las cifras de ranking y "de N empresas" son
  las de la muestra, no las de producción.
- Cuando todo se vea bien, se publica una sola vez con `git push`.

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
