-- Caché persistente de agregaciones pesadas (portada, sectores, provincias). Los datos solo cambian con una nueva carga anual.
CREATE TABLE IF NOT EXISTS kv_cache (
  key text PRIMARY KEY,
  version integer NOT NULL,
  data jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);
