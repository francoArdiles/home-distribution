import React from 'react';

/**
 * PoolSectionView — renders a top-view and side-view SVG diagram of a pool.
 *
 * Props:
 *   element  — placed element { width, height } in meters
 *   detail   — pool detail { depth, slope, steps, ... }
 */
export default function PoolSectionView({ element, detail }) {
  const width = element?.width ?? 8;
  const poolLength = element?.height ?? 4; // height is the pool's length dimension
  const depth = detail?.depth ?? 1.5;
  const slope = detail?.slope ?? 0;
  const steps = detail?.steps ?? [];

  const TOP_W = 200;
  const SIDE_W = 200;
  const SIDE_H = 100;
  const PAD = 28;

  // --- Top view — escala uniforme para preservar proporciones reales ---
  const topScale  = (TOP_W - PAD * 2) / width;
  const poolTopX  = PAD;
  const poolTopY  = PAD;
  const poolTopW  = width * topScale;
  const poolTopH  = poolLength * topScale;
  const TOP_H     = Math.round(poolTopH + PAD * 2);

  // Step width in the top view (steps run along the short side)
  const stepElements = steps.map((s, i) => {
    const stepW = s.width * topScale;
    return (
      <rect
        key={i}
        data-testid={`pool-step-top-${i}`}
        x={poolTopX}
        y={poolTopY + i * (s.depth ?? 0.3) * topScale}
        width={stepW}
        height={2}
        fill="#a0d8ef"
        stroke="#1E90FF"
        strokeWidth={0.5}
      />
    );
  });

  // --- Side view geometry ---
  const sideScaleX = (SIDE_W - PAD * 2) / width;
  const maxDepthDisplay = Math.max(depth * 1.1, 0.5);
  const sideScaleY = (SIDE_H - PAD * 2) / maxDepthDisplay;

  const sideX = PAD;
  const sideY = PAD;
  const sideW = width * sideScaleX;
  const sideH = depth * sideScaleY;

  // Slope: tilt the bottom line if slope > 0 (slope in %)
  const slopeOffset = slope > 0 ? (sideW * slope) / 100 : 0;

  // Pool outline in side view (trapezoidal if slope)
  // Points: top-left, top-right, bottom-right (deeper), bottom-left
  const sidePoints = [
    [sideX, sideY],
    [sideX + sideW, sideY],
    [sideX + sideW, sideY + sideH + slopeOffset],
    [sideX, sideY + sideH],
  ].map(p => p.join(',')).join(' ');

  // Water fill
  const waterPoints = sidePoints;

  // Steps in side view
  const stepSideElements = steps.map((s, i) => {
    const sw = s.width * sideScaleX;
    const sh = (s.depth ?? 0.3) * sideScaleY;
    const sy = sideY + sideH - (steps.length - i) * sh;
    return (
      <rect
        key={i}
        data-testid={`pool-step-side-${i}`}
        x={sideX}
        y={sy}
        width={sw}
        height={sh}
        fill="#a0d8ef"
        stroke="#1E90FF"
        strokeWidth={0.5}
      />
    );
  });

  return (
    <div className="space-y-3 mt-2">
      {/* Top View */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Vista Superior</p>
        <svg
          data-testid="pool-top-view"
          width="100%"
          viewBox={`0 0 ${TOP_W} ${TOP_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="border border-gray-200 rounded bg-sky-50"
        >
          {/* Pool body */}
          <rect
            x={poolTopX}
            y={poolTopY}
            width={poolTopW}
            height={poolTopH}
            fill="#87CEEB"
            stroke="#1E90FF"
            strokeWidth={1.5}
          />
          {/* Step indicators */}
          {stepElements}
          {/* Width label */}
          <text x={poolTopX + poolTopW / 2} y={poolTopY - 6} textAnchor="middle" fontSize="9" fill="#555">
            {width} m
          </text>
          {/* Height label */}
          <text
            x={poolTopX + poolTopW + 6}
            y={poolTopY + poolTopH / 2}
            textAnchor="start"
            fontSize="9"
            fill="#555"
            dominantBaseline="middle"
          >
            {poolLength} m
          </text>
        </svg>
      </div>

      {/* Side View */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Vista Lateral</p>
        <svg
          data-testid="pool-side-view"
          width={SIDE_W}
          height={SIDE_H}
          className="border border-gray-200 rounded bg-sky-50"
        >
          {/* Ground line */}
          <line x1={sideX - 4} y1={sideY} x2={sideX + sideW + 4} y2={sideY} stroke="#888" strokeWidth={1} />

          {/* Water body */}
          <polygon points={waterPoints} fill="#87CEEB" stroke="#1E90FF" strokeWidth={1.5} />

          {/* Step profile */}
          {stepSideElements}

          {/* Slope indicator */}
          {slope > 0 && (
            <text
              data-testid="pool-slope-indicator"
              x={sideX + sideW / 2}
              y={sideY + sideH / 2 + slopeOffset / 2 + 4}
              textAnchor="middle"
              fontSize="9"
              fill="#1E90FF"
            >
              {slope}%
            </text>
          )}

          {/* Depth label */}
          <line
            x1={sideX + sideW + 6}
            y1={sideY}
            x2={sideX + sideW + 6}
            y2={sideY + sideH}
            stroke="#555"
            strokeWidth={0.8}
            markerEnd="url(#arrow)"
          />
          <text
            x={sideX + sideW + 10}
            y={sideY + sideH / 2}
            textAnchor="start"
            fontSize="9"
            fill="#555"
            dominantBaseline="middle"
          >
            {depth} m
          </text>

          {/* Width label */}
          <text x={sideX + sideW / 2} y={sideY - 6} textAnchor="middle" fontSize="9" fill="#555">
            {width} m
          </text>
        </svg>
      </div>
    </div>
  );
}
