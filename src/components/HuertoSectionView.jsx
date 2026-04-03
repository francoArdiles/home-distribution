import React from 'react';

// Color por tipo de sustrato
const SUBSTRATE_COLORS = {
  'tierra natural':      '#8B5E3C',
  'compost':             '#5A3E28',
  'tierra + compost':    '#7A5230',
  'sustrato hidropónico':'#3A7CA5',
};

// Color por tipo de riego
const IRRIGATION_COLORS = {
  'goteo':       '#1E90FF',
  'aspersión':   '#00BFFF',
  'manual':      '#87CEEB',
  'ninguno':     '#CCC',
};

const SUBSTRATE_DEPTH = 0.4; // metros de capa activa
const NATIVE_DEPTH    = 0.25;

/**
 * HuertoSectionView — vista superior y perfil de suelo de un huerto.
 *
 * Props:
 *   element — { width, height } en metros
 *   detail  — { cropType, irrigation, substrate, seasons }
 */
export default function HuertoSectionView({ element, detail }) {
  const width     = element?.width  ?? 4;
  const length    = element?.height ?? 2;
  const substrate = detail?.substrate  ?? 'tierra + compost';
  const irrigation = detail?.irrigation ?? 'goteo';

  const PAD   = 28;
  const TOP_W = 200;
  const SOIL_W = 200;
  const SOIL_H = 90;

  // ── Vista superior — escala uniforme para preservar proporciones reales ─
  const scale = (TOP_W - PAD * 2) / width;
  const bx = PAD, by = PAD;
  const bw = width * scale, bh = length * scale;
  const TOP_H = Math.round(bh + PAD * 2);

  // Número de surcos/hileras (aprox 1 cada 40 cm)
  const rowCount = Math.max(1, Math.round(length / 0.4));
  const rowGap = bh / rowCount;
  const rowEls = Array.from({ length: rowCount }, (_, i) => (
    <rect
      key={i}
      data-testid={`huerto-row-${i}`}
      x={bx + 2}
      y={by + i * rowGap + 2}
      width={bw - 4}
      height={rowGap - 4}
      fill="#90EE90"
      stroke="#228B22"
      strokeWidth={0.5}
      rx={2}
    />
  ));

  // Indicador de riego
  const irrColor = IRRIGATION_COLORS[irrigation] ?? '#87CEEB';
  const irrEls = irrigation !== 'ninguno'
    ? Array.from({ length: Math.max(1, Math.round(width / 1.5)) }, (_, i) => (
        <circle
          key={i}
          cx={bx + (i + 0.5) * (bw / Math.max(1, Math.round(width / 1.5)))}
          cy={by + 4}
          r={2}
          fill={irrColor}
          opacity={0.8}
        />
      ))
    : [];

  // ── Perfil de suelo ────────────────────────────────────────────────────
  const totalDepth = SUBSTRATE_DEPTH + NATIVE_DEPTH;
  const sSX = (SOIL_W - PAD * 2) / width;
  const sSY = (SOIL_H - PAD * 2 - 10) / totalDepth;
  const sx = PAD, sy = PAD + 10;
  const sw = width * sSX;
  const subH = SUBSTRATE_DEPTH * sSY;
  const natH = NATIVE_DEPTH    * sSY;
  const subColor = SUBSTRATE_COLORS[substrate] ?? '#7A5230';

  return (
    <div className="space-y-3 mt-2">
      {/* Vista Superior */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Vista Superior</p>
        <svg
          data-testid="huerto-top-view"
          width="100%"
          viewBox={`0 0 ${TOP_W} ${TOP_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="border border-gray-200 rounded bg-green-50"
        >
          <rect x={bx} y={by} width={bw} height={bh} fill="#C8E6C9" stroke="#228B22" strokeWidth={1.5} />
          {rowEls}
          {/* Riego */}
          <g data-testid="huerto-irrigation">{irrEls}</g>
          <text x={bx + bw / 2} y={by - 6} textAnchor="middle" fontSize="9" fill="#555">{width} m</text>
          <text x={bx + bw + 6} y={by + bh / 2} textAnchor="start" fontSize="9" fill="#555" dominantBaseline="middle">{length} m</text>
        </svg>
      </div>

      {/* Perfil de suelo */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Perfil de Suelo</p>
        <svg
          data-testid="huerto-soil-view"
          width={SOIL_W}
          height={SOIL_H}
          className="border border-gray-200 rounded bg-amber-50"
        >
          {/* Superficie / plantas */}
          <text x={sx + sw / 2} y={sy - 4} textAnchor="middle" fontSize="8" fill="#228B22">superficie</text>

          {/* Capa activa (sustrato) */}
          <rect
            data-testid="huerto-substrate-layer"
            x={sx} y={sy}
            width={sw} height={subH}
            fill={subColor}
            stroke="#5C3317"
            strokeWidth={0.8}
            opacity={0.85}
          />
          <text x={sx + sw / 2} y={sy + subH / 2} textAnchor="middle" fontSize="8" fill="#FFF" dominantBaseline="middle">
            {substrate}
          </text>

          {/* Capa nativa */}
          <rect
            data-testid="huerto-native-layer"
            x={sx} y={sy + subH}
            width={sw} height={natH}
            fill="#6B4226"
            stroke="#5C3317"
            strokeWidth={0.8}
            opacity={0.7}
          />
          <text x={sx + sw / 2} y={sy + subH + natH / 2} textAnchor="middle" fontSize="8" fill="#FFF" dominantBaseline="middle">
            tierra nativa
          </text>

          {/* Cotas */}
          <text x={sx + sw + 6} y={sy + subH / 2} textAnchor="start" fontSize="8" fill="#555" dominantBaseline="middle">
            {SUBSTRATE_DEPTH * 100} cm
          </text>
        </svg>
      </div>
    </div>
  );
}
