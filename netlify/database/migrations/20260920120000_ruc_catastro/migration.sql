-- Catastro público del SRI (datos abiertos) resumido por RUC de las compañías: fecha de inicio de actividades, estado,
-- clase de contribuyente, establecimientos y ubicación del establecimiento principal. No incluye datos de personas.
CREATE TABLE IF NOT EXISTS ruc_catastro (
  ruc                 text PRIMARY KEY,
  estado              text,
  clase               text,
  tipo                text,
  fecha_inicio        date,
  fecha_suspension    date,
  fecha_reinicio      date,
  fecha_actualizacion date,
  obligado            text,
  agente_retencion    text,
  especial            text,
  n_establecimientos  integer,
  n_abiertos          integer,
  n_provincias        integer,
  provincia_est       text,
  canton_est          text,
  parroquia_est       text,
  ciiu_sri            text,
  nombre_comercial    text
);
CREATE INDEX IF NOT EXISTS idx_ruc_catastro_inicio ON ruc_catastro (fecha_inicio);
