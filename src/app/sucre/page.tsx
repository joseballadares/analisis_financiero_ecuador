import type { Metadata } from "next";
import Link from "next/link";
import SucreConverter from "@/components/eggs/SucreConverter";

export const metadata: Metadata = {
  title: "★ La página del SUCRE ★",
  robots: { index: false, follow: false },
};

const WIKI_ES = "https://es.wikipedia.org/wiki/Sucre_ecuatoriano";
const WIKI_EN = "https://en.wikipedia.org/wiki/Ecuadorian_sucre";
const EQUIV: [string, string][] = [
  ["0,25", "6.250"],
  ["1", "25.000"],
  ["5", "125.000"],
  ["10", "250.000"],
  ["20", "500.000"],
  ["100", "2.500.000"],
];

// Página escondida en honor al sucre, con estética de internet del año 2000. Cubre toda la ventana.
export default function SucrePage() {
  return (
    <div className="y2k fixed inset-0 z-50 overflow-auto">
      <div className="y2k-wrap">
        <div className="y2k-marquee" aria-hidden>
          <span>★ ¡¡¡ 1 DÓLAR = 25.000 SUCRES !!! ★ Bienvenido a la página oficial del SUCRE (1884 – 2000) ★ Gracias por tu visita ★</span>
        </div>

        <h1 className="y2k-title">¡Bienvenidos a la página del SUCRE!</h1>
        <p className="y2k-sub">
          <span className="y2k-blink">¡NUEVO!</span> Ahora con conversor de dólares · Mejor visto a 800x600
        </p>
        <hr className="y2k-rainbow" />

        <div className="y2k-layout">
          <div className="y2k-side">
            <a className="y2k-btn" href="#homenaje">Homenaje</a>
            <a className="y2k-btn" href="#historia">Historia</a>
            <a className="y2k-btn" href="#conversor">Conversor</a>
            <a className="y2k-btn" href="#tabla">Equivalencias</a>
            <a className="y2k-btn" href={WIKI_ES} target="_blank" rel="noopener noreferrer">Wikipedia</a>
            <Link className="y2k-btn" href="/">« Volver</Link>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11 }}>
              Visitante número
              <div className="y2k-counter" aria-label="Contador de visitas">
                {"0013370".split("").map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="y2k-box y2k-quote" id="homenaje">
              <h2>En honor al sucre</h2>
              <p style={{ margin: "4px 0" }}>
                Durante <b>116 años</b> (1884–2000) el sucre fue la moneda de todos los ecuatorianos. Pagó el pan, el bus y el mercado; lo
                llevamos en el bolsillo, lo contamos de mil en mil y, al final, de veinticinco mil en veinticinco mil.
                <br />
                <br />
                <b>¡Gracias, sucre!</b> Descansa en paz junto a tus billetes con próceres.
              </p>
              <p style={{ margin: "8px 0 0" }}>
                » <a href={WIKI_ES} target="_blank" rel="noopener noreferrer">Lee la historia completa del sucre ecuatoriano en Wikipedia</a>
              </p>
            </div>

            <div className="y2k-box" id="historia">
              <h2>Historia rápida</h2>
              <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                <li>El <b>22 de marzo de 1884</b> el Ecuador adoptó el sucre como unidad monetaria, en lugar del peso.</li>
                <li>Se llama así por <b>Antonio José de Sucre</b>.</li>
                <li>En 1999 perdió cerca de dos tercios de su valor frente al dólar.</li>
                <li>A inicios de <b>enero de 2000</b> el presidente Jamil Mahuad anunció que el dólar reemplazaría al sucre (el 9 según Wikipedia; el Banco Central lo registra el 10).</li>
                <li>El tipo de cambio quedó fijado en <b>25.000 sucres por dólar</b>.</li>
                <li>En <b>septiembre de 2000</b> el sucre dejó de ser moneda de curso legal; se pudo canjear en el Banco Central hasta el 30 de marzo de 2001.</li>
              </ul>
              <p style={{ margin: "6px 0 0", fontSize: 12 }}>
                Fuentes:{" "}
                <a href={WIKI_ES} target="_blank" rel="noopener noreferrer">Wikipedia (es)</a> ·{" "}
                <a href={WIKI_EN} target="_blank" rel="noopener noreferrer">Wikipedia (en)</a> ·{" "}
                <a href="https://contenido.bce.fin.ec/documentos/PublicacionesNotas/Catalogo/Memoria/2000/1raparte.pdf" target="_blank" rel="noopener noreferrer">Banco Central, Memoria 2000</a>
              </p>
            </div>

            <div className="y2k-tape" style={{ marginBottom: 10 }}>
              <b>⚠ PÁGINA EN CONSTRUCCIÓN ⚠</b>
            </div>

            <div className="y2k-box" id="conversor">
              <h2>Conversor SUCRE ⇄ DÓLAR v1.0</h2>
              <SucreConverter />
            </div>

            <div className="y2k-box" id="tabla">
              <h2>Tabla de equivalencias</h2>
              <table className="y2k-table y2k-tablebox" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Dólares (US$)</th>
                    <th>Sucres</th>
                  </tr>
                </thead>
                <tbody>
                  {EQUIV.map(([d, s]) => (
                    <tr key={d}>
                      <td>{d}</td>
                      <td>{s}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: "center" }}>
              <span className="y2k-badge">Mejor visto con Internet Explorer 5.0</span>
              <span className="y2k-badge">Resolución 800x600</span>
              <span className="y2k-badge">Hecho a mano con el Bloc de notas</span>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, margin: "8px 0 20px" }}>
              Última actualización: septiembre de 2000 (bueno, 2026). <br />© Todos los sucres reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
