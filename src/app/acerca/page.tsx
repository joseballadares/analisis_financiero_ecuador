import Link from "next/link";

export const metadata = {
  title: "Acerca de — Ecuador Financiero",
  description: "Qué es Ecuador Financiero, qué viene, de dónde vienen los datos, cómo se calculan los ratios y qué límites tienen.",
};

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
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
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Acerca de Ecuador Financiero</h1>
      <p className="mt-3 text-muted">
        Un proyecto independiente para leer, comparar y entender las cifras de las empresas del Ecuador con datos públicos.
      </p>

      <Section title="¿Qué es este sitio?">
        <p>
          Ecuador Financiero se hizo con un <strong>fin informativo</strong>: reunir en un solo lugar la información financiera que las
          compañías ecuatorianas ya reportan a la Superintendencia de Compañías, Valores y Seguros y presentarla de forma clara, con ratios,
          gráficos y comparaciones con empresas similares.
        </p>
        <p>
          Todas las cifras de cada empresa provienen de <strong>datos públicos</strong>. No hay información privada, ni acceso a cuentas, ni
          datos personales de usuarios: cualquiera puede consultar una empresa sin registrarse.
        </p>
        <p>
          Pensamos en quien necesita conocer mejor una empresa o un sector: estudiantes, periodistas, emprendedores, proveedores, analistas
          y curiosos de la economía.
        </p>
      </Section>

      <Section title="Qué encuentras hoy">
        <ul>
          <li>La <strong>ficha y el resumen</strong> de cada empresa: ingresos, utilidad, activos, patrimonio y su posición en el ranking.</li>
          <li><strong>Estados financieros</strong> línea por línea (2019–2025) con tendencia por cuenta, y más de 30 <strong>ratios</strong> desde 2008.</li>
          <li><strong>Comparables</strong>: cada empresa frente a las más parecidas en tamaño y actividad, con semáforo.</li>
          <li>Una pestaña de <strong>alertas y crédito</strong> con un puntaje orientativo y banderas de atención.</li>
          <li>Un <strong>informe profesional en PDF</strong> por empresa.</li>
          <li>Páginas de <strong>ranking, sectores y provincias</strong>, y el Radar Estratégico.</li>
        </ul>
      </Section>

      <Section title="Qué viene">
        <p>
          En el futuro se irá agregando más información pública: <strong>mercado de valores</strong>,{" "}
          <strong>compras públicas</strong> (contratación pública) y otras fuentes oficiales que ayuden a completar el retrato de cada
          empresa. Son planes, no compromisos con fechas: se publicarán cuando los datos estén verificados.
        </p>
      </Section>

      <Section title="Principios">
        <ul>
          <li><strong>Fuentes públicas y citadas.</strong> Decimos de dónde sale cada dato.</li>
          <li>
            <strong>Transparencia metodológica.</strong> Explicamos abajo cómo se calcula cada ratio y qué correcciones aplicamos, incluidos los
            límites conocidos.
          </li>
          <li><strong>Independencia.</strong> No tenemos afiliación con la Superintendencia ni con ninguna empresa de las que aparecen.</li>
          <li><strong>Neutralidad.</strong> Las alertas y los puntajes describen cifras; no juzgan a las empresas ni a las personas.</li>
        </ul>
      </Section>

      <div id="metodologia" className="scroll-mt-20">
        <h2 className="mt-14 border-t border-border pt-8 text-2xl font-semibold tracking-tight">Metodología y fuentes</h2>
        <p className="mt-3 text-muted">
          De dónde salen los datos, qué correcciones les hacemos y qué límites tienen, para que sepas cuánta confianza darle a cada cifra.
        </p>
      </div>

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

      <Section title="Cómo se arma el Radar Estratégico">
        <p>
          La portada y la pestaña <Link href="/ranking?vista=radar" className="text-brand hover:underline">Radar Estratégico</Link>{" "}
          del ranking son una <strong>selección editorial automatizada</strong> para leer sobre empresas y ver su evolución. No es una
          recomendación de inversión y tiene sesgos que declaramos abajo.
        </p>
        <p>
          <strong>Población:</strong> las 2.000 empresas con más ingresos operacionales del último año. Deben cumplir controles de
          calidad: ingresos positivos en cada uno de los últimos 5 años, balance NIIF en el último año, patrimonio positivo y de al menos
          10 % del activo, estar activas, no tener datos parciales y no ser holdings puros (CIIU K642), cuyos ratios no son comparables.
        </p>
        <p>Cada empresa recibe una señal cuando está en el 10 % superior de las elegibles en alguno de estos criterios:</p>
        <ul>
          <li><strong>Rentabilidad sostenida:</strong> ROE promedio de 3 años (con patrimonio de al menos 15 % del activo y ROE hasta 150 %).</li>
          <li><strong>Operación eficiente:</strong> margen EBITDA del último año, dentro de su sector (excluye empresas sin depreciación reportada, cuyo EBITDA saldría subestimado).</li>
          <li><strong>Mejora operativa:</strong> aumento del margen EBITDA desde hace 3 años.</li>
          <li><strong>Crecimiento sostenido:</strong> crecimiento anual compuesto de ingresos en 5 años, con alza en al menos 3 de los 4 años.</li>
          <li><strong>Escalada en el ranking:</strong> puestos ganados en 5 años en el ranking general de la Superintendencia.</li>
          <li><strong>Giro de resultados:</strong> mayor cambio del margen neto en 5 años (al menos 3 puntos), hacia arriba o hacia abajo.</li>
        </ul>
        <p>
          No se usan el flujo de caja libre, el ROIC ni la deuda neta / EBITDA: existen solo desde los años con balance NIIF (2022), son
          estimados o aproximados y darían tendencias de 3 años con mucho ruido. Se muestran en el perfil de cada empresa.
        </p>
        <p>
          <strong>Sesgos:</strong> exigir 5 años de datos excluye empresas nuevas o que cerraron; el filtro por ingresos favorece a
          sectores como minería, petróleo y comercio (por eso el margen EBITDA se compara dentro del sector); los cambios extremos
          suelen revertirse; y el EBITDA es aproximado porque la depreciación reportada puede ser incompleta.
        </p>
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
            Contra los estados auditados públicos de 11 empresas, los totales coinciden.
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
            Las cifras de cada empresa no incorporan información macroeconómica, de contratación pública ni datos del contribuyente del SRI (por ahora).
          </li>
        </ul>
      </Section>

      <Section id="aviso" title="Aviso legal">
        <p>
          Esta página se hizo con <strong>fines informativos</strong> y usa datos públicos. Puede contener errores, omisiones o datos
          desactualizados; los del último año pueden cambiar mientras la Superintendencia recibe balances. Verifica siempre la información en la
          fuente oficial antes de usarla.
        </p>
        <p>
          Nada de lo publicado aquí es una recomendación de compra, venta o inversión, ni asesoría financiera, legal, contable o tributaria. Los
          puntajes, alertas y comparables son herramientas de lectura, no dictámenes. Ecuador Financiero no tiene afiliación oficial con la
          Superintendencia de Compañías, Valores y Seguros ni con las empresas mencionadas, y no se responsabiliza por decisiones tomadas con
          base en esta información.
        </p>
        <p className="pt-2 text-foreground">
          Esta página es solo informativa y no ofrece consejos de inversión ni asesoría financiera reales.{" "}
          <a
            href="https://www.youtube.com/watch?v=LtFyP0qy9XU"
            target="_blank"
            rel="noopener noreferrer"
            className="italic text-foreground no-underline hover:underline hover:decoration-dotted"
          >
            It&apos;s just money.
          </a>
        </p>
      </Section>

      <p className="mt-10 text-sm">
        <Link href="/buscar" className="text-brand hover:underline">
          Buscar una empresa →
        </Link>
      </p>
    </div>
  );
}
