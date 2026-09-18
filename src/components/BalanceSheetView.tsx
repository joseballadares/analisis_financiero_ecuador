import { formatMoney } from "@/lib/format";

export default function BalanceSheetView({
  data,
  names,
}: {
  data: Record<string, number>;
  names: Record<string, string>;
}) {
  const codes = Object.keys(data).sort();

  if (codes.length === 0) {
    return (
      <p className="text-sm text-muted">
        No hay detalle de cuentas disponible para este período.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <tbody>
          {codes.map((code, idx) => {
            const depth = Math.max(0, Math.floor((code.length - 1) / 2));
            const isTop = depth === 0;
            return (
              <tr
                key={code}
                className={`${idx % 2 === 0 ? "bg-surface" : "bg-background"} ${
                  isTop ? "font-semibold" : ""
                }`}
              >
                <td
                  className="px-4 py-2 text-foreground"
                  style={{ paddingLeft: `${1 + depth * 1.25}rem` }}
                >
                  {names[code] ?? code}
                </td>
                <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                  {formatMoney(data[code])}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
