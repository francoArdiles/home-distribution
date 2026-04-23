import React from 'react';

/**
 * Cuadricula SVG reutilizable. Renderiza como <g> dentro de cualquier <svg>.
 *
 * Props:
 *   bx, by       — origen del area de construccion en px de viewBox
 *   bw, bh       — ancho/alto del area en px
 *   scaleM       — px por metro
 *   stepM        — intervalo de lineas en metros (default 1)
 *   majorStepM   — si se indica, lineas en multiplos de este valor se marcan como major
 */
export default function SvgGrid({ bx, by, bw, bh, scaleM, stepM = 1, majorStepM }) {
  const lines = [];
  const widthM  = bw / scaleM;
  const heightM = bh / scaleM;

  // Lineas verticales (x = stepM, 2*stepM, ...)
  let vi = 0;
  for (let m = stepM; m < widthM - 1e-9; m = Math.round((m + stepM) * 1000) / 1000) {
    const x = bx + m * scaleM;
    const isMajor = majorStepM != null && Math.abs(m % majorStepM) < 1e-9;
    lines.push(
      <line
        key={`v${m}`}
        data-testid={`svg-grid-v-${vi++}`}
        {...(majorStepM != null ? { 'data-major': String(isMajor) } : {})}
        x1={x} y1={by} x2={x} y2={by + bh}
        stroke={isMajor ? '#CBAA7A' : '#E2C99A'}
        strokeWidth={isMajor ? 0.4 : 0.2}
      />
    );
  }

  // Lineas horizontales (y = stepM, 2*stepM, ...)
  let hi = 0;
  for (let m = stepM; m < heightM - 1e-9; m = Math.round((m + stepM) * 1000) / 1000) {
    const y = by + m * scaleM;
    const isMajor = majorStepM != null && Math.abs(m % majorStepM) < 1e-9;
    lines.push(
      <line
        key={`h${m}`}
        data-testid={`svg-grid-h-${hi++}`}
        {...(majorStepM != null ? { 'data-major': String(isMajor) } : {})}
        x1={bx} y1={y} x2={bx + bw} y2={y}
        stroke={isMajor ? '#CBAA7A' : '#E2C99A'}
        strokeWidth={isMajor ? 0.4 : 0.2}
      />
    );
  }

  return <g data-testid="svg-grid">{lines}</g>;
}
