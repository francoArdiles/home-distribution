import React from 'react';

/**
 * Barra de escala SVG reutilizable. Renderiza como <g> dentro de cualquier <svg>.
 *
 * Props:
 *   x, y       — posicion del extremo izquierdo de la barra
 *   scaleM     — px por metro
 *   lengthM    — longitud de la barra en metros (default 5)
 */
export default function SvgScaleBar({ x, y, scaleM, lengthM = 5 }) {
  const barPx = lengthM * scaleM;
  const tickH = 4;

  return (
    <g data-testid="svg-scale-bar">
      {/* Barra principal */}
      <line data-testid="svg-scale-bar-line"
        x1={x} y1={y} x2={x + barPx} y2={y}
        stroke="#666" strokeWidth={1} />
      {/* Tick izquierdo */}
      <line x1={x} y1={y - tickH} x2={x} y2={y + tickH} stroke="#666" strokeWidth={1} />
      {/* Tick derecho */}
      <line x1={x + barPx} y1={y - tickH} x2={x + barPx} y2={y + tickH} stroke="#666" strokeWidth={1} />
      {/* Etiqueta 0 */}
      <text data-testid="svg-scale-bar-zero"
        x={x} y={y - 6} textAnchor="middle" fontSize={7} fill="#555">0</text>
      {/* Etiqueta longitud */}
      <text data-testid="svg-scale-bar-label"
        x={x + barPx} y={y - 6} textAnchor="middle" fontSize={7} fill="#555">
        {lengthM} m
      </text>
    </g>
  );
}
