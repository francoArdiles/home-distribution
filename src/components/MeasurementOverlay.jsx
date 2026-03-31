import React, { useState, useEffect } from 'react';
import { Layer, Line, Circle, Text, Group } from 'react-konva';
import { distancePointToPoint, distanceElementToTerrain, distanceElementToElement } from '../utils/distanceUtils.js';

const MANUAL_COLOR = '#2196F3';
const AUTO_COLOR = '#00BCD4';
const VIOLATION_COLOR = '#F44336';
const PREVIEW_COLOR = '#9E9E9E';

// Shoelace formula for polygon area (points in any unit)
const calculatePolygonArea = (pts) => {
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  return Math.abs(area / 2);
};

const MeasurementOverlay = ({
  activeTool,
  activeMeasurements = [],
  scale = 1,
  position = { x: 0, y: 0 },
  baseScale = 10,
  width = 800,
  height = 600,
  onAddMeasurement,
  onCancel,
  showMeasurements = true,
  showConstraints = true,
  elements = [],
  terrainPoints = [],
  constraints = [],
  validationResults = [],
  selectedElementId = null,
}) => {
  const [firstPoint, setFirstPoint] = useState(null);
  const [mousePoint, setMousePoint] = useState(null);
  const [areaVertices, setAreaVertices] = useState([]);

  // Reset state when activeTool changes
  useEffect(() => {
    setFirstPoint(null);
    setMousePoint(null);
    setAreaVertices([]);
  }, [activeTool]);

  // Escape key cancels measurement in progress
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setFirstPoint(null);
        setMousePoint(null);
        setAreaVertices([]);
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Convert stage pointer position to layer pixels
  const getLayerPoint = (e) => {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - position.x) / scale,
      y: (pos.y - position.y) / scale,
    };
  };

  // Layer pixel → stage pixel
  const toStageX = (lx) => lx * scale + position.x;
  const toStageY = (ly) => ly * scale + position.y;

  // Layer pixel → meters
  const toMeters = (lx, ly) => ({ x: lx / baseScale, y: ly / baseScale });

  const handleLayerClick = (e) => {
    const lp = getLayerPoint(e);
    if (!lp) return;

    if (activeTool === 'distance') {
      if (!firstPoint) {
        setFirstPoint(lp);
      } else {
        // Calculate distance in meters
        const p1m = toMeters(firstPoint.x, firstPoint.y);
        const p2m = toMeters(lp.x, lp.y);
        const value = distancePointToPoint(p1m, p2m);
        onAddMeasurement?.({ type: 'distance', value, p1: firstPoint, p2: lp, id: Date.now().toString() });
        setFirstPoint(null);
        setMousePoint(null);
      }
    } else if (activeTool === 'area') {
      setAreaVertices(prev => [...prev, lp]);
    }
  };

  const handleLayerMouseMove = (e) => {
    const lp = getLayerPoint(e);
    if (!lp) return;
    setMousePoint(lp);
  };

  const handleLayerDblClick = (e) => {
    if (activeTool === 'area' && areaVertices.length >= 3) {
      // Calculate area in meters² using shoelace (vertices in layer pixels → convert)
      const verticesMeters = areaVertices.map(v => toMeters(v.x, v.y));
      const value = calculatePolygonArea(verticesMeters);
      onAddMeasurement?.({ type: 'area', value, vertices: areaVertices, id: Date.now().toString() });
      setAreaVertices([]);
      setMousePoint(null);
    }
  };

  // Returns the stage-pixel point on an element's border in the direction of (towardX, towardY)
  const borderPoint = (el, towardX, towardY) => {
    const cx = el.x * baseScale * scale + position.x;
    const cy = el.y * baseScale * scale + position.y;
    const dx = towardX - cx;
    const dy = towardY - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: cx, y: cy };
    const nx = dx / len;
    const ny = dy / len;
    if (el.shape === 'circle' || el.radius) {
      const r = (el.radius || el.width / 2) * baseScale * scale;
      return { x: cx + nx * r, y: cy + ny * r };
    }
    // Rectangle (axis-aligned approximation for display)
    const hw = (el.width / 2) * baseScale * scale;
    const hh = (el.height / 2) * baseScale * scale;
    const tx = nx !== 0 ? Math.abs(hw / nx) : Infinity;
    const ty = ny !== 0 ? Math.abs(hh / ny) : Infinity;
    const t = Math.min(tx, ty);
    return { x: cx + nx * t, y: cy + ny * t };
  };

  // Auto-distance calculations for selected element
  const selectedElement = selectedElementId ? elements.find(e => e.id === selectedElementId) : null;

  const renderAutoDistances = () => {
    if (!showMeasurements || !selectedElement) return null;

    const lines = [];

    // Distance to terrain
    if (terrainPoints.length >= 3) {
      // Find closest point on terrain boundary
      const elMX = selectedElement.x * baseScale * scale + position.x;
      const elMY = selectedElement.y * baseScale * scale + position.y;
      const dist = distanceElementToTerrain(selectedElement, terrainPoints, baseScale);

      lines.push(
        <Line
          key="terrain-dist-line"
          data-testid="auto-distance-line"
          points={[elMX, elMY, elMX, elMY - dist * baseScale * scale]}
          stroke={AUTO_COLOR}
          strokeWidth={1}
          dash={[4, 4]}
        />
      );

      // Label
      lines.push(
        <Text
          key="terrain-dist-label"
          data-testid="auto-distance-label"
          x={elMX + 4}
          y={elMY - dist * baseScale * scale * 0.5}
          text={`${dist.toFixed(2)}m`}
          fontSize={11}
          fill={AUTO_COLOR}
        />
      );
    }

    // Distances to nearby elements
    elements.forEach(other => {
      if (other.id === selectedElementId) return;
      const dist = distanceElementToElement(selectedElement, other);
      if (dist < 10) {
        const c1 = { x: selectedElement.x * baseScale * scale + position.x, y: selectedElement.y * baseScale * scale + position.y };
        const c2 = { x: other.x * baseScale * scale + position.x, y: other.y * baseScale * scale + position.y };
        const p1 = borderPoint(selectedElement, c2.x, c2.y);
        const p2 = borderPoint(other, c1.x, c1.y);
        lines.push(
          <Line
            key={`elem-dist-${other.id}`}
            data-testid="auto-distance-line"
            points={[p1.x, p1.y, p2.x, p2.y]}
            stroke={AUTO_COLOR}
            strokeWidth={1}
            dash={[4, 4]}
          />
        );
        lines.push(
          <Text
            key={`elem-dist-label-${other.id}`}
            data-testid="auto-distance-label"
            x={(p1.x + p2.x) / 2 + 4}
            y={(p1.y + p2.y) / 2}
            text={`${dist.toFixed(2)}m`}
            fontSize={11}
            fill={AUTO_COLOR}
          />
        );
      }
    });

    return lines;
  };

  const renderViolations = () => {
    if (!showConstraints) return null;
    const violations = validationResults.filter(r => !r.valid);
    return violations.map((vr, idx) => {
      const { constraint, actualDistance, requiredDistance } = vr;
      const src = elements.find(e => e.id === constraint.sourceId);
      const tgt = elements.find(e => e.id === constraint.targetId);
      if (!src || !tgt) return null;
      const c1 = { x: src.x * baseScale * scale + position.x, y: src.y * baseScale * scale + position.y };
      const c2 = { x: tgt.x * baseScale * scale + position.x, y: tgt.y * baseScale * scale + position.y };
      const p1 = borderPoint(src, c2.x, c2.y);
      const p2 = borderPoint(tgt, c1.x, c1.y);
      return (
        <Group key={`violation-${idx}`}>
          <Line
            data-testid="violation-line"
            points={[p1.x, p1.y, p2.x, p2.y]}
            stroke={VIOLATION_COLOR}
            strokeWidth={2}
          />
          <Text
            data-testid="violation-label"
            x={(p1.x + p2.x) / 2 + 4}
            y={(p1.y + p2.y) / 2}
            text={`actual: ${actualDistance.toFixed(2)}m / mínimo: ${requiredDistance}m`}
            fontSize={11}
            fill={VIOLATION_COLOR}
          />
        </Group>
      );
    });
  };

  // Check if any interactive layer needed
  const isActive = activeTool === 'distance' || activeTool === 'area';

  // Render saved measurements
  const renderMeasurements = () => {
    if (!showMeasurements) return null;
    return activeMeasurements.map((m) => {
      if (m.type === 'distance') {
        const sx1 = toStageX(m.p1.x);
        const sy1 = toStageY(m.p1.y);
        const sx2 = toStageX(m.p2.x);
        const sy2 = toStageY(m.p2.y);
        return (
          <Group key={m.id}>
            <Line
              data-testid="measurement-line"
              points={[sx1, sy1, sx2, sy2]}
              stroke={MANUAL_COLOR}
              strokeWidth={2}
            />
            <Text
              data-testid="measurement-label"
              x={(sx1 + sx2) / 2 + 4}
              y={(sy1 + sy2) / 2}
              text={`${m.value.toFixed(2)}m`}
              fontSize={12}
              fill={MANUAL_COLOR}
            />
          </Group>
        );
      }
      if (m.type === 'area') {
        const flatPts = m.vertices.flatMap(v => [toStageX(v.x), toStageY(v.y)]);
        const cx = m.vertices.reduce((s, v) => s + toStageX(v.x), 0) / m.vertices.length;
        const cy = m.vertices.reduce((s, v) => s + toStageY(v.y), 0) / m.vertices.length;
        return (
          <Group key={m.id}>
            <Line
              data-testid="area-polygon"
              points={flatPts}
              closed
              stroke={MANUAL_COLOR}
              strokeWidth={2}
              fill="rgba(33,150,243,0.1)"
            />
            <Text
              data-testid="measurement-label"
              x={cx}
              y={cy}
              text={`${m.value.toFixed(2)}m²`}
              fontSize={12}
              fill={MANUAL_COLOR}
            />
          </Group>
        );
      }
      return null;
    });
  };

  return (
    <>
      {/* Passive layer: saved measurements, auto-distances, violations */}
      <Layer>
        {renderMeasurements()}
        {renderAutoDistances()}
        {renderViolations()}
      </Layer>
      {/* Interactive layer for active tool — has data-testid="measurement-layer" */}
      {isActive && (
        <Layer
          data-testid="measurement-layer"
          onClick={handleLayerClick}
          onMouseMove={handleLayerMouseMove}
          onDblClick={handleLayerDblClick}
        >
          {/* Preview line for distance tool */}
          {activeTool === 'distance' && firstPoint && mousePoint && (
            <Line
              data-testid="measurement-preview"
              points={[toStageX(firstPoint.x), toStageY(firstPoint.y), toStageX(mousePoint.x), toStageY(mousePoint.y)]}
              stroke={PREVIEW_COLOR}
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}
          {/* Area preview polygon */}
          {activeTool === 'area' && areaVertices.length >= 2 && (
            <Line
              data-testid="area-preview"
              points={areaVertices.flatMap(v => [toStageX(v.x), toStageY(v.y)])}
              stroke={PREVIEW_COLOR}
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}
        </Layer>
      )}
    </>
  );
};

export default MeasurementOverlay;
