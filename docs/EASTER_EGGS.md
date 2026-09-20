# Sorpresas escondidas (easter eggs)

> **Aviso de spoilers.** Este documento lista todas las sorpresas del sitio y cómo activarlas. Ninguna aparece en el menú ni en el historial
> de versiones con nombre; el historial solo dice "hay sorpresas por descubrir".

Reglas comunes:

- Ninguna sorpresa (ni la empresa ficticia) aparece en rankings, Radar Estratégico, sectores, provincias, exportaciones CSV ni en el informe PDF.
- Las animaciones respetan `prefers-reduced-motion` y ninguna tiene sonido.
- Las palabras del buscador solo actúan al presionar **Enter**; la búsqueda normal no cambia.
- Las páginas escondidas (`/1999`, `/2008`, `/sucre`, `/dolarizacion`, `/empresas-antiguas`) llevan `noindex`.

## Lista

| # | Sorpresa | Cómo se activa | Qué pasa |
|---|---|---|---|
| 1 | **HESOYAM** | Buscador: `hesoyam` + Enter | Lluvia de billetes de $1 y Pepe de esmoquin que sube desde abajo 4 s. Espera ~10 s entre repeticiones. |
| 2 | **Based Pepe Holding S.A.** | Buscador: `based pepe holding s.a.` (exacto) | Aparece primero en el desplegable con la etiqueta *FICTICIA*; abre un perfil inventado (`/empresa/based-pepe-holding`). |
| 3 | **404 que no cuadra** | Cualquier URL inexistente | Ventana de navegador con "404" y "Activo ≠ Pasivo + Patrimonio". |
| 4 | **Botón "Mostrar otras"** | Portada: clics seguidos (menos de 4 s entre ellos) | 10 clics: "Ya, elige una"; 20: "En serio, elige una"; 30: "Me rindo". |
| 5 | **Cinta de la portada** | Al azar, 1 de cada 100 cargas | Se cuela una tarjeta "Based Pepe Holding S.A." (ficticia); su clic abre el perfil del huevo 2. |
| 6 | **Tortuga de Galápagos** | Abrir `/buscar?provincia=GALAPAGOS` (25 % de probabilidad, una vez por sesión) | Una tortuga cruza la pantalla con "Ciclo de conversión de efectivo: 150 años". |
| 7a | **Sectores (animación)** | Buscador: `banano`, `cacao`, `camaron`, `petroleo` o `mineria` + Enter (con o sin acento; singular o plural) | Animación de 3 s: racimo, mazorca que se abre, camarón saltando, gota de petróleo, lingote de oro. |
| 7b | **Modo sector** | En el perfil de una empresa de esos sectores, teclear la palabra de su sector (sin foco en un campo) | Los puntos de los gráficos del Resumen pasan a ser el ícono del sector. Teclearla de nuevo lo apaga. |
| 8 | **Dolarización** | Buscador: `dolarizacion` + Enter | Página `/dolarizacion` (en inglés): la inflación 1970–2025 se dibuja sola; en el 2000 aparece Pepe con dólares. |
| 9 | **Madrugada** | Visitar el sitio entre 00:00 y 03:59 (hora del navegador) | Aviso: "¿Analizando empresas a esta hora? Ánimo 💪". Una vez por sesión. |
| 10 | **Cumpleaños** | Cada 18 de septiembre (hora de Ecuador), desde 2027 | Franja "Hoy este sitio cumple N año(s)" y confeti. |
| 11 | **Cápsula del tiempo 2008** | Solo escribiendo `/2008` en la URL | Las 10 mayores empresas de 2008 y dónde están hoy; crisis de Lehman y datos de Ecuador con fuentes. |
| 12 | **Página del sucre** | Solo escribiendo `/sucre` en la URL | Página con estética de internet del año 2000, conversor dólar ⇄ sucre (25.000 por dólar) y enlace a Wikipedia. |
| 13 | **Crisis de 1999** | Solo escribiendo `/1999` en la URL | Cajero automático con saldo cero, Pepe y línea de tiempo con fuentes del Banco Central. |
| 14 | **Mensaje en la consola** | Abrir las herramientas de desarrollador | Nombre del autor en arte ASCII. |
| 15 | **Tooltip del autor** | Pasar el cursor (o enfocar con el teclado) sobre `vX.Y` en el pie | Aparece "Hecho por José Balladares", enlazado a su LinkedIn. |
| 16 | **Nota de Yang** | Fin de la pestaña *Alertas y crédito* | Texto diminuto: no es un sistema real ni lo hizo "un analista cuantitativo llamado Yang que ganó una competencia de matemáticas en China" (guiño a *The Big Short*). |
| 17 | **It's just money. It's made up.** | *Acerca de* → Aviso legal (última línea) | La frase enlaza a la escena de *Margin Call* en YouTube. |
| 18 | **Galápagos en ASCII** | Perfil de una empresa radicada en Galápagos, al final del Resumen | Mapa del archipiélago y piquero de patas azules en arte ASCII, con "I love Boobies" en medio. |
| 19 | **Empresas más antiguas** | Clic en el chip **Inicio de actividades** al inicio del Resumen de cualquier empresa | Abre `/empresas-antiguas`: las más antiguas del Ecuador, cuáles siguen activas y estadísticas por sector, provincia, tamaño y ventas. Si la empresa es de las antiguas y vigentes (75 años o más y con ventas en el último año), el chip cambia a ★ "Entre las más antiguas del Ecuador". |

## Dónde está cada cosa en el código

- Capa global (animaciones, avisos, consola): `src/components/eggs/EasterEggs.tsx`, `Overlays.tsx`, `SectorIcons.tsx`, `sectorMode.ts`, `SectorModeKeys.tsx`.
- Utilidades y palabras secretas: `src/lib/eggs/index.ts` (incluye los códigos CIIU de cada sector); arte de la consola: `src/lib/eggs/consoleArt.ts`; arte de Galápagos: `src/lib/eggs/galapagosArt.ts`.
- Buscador (Enter): `src/components/SearchBox.tsx`. Portada: `src/app/page.tsx`, `src/components/home/Ticker.tsx`, `ShuffleButton.tsx`.
- Perfil ficticio: `src/components/eggs/PepeHoldingProfile.tsx` (se sirve desde `src/app/empresa/[ruc]/page.tsx`).
- Páginas: `src/app/not-found.tsx`, `dolarizacion/`, `2008/`, `sucre/`, `1999/`, `empresas-antiguas/`.
- Datos de las páginas: `src/lib/eggs/inflation.ts` (Banco Mundial), `src/lib/capsule2008.ts`, `src/lib/antiquity.ts`, `src/lib/catastro.ts`.
- Notas y enlaces: `src/components/RiskTab.tsx` (nota de Yang), `src/app/acerca/page.tsx` (frase enlazada), `src/components/SiteFooter.tsx` (tooltip del autor).

## Fuentes y créditos

- Contornos de las islas: Natural Earth (dominio público). Las islas menores del mapa ASCII son aproximadas.
- Inflación, PIB, remesas y desempleo: Banco Mundial (indicadores `FP.CPI.TOTL.ZG`, `NY.GDP.MKTP.KD.ZG`, `BX.TRF.PWKR.CD.DT`, `SL.UEM.TOTL.ZS`).
- Línea de tiempo de 1999: Banco Central del Ecuador, Memorias 1999 (cap. II y IV) y 2000. Nota: el Banco Central fecha el anuncio de la dolarización el 10 de enero de 2000; otras fuentes, el 9.
- Hechos de Lehman Brothers: Wikipedia; titular de Bloomberg; lectura recomendada de Forbes.
- Catastro RUC: SRI, datos abiertos (`https://www.sri.gob.ec/datasets`). El catastro público **no incluye representante legal** ni datos de personas.
- Imágenes: Pepe con dólares (firma "PepeRus" en el original), billete "The Dank States of Memes" (firma "matt furie"), sticker de Pepe con camiseta tricolor y foto del piquero de patas azules usada solo como referencia para el arte ASCII. Por decisión del autor, no se acreditan en *Acerca de*.

## Datos que alimentan la sorpresa 19

`etl/build_catastro.py` cruza los ZIP del catastro (uno por provincia, `data/catastro_ruc/`) con los RUC de las compañías y genera `ruc_catastro.tsv`
(una fila por RUC). Descarta fechas de inicio evidentemente erróneas (antes de 1850 o el valor de relleno 1900-01-01). La tabla `ruc_catastro`
se crea con la migración `20260920120000_ruc_catastro`. El informe de antigüedad se calcula una vez por mes y se guarda en `kv_cache`.
