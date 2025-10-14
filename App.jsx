import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";

function App() {
  const [funcion, setFuncion] = useState("Math.sin(x)");
  const [xmin, setXmin] = useState(-10);
  const [xmax, setXmax] = useState(10);
  const [x, setX] = useState([]);
  const [y, setY] = useState([]);
  const [error, setError] = useState("");

  // Generar los puntos de la función
  useEffect(() => {
    try {
      const xVals = [];
      const yVals = [];
      const f = new Function("x", `return ${funcion}`);
      for (let i = xmin; i <= xmax; i += (xmax - xmin) / 1000) {
        xVals.push(i);
        yVals.push(f(i));
      }
      setX(xVals);
      setY(yVals);
      setError("");
    } catch (err) {
      setError("⚠️ Error en la función o rango. Verifica la sintaxis.");
    }
  }, [funcion, xmin, xmax]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>📈 Graficador de Funciones</h1>

      <div style={{ marginBottom: "20px" }}>
        <label>f(x) = </label>
        <input
          type="text"
          value={funcion}
          onChange={(e) => setFuncion(e.target.value)}
          style={{ width: "300px", marginRight: "10px" }}
        />
        <br /><br />
        <label>xmin: </label>
        <input
          type="number"
          value={xmin}
          onChange={(e) => setXmin(parseFloat(e.target.value))}
          style={{ width: "80px", marginRight: "10px" }}
        />
        <label>xmax: </label>
        <input
          type="number"
          value={xmax}
          onChange={(e) => setXmax(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
      </div>

      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <Plot
          data={[
            {
              x: x,
              y: y,
              type: "scatter",
              mode: "lines",
              line: { width: 2 },
            },
          ]}
          layout={{
            title: `Gráfica de f(x) = ${funcion}`,
            xaxis: { title: "x" },
            yaxis: { title: "f(x)" },
          }}
          style={{ width: "100%", maxWidth: "700px", margin: "auto" }}
        />
      )}
    </div>
  );
}

export default App;
