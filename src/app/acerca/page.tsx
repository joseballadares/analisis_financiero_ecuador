import Link from "next/link";

export const metadata = {
  title: "Metodología — Ecuador Financiero",
  description: "De dónde vienen los datos, cómo se calculan los ratios y qué límites tienen.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted [&_strong]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </section>
  );
}

export default function AcercaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Metodología y fuentes</h1>
      <p className="mt-3 text-muted">
        Ecuador Financiero es un proyecto independiente. Esta página explica de dónde salen los datos, qué
        correcciones les hacemos y qué límites tienen, para que sepas cuánta confianza darle a cada cifra.
      </p>

      <Section title="Fuente de los datos">
        <p>
          Todo proviene de la <strong>Superintendencia de Compañías, Valores y Seguros (SCVS)</strong>: el
          registro de compañías y su clasificación por tamaño y actividad (CIIU), el ranking anual de empresas con
          sus indicadores (2008–2025) y los <strong>estados financieros línea por línea</strong> (2019–2025). No
          usamos información de terceros para las cifras de cada empresa.
        </p>
        <p>
          La cobertura son unas 150.000 empresas con datos del último año. Las compañías que no presentaron
          balance ese año no aparecen en las tablas de ese año.
        </p>
      </Section>

      <Section title="Qué significa cada cifra">
        <ul>
          <li>
            <strong>Ingresos:</strong> ingresos operacionales (ventas y prestación de servicios). No incluyen otros
            ingresos como intereses o ganancias no operacionales, por lo que pueden ser algo menores que el
            &quot;total de ingresos&quot; de la declaración.
          </li>
          <li>
            <strong>Activos, patrimonio y utilidad neta:</strong> tal como los declara la empresa. El pasivo se
            obtiene como activos menos patrimonio.
          </li>
          <li>
            <strong>Estados financieros:</strong> hasta 2021 la mayoría de las empresas presentó el formulario
            tributario del SRI (menos detallado) y desde 2022 estados NIIF. Las series antes y después de 2022 no
            son comparables línea por línea.
          </li>
        </ul>
      </Section>

      <Section title="Correcciones que aplicamos a los ratios">
        <p>
          Al auditar el archivo de indicadores de la Superintendencia contra los balances encontramos problemas, y
          los corregimos en lugar de repetirlos:
        </p>
        <ul>
          <li>
            <strong>Signo perdido:</strong> ROE, ROA, margen neto y endeudamiento patrimonial aparecían positivos
            cuando la empresa tenía pérdidas o patrimonio negativo. Se recalculan con las cifras exactas y se
            muestra un guion cuando el ratio no tiene sentido (por ejemplo, ROE con patrimonio negativo).
          </li>
          <li>
            <strong>Períodos de cobranza y pago inverosímiles</strong> (por ejemplo, 118.323 días) y utilidad
            operacional mal definida: se recalculan. La utilidad operacional es ingresos menos costo de ventas y
            menos gastos de administración y ventas.
          </li>
          <li>
            <strong>Truncado:</strong> la fuente corta los ratios a dos decimales en vez de redondearlos, lo que
            los sesga a la baja hasta 0,01. Margen bruto, endeudamiento del activo y rotación de activos se
            recalculan exactos; liquidez y prueba ácida conservan dos decimales.
          </li>
          <li>
            <strong>Último año incompleto:</strong> para cerca del 1% de las empresas la fuente trae ceros en el
            último año aunque el balance existe; en esos casos tomamos las cifras principales del balance y
            omitimos los ratios que no se pueden calcular con él.
          </li>
          <li>
            <strong>Período medio de pago:</strong> se estima como cuentas por pagar comerciales por 365 sobre el
            costo de ventas, solo para balances NIIF, porque la fuente no informa las compras.
          </li>
        </ul>
      </Section>

      <Section title="Cómo se calculan los promedios del sector y los pares">
        <ul>
          <li>
            <strong>Referencia de una empresa:</strong> mediana de las hasta 500 empresas activas más cercanas en
            tamaño (por ingresos) dentro de la misma actividad CIIU; si hay menos de 30, se amplía a la clase, el
            grupo y por último el sector.
          </li>
          <li>
            <strong>Página de sector:</strong> mediana de las 500 empresas activas de mayores ingresos del sector.
          </li>
          <li>
            <strong>Empresa activa:</strong> ingresos operacionales de al menos $1.000. Se usan medianas y no
            promedios porque unos pocos casos extremos distorsionan los promedios, y se excluyen las empresas
            vacías porque contaminaban los resultados (por ejemplo, márgenes brutos de 100% por falta de costos).
          </li>
          <li>
            <strong>Empresas sin actividad:</strong> con ingresos menores a $1.000 mostramos un aviso y omitimos
            comparables y ratios de rentabilidad y gestión, que no tendrían significado.
          </li>
          <li>
            <strong>Participación en el segmento:</strong> ingresos de la empresa sobre los de todas las empresas
            de su misma clase de actividad (CIIU de cinco caracteres).
          </li>
        </ul>
      </Section>

      <Section title="Cómo verificamos los datos">
        <ul>
          <li>
            Contra los balances crudos de la Superintendencia (más de 860.000 balances), activos, patrimonio y
            utilidad neta coinciden entre 99,8% y 99,96% de las veces en 2019–2024.
          </li>
          <li>
            Contra el top 1.000 de empresas por ingresos publicado por la Superintendencia para 2024, 966 de 976
            coinciden en ingresos con menos de 0,1% de diferencia.
          </li>
          <li>
            Contra los estados auditados públicos de 11 empresas y contra la plataforma rikuna (30 empresas), los
            totales coinciden; en ella encontramos errores propios (ingresos 2019–2021 duplicados y signos
            perdidos) que aquí no se repiten.
          </li>
        </ul>
        <p>
          Las diferencias que quedan vienen de lo que las empresas declaran (reexpresiones, reclasificaciones), no de
          la carga.
        </p>
      </Section>

      <Section title="Límites conocidos">
        <ul>
          <li>Los datos del último año pueden cambiar mientras la Superintendencia termina de recibir balances.</li>
          <li>
            El CIIU es el registrado por la empresa; algunas mantienen uno desactualizado respecto de su actividad
            real. La provincia es la de constitución legal.
          </li>
          <li>
            Los ratios operacionales dependen de que la empresa declare bien su costo de ventas y sus gastos.
          </li>
          <li>
            No usamos información macroeconómica, de contratación pública ni datos del contribuyente del SRI.
          </li>
          <li>Esto no es asesoría financiera ni de inversión y no tiene afiliación oficial con la Superintendencia.</li>
        </ul>
      </Section>

      <p className="mt-10 text-sm">
        <Link href="/buscar" className="text-brand hover:underline">
          Buscar una empresa →
        </Link>
      </p>
    </div>
  );
}
