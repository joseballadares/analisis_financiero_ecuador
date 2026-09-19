// Flechas de ordenar (▲ menor a mayor, ▼ mayor a menor): siempre visibles; la activa se resalta.
export default function SortIcon({ dir }: { dir: 0 | 1 | -1 }) {
  return (
    <span className="inline-flex flex-col text-[8px] leading-[8px]" aria-hidden>
      <span className={dir === 1 ? "text-brand" : "text-muted/40"}>▲</span>
      <span className={dir === -1 ? "text-brand" : "text-muted/40"}>▼</span>
    </span>
  );
}
