-- El dataset fuente (bi_compania.csv) tiene ~155 RUCs duplicados (empresas
-- re-registradas con distinto expediente). expediente ya es PK; se quita la
-- restriccion UNIQUE de ruc para poder cargar el dataset completo, y se
-- agrega un indice btree no-unico para mantener las busquedas por ruc rapidas.

ALTER TABLE companies DROP CONSTRAINT companies_ruc_key;
CREATE INDEX idx_companies_ruc ON companies (ruc);
