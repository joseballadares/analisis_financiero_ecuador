import { formatMoney } from "@/lib/format";

// Los catálogos 2, 4 y 5 (2019-2021, la mayoría de las empresas) usan los códigos
// del formulario tributario del SRI (499 = Total activo, 698 = Patrimonio, 1005 = Ingresos),
// no la taxonomía NIIF (1 = Activo, 3 = Patrimonio, 401 = Ingresos).
const SRI_CATALOGS = new Set([2, 4, 5]);

const SRI_SECTIONS: { title: string; test: (n: number) => boolean }[] = [
  { title: "Activo", test: (n) => n >= 311 && n <= 499 },
  { title: "Pasivo", test: (n) => n >= 511 && n <= 599 },
  { title: "Patrimonio", test: (n) => n >= 601 && n <= 699 },
  { title: "Estado de resultados (resumen)", test: (n) => n >= 1005 && n <= 1099 },
  { title: "Ingresos (detalle)", test: (n) => n >= 6001 && n <= 6999 },
  { title: "Costos y gastos (detalle)", test: (n) => n >= 7001 && n <= 7999 },
  {
    title: "Conciliación tributaria e impuesto a la renta",
    test: (n) => n === 98 || (n >= 801 && n <= 999),
  },
  { title: "Operaciones con partes relacionadas", test: (n) => n < 100 && n !== 98 },
];

const MONETARY_SMALL_CODES = new Set(["3", "4", "5", "6", "29", "98"]);

function isDeclarative(code: string, name: string | undefined) {
  const n = parseInt(code, 10);
  if (n < 100 && !MONETARY_SMALL_CODES.has(code)) return true;
  if (code === "838" || code === "841") return true;
  return !!name && name.includes("?");
}

function Row({
  name,
  value,
  bold,
  paddingLeft,
  zebra,
}: {
  name: string;
  value: number;
  bold?: boolean;
  paddingLeft?: string;
  zebra: boolean;
}) {
  return (
    <tr className={`${zebra ? "bg-surface" : "bg-background"} ${bold ? "font-semibold" : ""}`}>
      <td className="px-4 py-2 text-foreground" style={{ paddingLeft: paddingLeft ?? "1rem" }}>
        {name}
      </td>
      <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">{formatMoney(value)}</td>
    </tr>
  );
}

function NiifView({ data, names }: { data: Record<string, number>; names: Record<string, string> }) {
  const codes = Object.keys(data).sort();
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <tbody>
          {codes.map((code, idx) => {
            const depth = Math.max(0, Math.floor((code.length - 1) / 2));
            return (
              <Row
                key={code}
                name={names[code] ?? code}
                value={data[code]}
                bold={depth === 0}
                paddingLeft={`${1 + depth * 1.25}rem`}
                zebra={idx % 2 === 0}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SriView({ data, names }: { data: Record<string, number>; names: Record<string, string> }) {
  const codes = Object.keys(data)
    .filter((c) => !isDeclarative(c, names[c]))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const groups = SRI_SECTIONS.map((s) => ({
    title: s.title,
    items: codes.filter((c) => s.test(parseInt(c, 10))),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">
        Este período fue declarado con el formulario tributario del SRI, por eso las cuentas
        siguen ese esquema y no la taxonomía NIIF.
      </p>
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody>
                {g.items.map((code, idx) => {
                  const name = names[code] ?? code;
                  const bold = /^(TOTAL|\(=\))/i.test(name.trim());
                  return (
                    <Row key={code} name={name} value={data[code]} bold={bold} zebra={idx % 2 === 0} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BalanceSheetView({
  data,
  names,
  catalogId,
}: {
  data: Record<string, number>;
  names: Record<string, string>;
  catalogId: number;
}) {
  if (Object.keys(data).length === 0) {
    return <p className="text-sm text-muted">No hay detalle de cuentas disponible para este período.</p>;
  }
  return SRI_CATALOGS.has(catalogId) ? (
    <SriView data={data} names={names} />
  ) : (
    <NiifView data={data} names={names} />
  );
}
