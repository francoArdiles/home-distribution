import React from 'react';

const FLOOR_HEIGHT_M = 3; // metros por piso

// Coordenadas internas fijas del viewBox — el SVG escala al 100% del contenedor
const VB_W = 200;
const PAD  = 28;

/**
 * CasaSectionView — vista superior y fachada de una casa.
 * Los SVGs usan viewBox + width="100%" para adaptarse al contenedor.
 *
 * Props:
 *   element  — { width, height } en metros
 *   detail   — { floors, roofType, bedrooms, bathrooms, construction }
 */
export default function CasaSectionView({ element, detail }) {
  const width    = element?.width  ?? 10;
  const depth    = element?.height ?? 8;
  const floors   = detail?.floors   ?? 1;
  const roofType = detail?.roofType ?? 'a dos aguas';

  // ── Vista superior — escala uniforme para preservar proporciones reales ───
  const scale  = (VB_W - PAD * 2) / width;  // px por metro (misma escala en X e Y)
  const bx = PAD, by = PAD;
  const bw = width * scale;
  const bh = depth * scale;
  const TOP_H  = Math.round(bh + PAD * 2);

  // Cuadrícula de habitaciones (aprox 1 línea cada 3 m)
  const cols = Math.min(3, Math.ceil(width / 3));
  const rows = Math.min(2, Math.ceil(depth / 3));
  const roomW = bw / cols;
  const roomH = bh / rows;
  const roomLines = [];
  for (let c = 1; c < cols; c++) {
    roomLines.push(<line key={`vc${c}`} x1={bx + c * roomW} y1={by} x2={bx + c * roomW} y2={by + bh} stroke="#C8A96E" strokeWidth={0.7} strokeDasharray="3,2" />);
  }
  for (let r = 1; r < rows; r++) {
    roomLines.push(<line key={`hr${r}`} x1={bx} y1={by + r * roomH} x2={bx + bw} y2={by + r * roomH} stroke="#C8A96E" strokeWidth={0.7} strokeDasharray="3,2" />);
  }

  // ── Fachada ────────────────────────────────────────────────────────────────
  const totalBuildingH = floors * FLOOR_HEIGHT_M;
  const roofH          = roofType === 'plano' ? 0.3 : width * 0.25;
  const totalH         = totalBuildingH + roofH;

  const fScaleX  = (VB_W - PAD * 2) / width;
  const FRONT_H  = Math.max(120, PAD * 2 + totalH * 8);
  const fScaleY  = (FRONT_H - PAD * 2) / (totalH || 1);

  const fx      = PAD;
  const fw      = width * fScaleX;
  const fFloorH = FLOOR_HEIGHT_M * fScaleY;
  const totalFH = floors * fFloorH;
  const fby     = PAD + roofH * fScaleY; // Y donde empiezan los pisos

  // Bloques de pisos (de abajo hacia arriba)
  const floorBlocks = Array.from({ length: floors }, (_, i) => {
    const fy = fby + totalFH - (i + 1) * fFloorH;
    return (
      <g key={i}>
        <rect
          data-testid={`casa-floor-${i}`}
          x={fx} y={fy}
          width={fw} height={fFloorH}
          fill="#E8D5B7" stroke="#8B6914" strokeWidth={1}
        />
        {[0.25, 0.6].map((pos) => (
          <rect
            key={pos}
            x={fx + fw * pos - 4}
            y={fy + fFloorH * 0.25}
            width={8} height={fFloorH * 0.4}
            fill="#AEE0F5" stroke="#8B6914" strokeWidth={0.5}
          />
        ))}
      </g>
    );
  });

  // Tejado
  const roofTopY = PAD;
  let roofEl;
  if (roofType === 'plano') {
    roofEl = (
      <rect
        data-testid="casa-roof"
        x={fx - 3} y={fby - roofH * fScaleY}
        width={fw + 6} height={roofH * fScaleY}
        fill="#8B6914" stroke="#5C3317" strokeWidth={1}
      />
    );
  } else if (roofType === 'shed') {
    const pts = `${fx - 3},${fby} ${fx + fw + 3},${fby} ${fx + fw + 3},${roofTopY}`;
    roofEl = <polygon data-testid="casa-roof" points={pts} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  } else {
    const pts = `${fx - 3},${fby} ${fx + fw / 2},${roofTopY} ${fx + fw + 3},${fby}`;
    roofEl = <polygon data-testid="casa-roof" points={pts} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  }

  const groundY = fby + totalFH;

  return (
    <div className="space-y-3">
      {/* Vista Superior */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Vista Superior</p>
        <svg
          data-testid="casa-top-view"
          width="100%"
          viewBox={`0 0 ${VB_W} ${TOP_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="border border-gray-200 rounded bg-amber-50"
        >
          <rect x={bx} y={by} width={bw} height={bh} fill="#E8D5B7" stroke="#8B6914" strokeWidth={1.5} />
          {roomLines}
          <text x={bx + bw / 2} y={by - 6} textAnchor="middle" fontSize="9" fill="#555">{width} m</text>
          <text x={bx + bw + 6} y={by + bh / 2} textAnchor="start" fontSize="9" fill="#555" dominantBaseline="middle">{depth} m</text>
        </svg>
      </div>

      {/* Fachada */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Fachada</p>
        <svg
          data-testid="casa-front-view"
          width="100%"
          viewBox={`0 0 ${VB_W} ${FRONT_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="border border-gray-200 rounded bg-sky-50"
        >
          <line x1={fx - 6} y1={groundY} x2={fx + fw + 6} y2={groundY} stroke="#666" strokeWidth={1.5} />
          {floorBlocks}
          {roofEl}
          <text x={fx + fw + 10} y={fby + totalFH / 2} textAnchor="start" fontSize="9" fill="#555" dominantBaseline="middle">
            {floors} {floors === 1 ? 'piso' : 'pisos'}
          </text>
          <text x={fx + fw / 2} y={groundY + 14} textAnchor="middle" fontSize="9" fill="#555">{width} m</text>
        </svg>
      </div>
    </div>
  );
}
