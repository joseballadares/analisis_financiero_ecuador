-- Comparables: busqueda de pares por actividad (ciiu_n6 y sus prefijos) y anio.
CREATE INDEX idx_cyf_anio_ciiu6 ON company_year_financials (anio, ciiu_n6 text_pattern_ops);
