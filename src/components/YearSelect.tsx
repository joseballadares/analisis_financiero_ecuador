"use client";

import { useRouter } from "next/navigation";

export default function YearSelect({ ruc, years, current }: { ruc: string; years: number[]; current: number }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Año
      <select
        value={current}
        onChange={(e) => router.push(`/empresa/${ruc}?anio=${e.target.value}`)}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
