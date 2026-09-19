-- Resultado precalculado del Radar Estratégico (una fila por año). Se recalcula al cambiar la versión del algoritmo.
CREATE TABLE IF NOT EXISTS radar_cache (
  anio integer PRIMARY KEY,
  version integer NOT NULL,
  data jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);
