import React, { useState, useEffect, useRef } from 'react';
import './GraficadorFunciones.css';

const GraficadorFunciones = () => {
  const [funcion, setFuncion] = useState('Math.sin(x)');
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [error, setError] = useState('');
  const [puntos, setPuntos] = useState([]);
  const [rangoY, setRangoY] = useState({ min: -2, max: 2 });
  const [historial, setHistorial] = useState([]);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  
  const canvasRef = useRef(null);
  
  const funcionesPredefinidas = [
    { nombre: 'Seno', valor: 'Math.sin(x)' },
    { nombre: 'Coseno', valor: 'Math.cos(x)' },
    { nombre: 'Tangente', valor: 'Math.tan(x)' },
    { nombre: 'Exponencial Amortiguada', valor: 'Math.exp(-x/10)*Math.cos(x)' },
    { nombre: 'Parábola', valor: 'x**2 + 3*x - 5' },
    { nombre: 'Cúbica', valor: 'x**3 - 2*x**2 + x - 1' },
    { nombre: 'Logaritmo', valor: 'Math.log(Math.abs(x) + 0.1)' },
    { nombre: 'Raíz Cuadrada', valor: 'Math.sqrt(Math.abs(x))' },
    { nombre: 'Valor Absoluto', valor: 'Math.abs(x)' },
    { nombre: 'Seno Hiperbólico', valor: '(Math.exp(x) - Math.exp(-x))/2' },
    { nombre: 'Gaussiana', valor: 'Math.exp(-x**2/2)' },
    { nombre: 'Función Escalón', valor: 'x >= 0 ? 1 : 0' },
  ];

  // Evaluador seguro de funciones
  const evaluarFuncion = (fn, x) => {
    try {
      // Sanitizar y preparar la función
      const sanitizedFn = fn
        .replace(/\^/g, '**') // Convertir ^ a **
        .replace(/Math\.pi/g, Math.PI) // Reemplazar Math.pi por el valor
        .replace(/Math\.e/g, Math.E); // Reemplazar Math.e por el valor
      
      // Crear una función segura
      const funcionEvaluadora = new Function('x', `
        "use strict";
        try {
          const resultado = ${sanitizedFn};
          if (typeof resultado !== 'number' || isNaN(resultado)) {
            throw new Error('Resultado no es un número válido');
          }
          return resultado;
        } catch (e) {
          throw new Error('Error en evaluación: ' + e.message);
        }
      `);
      
      return funcionEvaluadora(x);
    } catch (e) {
      throw new Error(`Error en la función: ${e.message}`);
    }
  };

  // Generar puntos para la gráfica
  const generarPuntos = () => {
    // Validaciones
    if (xMin >= xMax) {
      setError('El valor mínimo de X debe ser menor que el máximo');
      return;
    }
    
    if (!funcion.trim()) {
      setError('Por favor ingrese una función');
      return;
    }
    
    if (xMax - xMin > 1000) {
      setError('El rango de X es demasiado grande. Por favor, usa un rango menor');
      return;
    }
    
    try {
      const puntosGenerados = [];
      let minY = Infinity;
      let maxY = -Infinity;
      const numPuntos = 800;
      const paso = (xMax - xMin) / numPuntos;
      
      for (let i = 0; i <= numPuntos; i++) {
        const x = xMin + i * paso;
        
        try {
          const y = evaluarFuncion(funcion, x);
          
          if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
            puntosGenerados.push({ x, y });
            
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        } catch (e) {
          // Continuar con el siguiente punto
          continue;
        }
      }
      
      if (puntosGenerados.length === 0) {
        throw new Error('No se pudo evaluar la función en el rango especificado');
      }
      
      // Calcular márgenes para Y
      const margenY = Math.max((maxY - minY) * 0.1, 0.5);
      const nuevoMinY = minY - margenY;
      const nuevoMaxY = maxY + margenY;
      
      // Si el rango Y es demasiado grande, usar valores por defecto
      if (Math.abs(nuevoMaxY - nuevoMinY) > 1e6) {
        setRangoY({ min: -10, max: 10 });
      } else {
        setRangoY({ min: nuevoMinY, max: nuevoMaxY });
      }
      
      setPuntos(puntosGenerados);
      setError('');
      
      // Agregar al historial
      if (historial.length === 0 || historial[historial.length - 1].funcion !== funcion) {
        const nuevoHistorial = [
          ...historial.slice(-4), // Mantener solo los últimos 5
          { funcion, xMin, xMax, timestamp: new Date().toLocaleTimeString() }
        ];
        setHistorial(nuevoHistorial);
      }
    } catch (e) {
      setError(e.message);
      setPuntos([]);
    }
  };

  // Dibujar la gráfica en el canvas
  const dibujarGrafica = () => {
    const canvas = canvasRef.current;
    if (!canvas || puntos.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Fondo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Calcular escalas
    const escalaX = (width - padding.left - padding.right) / (xMax - xMin);
    const escalaY = (height - padding.top - padding.bottom) / (rangoY.max - rangoY.min);
    
    // Funciones de conversión
    const aPixelX = (x) => padding.left + (x - xMin) * escalaX;
    const aPixelY = (y) => height - padding.bottom - (y - rangoY.min) * escalaY;
    
    // Dibujar cuadrícula
    ctx.beginPath();
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    
    // Líneas verticales de la cuadrícula
    const pasoCuadriculaX = calcularPasoCuadricula(xMin, xMax);
    for (let x = Math.ceil(xMin / pasoCuadriculaX) * pasoCuadriculaX; x <= xMax; x += pasoCuadriculaX) {
      const pixelX = aPixelX(x);
      ctx.moveTo(pixelX, padding.top);
      ctx.lineTo(pixelX, height - padding.bottom);
    }
    
    // Líneas horizontales de la cuadrícula
    const pasoCuadriculaY = calcularPasoCuadricula(rangoY.min, rangoY.max);
    for (let y = Math.ceil(rangoY.min / pasoCuadriculaY) * pasoCuadriculaY; y <= rangoY.max; y += pasoCuadriculaY) {
      const pixelY = aPixelY(y);
      ctx.moveTo(padding.left, pixelY);
      ctx.lineTo(width - padding.right, pixelY);
    }
    ctx.stroke();
    
    // Dibujar ejes
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Eje X
    const origenY = aPixelY(0);
    if (origenY >= padding.top && origenY <= height - padding.bottom) {
      ctx.moveTo(padding.left, origenY);
      ctx.lineTo(width - padding.right, origenY);
    } else {
      // Dibujar eje X en el borde más cercano
      const yEje = rangoY.min > 0 ? height - padding.bottom : padding.top;
      ctx.moveTo(padding.left, yEje);
      ctx.lineTo(width - padding.right, yEje);
    }
    
    // Eje Y
    const origenX = aPixelX(0);
    if (origenX >= padding.left && origenX <= width - padding.right) {
      ctx.moveTo(origenX, padding.top);
      ctx.lineTo(origenX, height - padding.bottom);
    } else {
      // Dibujar eje Y en el borde más cercano
      const xEje = xMin > 0 ? padding.left : width - padding.right;
      ctx.moveTo(xEje, padding.top);
      ctx.lineTo(xEje, height - padding.bottom);
    }
    
    ctx.stroke();
    
    // Dibujar marcas y etiquetas en los ejes
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Marcas en eje X
    for (let x = Math.ceil(xMin / pasoCuadriculaX) * pasoCuadriculaX; x <= xMax; x += pasoCuadriculaX) {
      const pixelX = aPixelX(x);
      ctx.beginPath();
      ctx.moveTo(pixelX, aPixelY(0) - 5);
      ctx.lineTo(pixelX, aPixelY(0) + 5);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Etiqueta
      const formato = Math.abs(x) < 0.001 ? '0' : 
                     Math.abs(x) < 10 ? x.toFixed(2).replace(/\.?0+$/, '') : 
                     x.toFixed(1).replace(/\.0$/, '');
      ctx.fillText(formato, pixelX, aPixelY(0) + 8);
    }
    
    // Marcas en eje Y
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = Math.ceil(rangoY.min / pasoCuadriculaY) * pasoCuadriculaY; y <= rangoY.max; y += pasoCuadriculaY) {
      const pixelY = aPixelY(y);
      ctx.beginPath();
      ctx.moveTo(aPixelX(0) - 5, pixelY);
      ctx.lineTo(aPixelX(0) + 5, pixelY);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Etiqueta
      const formato = Math.abs(y) < 0.001 ? '0' : 
                     Math.abs(y) < 10 ? y.toFixed(2).replace(/\.?0+$/, '') : 
                     y.toFixed(1).replace(/\.0$/, '');
      ctx.fillText(formato, aPixelX(0) - 8, pixelY);
    }
    
    // Restaurar alineación
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    
    // Dibujar la función
    if (puntos.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      let primerPuntoValido = false;
      for (let i = 0; i < puntos.length; i++) {
        const punto = puntos[i];
        const pixelX = aPixelX(punto.x);
        const pixelY = aPixelY(punto.y);
        
        // Verificar discontinuidades
        if (i > 0) {
          const puntoAnterior = puntos[i-1];
          const distanciaX = Math.abs(punto.x - puntoAnterior.x);
          const distanciaY = Math.abs(punto.y - puntoAnterior.y);
          
          // Si hay una discontinuidad (salto grande en Y), interrumpir la línea
          if (distanciaY > Math.abs(rangoY.max - rangoY.min) * 0.5) {
            primerPuntoValido = false;
            continue;
          }
        }
        
        if (!primerPuntoValido) {
          ctx.moveTo(pixelX, pixelY);
          primerPuntoValido = true;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      }
      
      ctx.stroke();
      
      // Dibujar puntos en la curva
      ctx.fillStyle = '#2980b9';
      const densidadPuntos = Math.max(1, Math.floor(puntos.length / 50));
      for (let i = 0; i < puntos.length; i += densidadPuntos) {
        const punto = puntos[i];
        ctx.beginPath();
        ctx.arc(aPixelX(punto.x), aPixelY(punto.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Títulos y etiquetas
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`f(x) = ${formatearFuncion(funcion)}`, width / 2, 25);
    
    ctx.font = '14px Arial';
    ctx.fillText('Eje X', width / 2, height - 15);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Eje Y', 0, 0);
    ctx.restore();
  };

  // Funciones auxiliares
  const calcularPasoCuadricula = (min, max) => {
    const rango = max - min;
    const potencia = Math.floor(Math.log10(rango));
    const factor = rango / Math.pow(10, potencia);
    
    if (factor < 2) return Math.pow(10, potencia - 1);
    if (factor < 5) return 2 * Math.pow(10, potencia - 1);
    return 5 * Math.pow(10, potencia - 1);
  };

  const formatearFuncion = (fn) => {
    return fn
      .replace(/\*\*/g, '^')
      .replace(/Math\./g, '')
      .replace(/sin/g, 'sen')
      .replace(/cos/g, 'cos')
      .replace(/tan/g, 'tan')
      .replace(/exp/g, 'exp')
      .replace(/log/g, 'ln')
      .replace(/sqrt/g, '√');
  };

  // Manejadores de eventos
  const handleFuncionChange = (e) => {
    setFuncion(e.target.value);
  };

  const handleXMinChange = (e) => {
    const valor = parseFloat(e.target.value);
    if (!isNaN(valor)) setXMin(valor);
  };

  const handleXMaxChange = (e) => {
    const valor = parseFloat(e.target.value);
    if (!isNaN(valor)) setXMax(valor);
  };

  const seleccionarFuncionPredefinida = (valor) => {
    setFuncion(valor);
  };

  const cargarDelHistorial = (item) => {
    setFuncion(item.funcion);
    setXMin(item.xMin);
    setXMax(item.xMax);
  };

  const resetGraficador = () => {
    setFuncion('Math.sin(x)');
    setXMin(-10);
    setXMax(10);
    setError('');
  };

  const descargarImagen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `grafica-${funcion.replace(/[^a-z0-9]/gi, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Efectos
  useEffect(() => {
    generarPuntos();
  }, [funcion, xMin, xMax]);

  useEffect(() => {
    dibujarGrafica();
  }, [puntos, rangoY]);

  return (
    <div className="graficador-container">
      <header className="header">
        <h1>📈 Graficador de Funciones Matemáticas</h1>
        <p className="subtitle">Visualiza funciones en tiempo real con React</p>
      </header>
      
      <div className="main-content">
        <div className="panel-configuracion">
          <div className="card">
            <h2>Configuración</h2>
            
            <div className="input-group">
              <label htmlFor="funcion">
                <strong>Función f(x):</strong>
                <span className="info-icon" title="Usa 'x' como variable. Ej: sin(x), x^2, exp(x)">
                  ℹ️
                </span>
              </label>
              <div className="input-with-button">
                <input
                  type="text"
                  id="funcion"
                  value={funcion}
                  onChange={handleFuncionChange}
                  placeholder="Ej: sin(x), x**2 + 3*x - 5, exp(-x/10)*cos(x)"
                  className="funcion-input"
                />
                <button 
                  className="btn-clear" 
                  onClick={() => setFuncion('')}
                  title="Limpiar función"
                >
                  ✕
                </button>
              </div>
              <div className="hint">
                Puedes usar: sin(x), cos(x), tan(x), exp(x), log(x), sqrt(x), abs(x), x**2 para x²
              </div>
            </div>
            
            <div className="rangos-config">
              <h3>Rango del Eje X</h3>
              <div className="rangos-inputs">
                <div className="rango-item">
                  <label htmlFor="xmin">Mínimo:</label>
                  <input
                    type="number"
                    id="xmin"
                    value={xMin}
                    onChange={handleXMinChange}
                    step="0.5"
                    className="rango-input"
                  />
                </div>
                <div className="flecha-rango">→</div>
                <div className="rango-item">
                  <label htmlFor="xmax">Máximo:</label>
                  <input
                    type="number"
                    id="xmax"
                    value={xMax}
                    onChange={handleXMaxChange}
                    step="0.5"
                    className="rango-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="acciones">
              <button className="btn btn-primary" onClick={generarPuntos}>
                🔄 Regenerar Gráfica
              </button>
              <button className="btn btn-secondary" onClick={resetGraficador}>
                ↺ Reiniciar
              </button>
              <button className="btn btn-success" onClick={descargarImagen}>
                📥 Descargar Imagen
              </button>
            </div>
          </div>
          
          <div className="card">
            <h3>Funciones Predefinidas</h3>
            <div className="funciones-grid">
              {funcionesPredefinidas.map((fn, index) => (
                <button
                  key={index}
                  className={`funcion-btn ${funcion === fn.valor ? 'active' : ''}`}
                  onClick={() => seleccionarFuncionPredefinida(fn.valor)}
                  title={fn.valor}
                >
                  {fn.nombre}
                </button>
              ))}
            </div>
          </div>
          
          {historial.length > 0 && (
            <div className="card">
              <h3>Historial</h3>
              <div className="historial">
                {historial.slice().reverse().map((item, index) => (
                  <div 
                    key={index} 
                    className="historial-item"
                    onClick={() => cargarDelHistorial(item)}
                  >
                    <div className="historial-funcion">
                      {formatearFuncion(item.funcion).substring(0, 30)}...
                    </div>
                    <div className="historial-info">
                      X: [{item.xMin}, {item.xMax}] • {item.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="card">
            <h3>
              Ayuda 
              <button 
                className="btn-toggle-ayuda"
                onClick={() => setMostrarAyuda(!mostrarAyuda)}
              >
                {mostrarAyuda ? '▲' : '▼'}
              </button>
            </h3>
            {mostrarAyuda && (
              <div className="ayuda-contenido">
                <p><strong>Sintaxis soportada:</strong></p>
                <ul>
                  <li><code>+ - * /</code> Operaciones básicas</li>
                  <li><code>**</code> o <code>^</code> Potencia (ej: x**2 o x^2)</li>
                  <li><code>sin(x), cos(x), tan(x)</code> Funciones trigonométricas</li>
                  <li><code>exp(x)</code> Exponencial e^x</li>
                  <li><code>log(x)</code> Logaritmo natural</li>
                  <li><code>sqrt(x)</code> Raíz cuadrada</li>
                  <li><code>abs(x)</code> Valor absoluto</li>
                  <li><code>Math.PI</code> Constante π</li>
                  <li><code>Math.E</code> Constante e</li>
                </ul>
                <p><strong>Ejemplos avanzados:</strong></p>
                <ul>
                  <li><code>sin(x)/x</code> - Función sinc</li>
                  <li><code>exp(-x**2/2)</code> - Campana de Gauss</li>
                  <li><code>1/(1+exp(-x))</code> - Función sigmoide</li>
                  <li><code>x*sin(1/x)</code> - Función oscilante</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="panel-grafico">
          <div className="card grafico-card">
            <div className="grafico-header">
              <h2>Gráfica en Tiempo Real</h2>
              <div className="estado-grafico">
                {error ? (
                  <span className="estado-error">❌ Error</span>
                ) : puntos.length > 0 ? (
                  <span className="estado-ok">✅ Gráfica lista</span>
                ) : (
                  <span className="estado-cargando">⏳ Calculando...</span>
                )}
              </div>
            </div>
            
            {error && (
              <div className="error-alert">
                <strong>Error:</strong> {error}
                <div className="sugerencias-error">
                  <p>Posibles soluciones:</p>
                  <ul>
                    <li>Verifica la sintaxis de la función</li>
                    <li>Asegúrate de usar 'x' como variable</li>
                    <li>Prueba con un rango de X más pequeño</li>
                    <li>Evita divisiones por cero</li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="canvas-container">
              <canvas 
                ref={canvasRef} 
                width={900} 
                height={550}
                className="grafico-canvas"
              />
            </div>
            
            <div className="grafico-footer">
              <div className="estadisticas">
                <div className="estadistica">
                  <span className="label">Puntos:</span>
                  <span className="valor">{puntos.length}</span>
                </div>
                <div className="estadistica">
                  <span className="label">Rango X:</span>
                  <span className="valor">[{xMin.toFixed(2)}, {xMax.toFixed(2)}]</span>
                </div>
                <div className="estadistica">
                  <span className="label">Rango Y:</span>
                  <span className="valor">[{rangoY.min.toFixed(2)}, {rangoY.max.toFixed(2)}]</span>
                </div>
                <div className="estadistica">
                  <span className="label">Resolución:</span>
                  <span className="valor">{(xMax - xMin) / 800} unidades/pixel</span>
                </div>
              </div>
              
              <div className="funcion-actual">
                <strong>Función actual:</strong> <code>{funcion}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="footer">
        <div className="footer-content">
          <p>
            <strong>Graficador de Funciones v1.0</strong> • 
            Desarrollado con React • 
            Las funciones se evalúan en tu navegador
          </p>
          <p className="disclaimer">
            ⚠️ Para uso educativo. Ten precaución al evaluar funciones complejas.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default GraficadorFunciones;