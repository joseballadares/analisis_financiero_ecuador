-- bi_ranking.csv (2008-2025) referencia expedientes que ya no existen en
-- bi_compania.csv (el maestro de companias vigente). Se quita el FK para
-- poder cargar la serie historica completa.
ALTER TABLE company_year_financials DROP CONSTRAINT company_year_financials_expediente_fkey;
