"""Prepara los archivos de datos para la base LOCAL de pruebas (no toca la base de produccion).

Toma los TSV ya procesados (C:\\dev\\afe-processed) y deja en C:\\dev\\afe-localdb\\seed una muestra manejable:
todas las companias (para la busqueda), los catalogos, y las N empresas con mas ingresos de 2025 con todos sus anios y
balances, mas unas empresas de prueba conocidas. Uso:  python scripts/make-local-seed.py [N]
"""
import json
import os
import sys

SRC = os.environ.get("AFE_SRC", r"C:\dev\afe-processed")
OUT = os.path.join(os.environ.get("AFE_LOCALDB_DIR", r"C:\dev\afe-localdb"), "seed")
N = int(sys.argv[1]) if len(sys.argv) > 1 else 12000
YEAR = 2025
KEEP_RUCS = {
    "0990129185001",  # Hivimar
    "1790319857001",  # Pronaca
    "1792692091001",  # patrimonio negativo
    "1792356601001",  # perdida
    "0993370905001",  # AHAVA (inactiva)
    "0992345764001",  # utilidad muy alta
}

os.makedirs(OUT, exist_ok=True)


def ven(m):
    v = m.get("ingresos_ventas")
    if v:
        return v
    return m.get("ingresos_totales") or 0


# 1) companias: rucs a conservar
ruc_exp = {}
with open(os.path.join(SRC, "companies.tsv"), encoding="utf-8") as f:
    for line in f:
        p = line.rstrip("\n").split("\t")
        if p[1] in KEEP_RUCS:
            ruc_exp.setdefault(p[1], []).append(int(p[0]))

# 2) las N con mas ingresos en el ultimo anio
rev = []
with open(os.path.join(SRC, "company_year_financials.tsv"), encoding="utf-8") as f:
    for line in f:
        if not line.startswith(f"{YEAR}\t"):
            continue
        p = line.rstrip("\n").split("\t")
        try:
            v = ven(json.loads(p[6]))
        except Exception:
            continue
        if v and v > 0:
            rev.append((v, int(p[1])))
rev.sort(reverse=True)
keep = {e for _, e in rev[:N]}
for exps in ruc_exp.values():
    keep.update(exps)
print("empresas conservadas:", len(keep))

# 3) filtrar cyf y balances
n_cyf = 0
with open(os.path.join(SRC, "company_year_financials.tsv"), encoding="utf-8") as f, open(os.path.join(OUT, "company_year_financials.tsv"), "w", encoding="utf-8", newline="\n") as o:
    for line in f:
        if int(line.split("\t", 2)[1]) in keep:
            o.write(line)
            n_cyf += 1
print("filas cyf:", n_cyf)

n_bli = 0
with open(os.path.join(SRC, "balance_line_items.tsv"), encoding="utf-8") as f, open(os.path.join(OUT, "balance_line_items.tsv"), "w", encoding="utf-8", newline="\n") as o:
    for line in f:
        if int(line.split("\t", 1)[0]) in keep:
            o.write(line)
            n_bli += 1
print("filas balance:", n_bli)

# 4) tablas pequenas completas
import shutil

for name in ["companies", "ciiu", "segmentos", "sector_indicators", "chart_of_accounts_catalogs", "chart_of_accounts_entries"]:
    shutil.copyfile(os.path.join(SRC, f"{name}.tsv"), os.path.join(OUT, f"{name}.tsv"))
print("listo:", OUT)
