-- 2 filas de bi_compania.csv no traen RUC. Se permite NULL en vez de
-- filtrar/editar el dataset fuente.
ALTER TABLE companies ALTER COLUMN ruc DROP NOT NULL;
