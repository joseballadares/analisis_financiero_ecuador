// Utilidades compartidas de las sorpresas escondidas del sitio (easter eggs).

export const PEPE_SLUG = "based-pepe-holding";
export const PEPE_NAME = "Based Pepe Holding S.A.";

export type SectorKind = "banano" | "cacao" | "camaron" | "petroleo" | "mineria";

// Eventos que viajan por window para que el buscador, los botones y las páginas activen las animaciones globales.
export type EggDetail =
  | { type: "hesoyam" }
  | { type: "sector"; kind: SectorKind }
  | { type: "toast"; text: string; ms?: number };
export const EGG_EVENT = "egg";

export function fireEgg(detail: EggDetail) {
  window.dispatchEvent(new CustomEvent<EggDetail>(EGG_EVENT, { detail }));
}

// Minúsculas, sin acentos y con espacios normalizados.
export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Palabras del buscador (con Enter) que activan la animación de un sector: sin acentos, singular o plural.
const SECTOR_WORDS: Record<string, SectorKind> = {
  banano: "banano",
  bananos: "banano",
  cacao: "cacao",
  cacaos: "cacao",
  camaron: "camaron",
  camarones: "camaron",
  petroleo: "petroleo",
  mineria: "mineria",
};
export function sectorFromWord(q: string): SectorKind | null {
  return SECTOR_WORDS[norm(q)] ?? null;
}

// Palabras que se teclean dentro del perfil de una empresa (solo singular y sin acentos).
export const TYPED_WORDS: SectorKind[] = ["banano", "cacao", "camaron", "petroleo", "mineria"];

// Actividades CIIU de cada sector: comercio al por mayor incluido en banano, cacao y camarón; sin venta de combustibles
// en petróleo; sin canteras (piedra y arena) en minería.
const PREFIXES: Record<SectorKind, string[]> = {
  banano: ["A0122.01", "G4630.11"],
  cacao: ["A0127.02", "C1073", "G4630.14"],
  camaron: ["A0321.02", "C1020.01", "C1020.03", "G4630.32", "G4630.33"],
  petroleo: ["B061", "B0910", "C1920"],
  mineria: ["B07", "B0990"],
};
export function sectorOfCiiu(code: string | null | undefined): SectorKind | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  for (const kind of Object.keys(PREFIXES) as SectorKind[]) {
    if (PREFIXES[kind].some((p) => c.startsWith(p))) return kind;
  }
  return null;
}

export const SECTOR_LABEL: Record<SectorKind, string> = {
  banano: "banano",
  cacao: "cacao",
  camaron: "camarón",
  petroleo: "petróleo",
  mineria: "minería",
};

// Marca "ya visto en esta sesión" (sessionStorage puede no estar disponible).
export function seenThisSession(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
export function markSeen(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // sin almacenamiento: puede repetirse
  }
}

// Fecha actual en Ecuador (America/Guayaquil), para que el día sea el mismo sin importar dónde esté el visitante.
export function guayaquilDate(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export const SITE_BIRTH_YEAR = 2026;
