-- Esquema inicial: catalogos maestros, ratios por sector/empresa y
-- estados financieros linea por linea (2019+).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- Catalogos maestros
-- ---------------------------------------------------------------------
CREATE TABLE companies (
  expediente        INTEGER PRIMARY KEY,
  ruc               TEXT NOT NULL UNIQUE,
  nombre            TEXT NOT NULL,
  tipo              TEXT,
  provincia_codigo  TEXT,
  provincia         TEXT
);
CREATE INDEX idx_companies_nombre_trgm ON companies USING gin (nombre gin_trgm_ops);
CREATE INDEX idx_companies_ruc_trgm ON companies USING gin (ruc gin_trgm_ops);

CREATE TABLE ciiu (
  codigo       TEXT PRIMARY KEY,
  descripcion  TEXT NOT NULL
);

CREATE TABLE segmentos (
  id      SMALLINT PRIMARY KEY,
  nombre  TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- Ratios ya calculados por sector/anio (benchmark) -- indicadores_sector.csv
-- ---------------------------------------------------------------------
CREATE TABLE sector_indicators (
  anio         SMALLINT NOT NULL,
  ciiu_n1      TEXT NOT NULL,
  descripcion  TEXT,
  metrics      JSONB NOT NULL,
  PRIMARY KEY (anio, ciiu_n1)
);

-- ---------------------------------------------------------------------
-- Cifras + ratios ya calculados por empresa/anio -- bi_ranking.csv (2008-2025)
-- ---------------------------------------------------------------------
CREATE TABLE company_year_financials (
  expediente        INTEGER NOT NULL REFERENCES companies(expediente),
  anio              SMALLINT NOT NULL,
  posicion_general  INTEGER,
  cod_segmento      SMALLINT,
  ciiu_n1           TEXT,
  ciiu_n6           TEXT,
  metrics           JSONB NOT NULL,
  PRIMARY KEY (expediente, anio)
);
CREATE INDEX idx_cyf_anio_ciiu ON company_year_financials (anio, ciiu_n1);
CREATE INDEX idx_cyf_anio_pos ON company_year_financials (anio, posicion_general);
CREATE INDEX idx_cyf_anio_segmento ON company_year_financials (anio, cod_segmento);

-- ---------------------------------------------------------------------
-- Catalogos de cuentas contables (varian por anio/formulario; solo 5
-- catalogos distintos existen en toda la serie 2019-2025, identificados
-- por hash de contenido -- ver etl/build_processed.py).
-- ---------------------------------------------------------------------
CREATE TABLE chart_of_accounts_catalogs (
  id          SMALLINT PRIMARY KEY,
  sha1        TEXT NOT NULL UNIQUE,
  label       TEXT,
  first_year  SMALLINT,
  last_year   SMALLINT,
  n_entries   INTEGER
);

CREATE TABLE chart_of_accounts_entries (
  catalog_id  SMALLINT NOT NULL REFERENCES chart_of_accounts_catalogs(id),
  codigo      TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  PRIMARY KEY (catalog_id, codigo)
);

-- ---------------------------------------------------------------------
-- Estados financieros completos, linea por linea (solo disponible 2019+).
-- data es un objeto {codigo_cuenta: valor} con solo las cuentas != 0.
-- ---------------------------------------------------------------------
CREATE TABLE balance_line_items (
  expediente  INTEGER NOT NULL,
  ruc         TEXT,
  anio        SMALLINT NOT NULL,
  catalog_id  SMALLINT NOT NULL REFERENCES chart_of_accounts_catalogs(id),
  ciiu        TEXT,
  data        JSONB NOT NULL,
  PRIMARY KEY (expediente, anio)
);
CREATE INDEX idx_bli_anio ON balance_line_items (anio);
