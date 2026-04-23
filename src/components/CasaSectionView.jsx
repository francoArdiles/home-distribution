import React, { useState, useCallback, useRef } from 'react';
import SvgGrid from './SvgGrid.jsx';
import SvgScaleBar from './SvgScaleBar.jsx';

const FLOOR_HEIGHT_M = 3;
const VB_W = 200;
const PAD  = 28;
const DEFAULT_WALL_THICKNESS = 0.15;
const SNAP_THRESHOLD = 0.4; // metros

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function wallLength(wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function mToPx(m, scale) { return m * scale; }
function pxToM(px, scale) { return px / scale; }

function isInsideBuilding(x, y, bx, by, bw, bh) {
  return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

/** Returns snap candidates: building corners + wall endpoints on floor. */
function buildSnapPoints(walls, width, depth) {
  return [
    { x: 0,     y: 0     },
    { x: width, y: 0     },
    { x: 0,     y: depth },
    { x: width, y: depth },
    ...walls.flatMap(w => [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]),
  ];
}

/**
 * Returns the nearest snap point within threshold, or the raw point.
 * Priority: wall endpoints / building corners > grid.
 * Result has { x, y, snapped: boolean }.
 *
 * @param {number} gridStepM - grid snap step in meters; 0 or undefined = disabled
 */
export function getSnapPoint(raw, walls, width, depth, threshold = SNAP_THRESHOLD, gridStepM = 0) {
  // 1. Try hard points: corners + wall endpoints
  const candidates = buildSnapPoints(walls, width, depth);
  let best = null;
  let bestDist = threshold;
  for (const c of candidates) {
    const d = Math.sqrt((c.x - raw.x) ** 2 + (c.y - raw.y) ** 2);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (best) return { ...best, snapped: true };

  // 2. Grid snap (lower priority, only when no hard point found)
  if (gridStepM > 0) {
    const gx = Math.round(raw.x / gridStepM) * gridStepM;
    const gy = Math.round(raw.y / gridStepM) * gridStepM;
    const d = Math.sqrt((gx - raw.x) ** 2 + (gy - raw.y) ** 2);
    if (d < threshold) return { x: gx, y: gy, snapped: true };
  }

  return { ...raw, snapped: false };
}

/** Angle in degrees of the vector from (x1,y1) to (x2,y2), 0 = right. */
function vectorAngleDeg(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

/** Absolute angle 0-360. */
function normAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

export default function CasaSectionView({ element, detail, editMode, onChange }) {
  const width    = element?.width  ?? 10;
  const depth    = element?.height ?? 8;
  const floors   = detail?.floors   ?? 1;
  const roofType = detail?.roofType ?? 'a dos aguas';

  const [internalWalls,  setInternalWalls]  = useState(detail?.walls  ?? []);
  const [internalLabels, setInternalLabels] = useState(detail?.labels ?? []);
  const [selectedFloor,  setSelectedFloor]  = useState(0);
  const [wallThickness,  setWallThickness]  = useState(DEFAULT_WALL_THICKNESS);
  const [drawingWall,    setDrawingWall]    = useState(null);
  const [cursorMeter,    setCursorMeter]    = useState(null);
  const [hoveredWallId,  setHoveredWallId]  = useState(null);
  const [dragging,        setDragging]        = useState(null);
  const isDraggingRef = useRef(false);
  const [draggingLabel,   setDraggingLabel]   = useState(null);
  const [isEditing,       setIsEditing]       = useState(true);
  const [showGrid,        setShowGrid]        = useState(true);
  const [showMeasurements,setShowMeasurements]= useState(true);
  const svgRef = useRef(null);

  const editingEnabled = editMode !== undefined ? editMode : isEditing;
  const walls  = detail?.walls  ?? internalWalls;
  const labels = detail?.labels ?? internalLabels;

  const updateDetail = useCallback((updater) => {
    const updates = updater({ walls, labels });
    if (onChange) {
      onChange({ ...detail, walls: updates.walls ?? walls, labels: updates.labels ?? labels });
    } else {
      setInternalWalls(updates.walls   ?? walls);
      setInternalLabels(updates.labels ?? labels);
    }
  }, [onChange, detail, walls, labels]);

  // ── Geometria ─────────────────────────────────────────────────────────────
  const scale = (VB_W - PAD * 2) / width;
  const bx = PAD, by = PAD;
  const bw = width * scale;
  const bh = depth * scale;
  const TOP_H = Math.round(bh + PAD * 2);
  const epRadius = 0.075 * scale; // 0.15m diametro → 0.075m radio

  const wallsOnFloor  = walls.filter(w => w.floor === selectedFloor);
  const labelsOnFloor = labels.filter(l => l.floor === selectedFloor);

  const cols  = Math.min(3, Math.ceil(width / 3));
  const rows  = Math.min(2, Math.ceil(depth / 3));
  const roomW = bw / cols;
  const roomH = bh / rows;
  const roomLines = [];
  for (let c = 1; c < cols; c++) {
    roomLines.push(<line key={`vc${c}`} x1={bx + c * roomW} y1={by} x2={bx + c * roomW} y2={by + bh} stroke="#C8A96E" strokeWidth={0.7} strokeDasharray="3,2" />);
  }
  for (let r = 1; r < rows; r++) {
    roomLines.push(<line key={`hr${r}`} x1={bx} y1={by + r * roomH} x2={bx + bw} y2={by + r * roomH} stroke="#C8A96E" strokeWidth={0.7} strokeDasharray="3,2" />);
  }

  // ── Coords SVG ────────────────────────────────────────────────────────────
  const getSvgCoords = useCallback((e) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM?.();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    }
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: (e.clientX - rect.left) * (VB_W / rect.width),
      y: (e.clientY - rect.top)  * (TOP_H / rect.height),
    };
  }, [TOP_H]);

  const svgToMeters = useCallback((x, y) => ({
    x: pxToM(x - bx, scale),
    y: pxToM(y - by, scale),
  }), [bx, by, scale]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSvgClick = useCallback((e) => {
    if (!editingEnabled) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    if (!isInsideBuilding(coords.x, coords.y, bx, by, bw, bh)) return;

    const raw = svgToMeters(coords.x, coords.y);
    const snapped = getSnapPoint(raw, wallsOnFloor, width, depth, SNAP_THRESHOLD, showGrid ? 1 : 0);
    const isShiftOrCtrl = e.shiftKey || e.ctrlKey;

    if (isShiftOrCtrl) {
      updateDetail(({ walls: w, labels: l }) => ({
        walls: w,
        labels: [...l, { id: `label-${generateId()}`, x: snapped.x, y: snapped.y, text: 'Etiqueta', floor: selectedFloor }],
      }));
    } else if (drawingWall) {
      updateDetail(({ walls: w, labels: l }) => ({
        walls: [...w, {
          id: `wall-${generateId()}`,
          x1: drawingWall.x, y1: drawingWall.y,
          x2: snapped.x, y2: snapped.y,
          thickness: wallThickness,
          floor: selectedFloor,
        }],
        labels: l,
      }));
      setDrawingWall(null);
      setCursorMeter(null);
    } else {
      setDrawingWall({ x: snapped.x, y: snapped.y });
    }
  }, [editingEnabled, getSvgCoords, svgToMeters, bx, by, bw, bh, drawingWall, wallThickness, selectedFloor, wallsOnFloor, width, depth, updateDetail]);

  const handleWallBodyClick = useCallback((e, wall) => {
    e.stopPropagation();
    if (!editingEnabled || isDraggingRef.current) return;
    updateDetail(({ walls: w, labels: l }) => ({
      walls: w.filter(ww => ww.id !== wall.id), labels: l,
    }));
  }, [editingEnabled, updateDetail]);

  const handleWallBodyMouseDown = useCallback((e, wall) => {
    if (!editingEnabled) return;
    e.stopPropagation();
    const coords = getSvgCoords(e);
    if (!coords) return;
    isDraggingRef.current = false;
    setDragging({ type: 'wall', wallId: wall.id, startMeter: svgToMeters(coords.x, coords.y), startWall: { ...wall } });
  }, [editingEnabled, getSvgCoords, svgToMeters]);

  const handleEndpointMouseDown = useCallback((e, wall, endpoint) => {
    if (!editingEnabled) return;
    e.stopPropagation();
    const coords = getSvgCoords(e);
    if (!coords) return;
    isDraggingRef.current = false;
    setDragging({ type: 'endpoint', wallId: wall.id, endpoint, startMeter: svgToMeters(coords.x, coords.y), startWall: { ...wall } });
  }, [editingEnabled, getSvgCoords, svgToMeters]);

  const handleMouseMove = useCallback((e) => {
    const coords = getSvgCoords(e);
    if (!coords) return;
    const m = svgToMeters(coords.x, coords.y);

    // Actualizar cursor para preview de dibujado
    if (drawingWall) {
      const snapped = getSnapPoint(m, wallsOnFloor, width, depth, SNAP_THRESHOLD, showGrid ? 1 : 0);
      setCursorMeter(snapped);
    }

    if (draggingLabel) {
      updateDetail(({ walls: w, labels: l }) => ({
        walls: w,
        labels: l.map(ll => ll.id === draggingLabel.id
          ? { ...ll, x: Math.max(0, Math.min(width, m.x)), y: Math.max(0, Math.min(depth, m.y)) }
          : ll),
      }));
      return;
    }

    if (dragging) {
      isDraggingRef.current = true;
      const dx = m.x - dragging.startMeter.x;
      const dy = m.y - dragging.startMeter.y;
      const w0 = dragging.startWall;
      const updated = dragging.type === 'wall'
        ? { ...w0, x1: w0.x1 + dx, y1: w0.y1 + dy, x2: w0.x2 + dx, y2: w0.y2 + dy }
        : dragging.endpoint === 'start'
          ? { ...w0, x1: w0.x1 + dx, y1: w0.y1 + dy }
          : { ...w0, x2: w0.x2 + dx, y2: w0.y2 + dy };
      updateDetail(({ walls: w, labels: l }) => ({
        walls: w.map(ww => ww.id === dragging.wallId ? updated : ww), labels: l,
      }));
    }
  }, [dragging, draggingLabel, drawingWall, wallsOnFloor, getSvgCoords, svgToMeters, width, depth, updateDetail]);

  const handleMouseUp = useCallback(() => {
    setDraggingLabel(null);
    setDragging(null);
    requestAnimationFrame(() => { isDraggingRef.current = false; });
  }, []);

  const handleLabelClick = useCallback((e, label) => {
    e.stopPropagation();
    if (!editingEnabled) return;
    const newText = prompt('Editar etiqueta:', label.text);
    if (newText !== null) {
      updateDetail(({ walls: w, labels: l }) => ({
        walls: w, labels: l.map(ll => ll.id === label.id ? { ...ll, text: newText } : ll),
      }));
    }
  }, [editingEnabled, updateDetail]);

  const handleLabelDragStart = useCallback((e, label) => {
    if (!editingEnabled) return;
    e.stopPropagation();
    setDraggingLabel(label);
  }, [editingEnabled]);

  // ── Render pared ──────────────────────────────────────────────────────────
  const renderWall = (wall) => {
    const x1 = bx + mToPx(wall.x1, scale);
    const y1 = by + mToPx(wall.y1, scale);
    const x2 = bx + mToPx(wall.x2, scale);
    const y2 = by + mToPx(wall.y2, scale);
    const tp  = mToPx(wall.thickness, scale);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dx = (tp / 2) * Math.sin(angle);
    const dy = (tp / 2) * Math.cos(angle);
    const points = `${x1-dx},${y1+dy} ${x1+dx},${y1-dy} ${x2+dx},${y2-dy} ${x2-dx},${y2+dy}`;
    const isHovered = hoveredWallId === wall.id;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 8;

    return (
      <g
        key={wall.id}
        data-testid={`wall-${wall.id}`}
        onMouseEnter={() => setHoveredWallId(wall.id)}
        onMouseLeave={() => setHoveredWallId(null)}
      >
        <polygon
          data-testid={`wall-body-${wall.id}`}
          points={points}
          fill="#8B6914" stroke="#5C3317" strokeWidth={0.5} opacity={0.9}
          style={{ cursor: editingEnabled ? 'pointer' : 'default' }}
          onClick={(e) => handleWallBodyClick(e, wall)}
          onMouseDown={(e) => handleWallBodyMouseDown(e, wall)}
        />
        {isHovered && (
          <g data-testid={`wall-measure-${wall.id}`}>
            <rect x={mx - 18} y={my - 7} width={36} height={12} rx={2}
              fill="rgba(255,255,255,0.92)" stroke="#8B6914" strokeWidth={0.5} />
            <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#333">
              {wallLength(wall).toFixed(2)} m
            </text>
          </g>
        )}
        {editingEnabled && (
          <>
            <circle data-testid={`wall-ep-start-${wall.id}`}
              cx={x1} cy={y1} r={epRadius}
              fill="#fff" stroke="#8B6914" strokeWidth={0.8}
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => handleEndpointMouseDown(e, wall, 'start')}
            />
            <circle data-testid={`wall-ep-end-${wall.id}`}
              cx={x2} cy={y2} r={epRadius}
              fill="#fff" stroke="#8B6914" strokeWidth={0.8}
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => handleEndpointMouseDown(e, wall, 'end')}
            />
          </>
        )}
      </g>
    );
  };

  // ── Render etiqueta ───────────────────────────────────────────────────────
  const renderLabel = (label) => {
    const x = bx + mToPx(label.x, scale);
    const y = by + mToPx(label.y, scale);
    return (
      <g key={label.id} data-testid={`label-${label.id}`}
        onClick={(e) => handleLabelClick(e, label)}
        onMouseDown={(e) => handleLabelDragStart(e, label)}
        style={{ cursor: editingEnabled ? 'move' : 'default' }}
      >
        <rect x={x-20} y={y-8} width={40} height={16} fill="rgba(255,255,255,0.8)" stroke="#8B6914" strokeWidth={0.5} rx={3} />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#333">
          {label.text.length > 8 ? label.text.substring(0, 7) + '...' : label.text}
        </text>
      </g>
    );
  };

  // ── Preview mientras se dibuja ────────────────────────────────────────────
  const renderDrawingPreview = () => {
    if (!drawingWall) return null;
    const sx = bx + mToPx(drawingWall.x, scale);
    const sy = by + mToPx(drawingWall.y, scale);

    // Punto de inicio
    const startCircle = (
      <circle cx={sx} cy={sy} r={epRadius * 1.5}
        fill="#E8D5B7" stroke="#8B6914" strokeWidth={1.2} strokeDasharray="2,1" />
    );

    if (!cursorMeter) return startCircle;

    const cx = bx + mToPx(cursorMeter.x, scale);
    const cy = by + mToPx(cursorMeter.y, scale);

    // Angulo a mostrar
    let angleText;
    // Buscar si el punto de inicio coincide con un endpoint existente
    const connectedWall = wallsOnFloor.find(w =>
      (Math.abs(w.x1 - drawingWall.x) < 0.01 && Math.abs(w.y1 - drawingWall.y) < 0.01) ||
      (Math.abs(w.x2 - drawingWall.x) < 0.01 && Math.abs(w.y2 - drawingWall.y) < 0.01)
    );

    if (connectedWall) {
      // Angulo relativo a la pared conectada
      const isStart = Math.abs(connectedWall.x1 - drawingWall.x) < 0.01 && Math.abs(connectedWall.y1 - drawingWall.y) < 0.01;
      const refAngle = isStart
        ? vectorAngleDeg(connectedWall.x1, connectedWall.y1, connectedWall.x2, connectedWall.y2)
        : vectorAngleDeg(connectedWall.x2, connectedWall.y2, connectedWall.x1, connectedWall.y1);
      const newAngle = vectorAngleDeg(drawingWall.x, drawingWall.y, cursorMeter.x, cursorMeter.y);
      let rel = normAngle(newAngle - refAngle);
      if (rel > 180) rel = 360 - rel;
      angleText = `${rel.toFixed(0)}°`;
    } else {
      // Angulo absoluto desde horizontal
      const abs = normAngle(vectorAngleDeg(drawingWall.x, drawingWall.y, cursorMeter.x, cursorMeter.y));
      angleText = `${abs.toFixed(0)}°`;
    }

    // Indicador de snap en el cursor
    const snapIndicator = cursorMeter.snapped ? (
      <circle cx={cx} cy={cy} r={epRadius * 2} fill="none" stroke="#1E90FF" strokeWidth={1} />
    ) : null;

    return (
      <>
        {startCircle}
        <line data-testid="drawing-preview-line"
          x1={sx} y1={sy} x2={cx} y2={cy}
          stroke="#8B6914" strokeWidth={1} strokeDasharray="4,2" />
        {snapIndicator}
        <g data-testid="drawing-angle-label">
          <rect x={cx + 4} y={cy - 9} width={24} height={12} rx={2}
            fill="rgba(255,255,255,0.9)" stroke="#8B6914" strokeWidth={0.5} />
          <text x={cx + 16} y={cy - 3} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#333">
            {angleText}
          </text>
        </g>
      </>
    );
  };

  // ── Fachada ───────────────────────────────────────────────────────────────
  const totalBuildingH = floors * FLOOR_HEIGHT_M;
  const roofH   = roofType === 'plano' ? 0.3 : width * 0.25;
  const totalH  = totalBuildingH + roofH;
  const fScaleX = (VB_W - PAD * 2) / width;
  const FRONT_H = Math.max(120, PAD * 2 + totalH * 8);
  const fScaleY = (FRONT_H - PAD * 2) / (totalH || 1);
  const fx      = PAD;
  const fw      = width * fScaleX;
  const fFloorH = FLOOR_HEIGHT_M * fScaleY;
  const totalFH = floors * fFloorH;
  const fby     = PAD + roofH * fScaleY;
  const groundY = fby + totalFH;

  const floorBlocks = Array.from({ length: floors }, (_, i) => {
    const fy = fby + totalFH - (i + 1) * fFloorH;
    return (
      <g key={i}>
        <rect data-testid={`casa-floor-${i}`} x={fx} y={fy} width={fw} height={fFloorH} fill="#E8D5B7" stroke="#8B6914" strokeWidth={1} />
        {[0.25, 0.6].map(pos => (
          <rect key={pos} x={fx + fw * pos - 4} y={fy + fFloorH * 0.25} width={8} height={fFloorH * 0.4} fill="#AEE0F5" stroke="#8B6914" strokeWidth={0.5} />
        ))}
      </g>
    );
  });

  const roofTopY = PAD;
  let roofEl;
  if (roofType === 'plano') {
    roofEl = <rect data-testid="casa-roof" x={fx-3} y={fby - roofH * fScaleY} width={fw+6} height={roofH * fScaleY} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  } else if (roofType === 'shed') {
    roofEl = <polygon data-testid="casa-roof" points={`${fx-3},${fby} ${fx+fw+3},${fby} ${fx+fw+3},${roofTopY}`} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  } else {
    roofEl = <polygon data-testid="casa-roof" points={`${fx-3},${fby} ${fx+fw/2},${roofTopY} ${fx+fw+3},${fby}`} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {floors > 1 && (
        <div data-testid="floor-selector" className="flex gap-1">
          {Array.from({ length: floors }, (_, i) => (
            <button key={i} onClick={() => setSelectedFloor(i)}
              className={`px-3 py-1 text-xs rounded ${i === selectedFloor ? 'bg-amber-200' : 'bg-gray-100 hover:bg-gray-200'}`}>
              Piso {i + 1}
            </button>
          ))}
        </div>
      )}

      {editingEnabled && (
        <div data-testid="edit-toolbar" className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
          <div data-testid="wall-thickness-control" className="flex items-center gap-1">
            <label className="text-xs text-gray-600">Grosor:</label>
            <input type="number" value={wallThickness}
              onChange={(e) => setWallThickness(parseFloat(e.target.value) || DEFAULT_WALL_THICKNESS)}
              step="0.05" min="0.05" max="0.5"
              className="w-14 px-1 py-0.5 text-xs border border-gray-300 rounded" />
            <span className="text-xs text-gray-400">m</span>
          </div>
          <button
            data-testid="grid-toggle"
            onClick={() => setShowGrid(v => !v)}
            className={`px-2 py-0.5 text-xs rounded border ${showGrid ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-white border-gray-300 text-gray-500'}`}
          >
            Cuadricula
          </button>
          <button
            data-testid="measurements-toggle"
            onClick={() => setShowMeasurements(v => !v)}
            className={`px-2 py-0.5 text-xs rounded border ${showMeasurements ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-500'}`}
          >
            Cotas
          </button>
          <span className="text-xs text-gray-400">Click: pared · Drag: mover · Click pared: borrar</span>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">
          Vista Superior {editingEnabled && floors > 1 && `(Piso ${selectedFloor + 1})`}
          <span className={`ml-2 px-1 rounded text-xs ${editingEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {editingEnabled ? 'EDICION' : 'VER'}
          </span>
        </p>
        <svg ref={svgRef} data-testid="casa-top-view" width="100%"
          viewBox={`0 0 ${VB_W} ${TOP_H}`} preserveAspectRatio="xMidYMid meet"
          className={`border-2 border-gray-300 rounded bg-amber-50 ${editingEnabled ? 'cursor-crosshair' : ''}`}
          onClick={handleSvgClick}
        >
          <rect x={bx} y={by} width={bw} height={bh} fill="#E8D5B7" stroke="#8B6914" strokeWidth={1.5}
            style={{ cursor: editingEnabled ? 'crosshair' : 'default' }} />
          {/* Cuadricula */}
          {editingEnabled && showGrid && (
            <SvgGrid bx={bx} by={by} bw={bw} bh={bh} scaleM={scale} stepM={0.5} majorStepM={1} />
          )}
          {editingEnabled && !drawingWall && wallsOnFloor.length === 0 && (
            <text x={bx + bw/2} y={by + bh/2} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="#AAA">
              Clic para añadir pared
            </text>
          )}
          {!editingEnabled && roomLines}
          {wallsOnFloor.map(renderWall)}
          {labelsOnFloor.map(renderLabel)}
          {renderDrawingPreview()}
          {/* Cotas de paredes */}
          {showMeasurements && wallsOnFloor.map(wall => {
            const wx1 = bx + mToPx(wall.x1, scale);
            const wy1 = by + mToPx(wall.y1, scale);
            const wx2 = bx + mToPx(wall.x2, scale);
            const wy2 = by + mToPx(wall.y2, scale);
            const mx = (wx1 + wx2) / 2;
            const my = (wy1 + wy2) / 2;
            const angle = Math.atan2(wy2 - wy1, wx2 - wx1);
            const offX = -Math.sin(angle) * 7;
            const offY =  Math.cos(angle) * 7;
            return (
              <g key={`dim-${wall.id}`} data-testid={`wall-dim-${wall.id}`}>
                <rect x={mx + offX - 14} y={my + offY - 5} width={28} height={10} rx={2}
                  fill="rgba(255,255,255,0.85)" stroke="#1E90FF" strokeWidth={0.4} />
                <text x={mx + offX} y={my + offY} textAnchor="middle" dominantBaseline="middle"
                  fontSize={6.5} fill="#1E5FA0">
                  {wallLength(wall).toFixed(2)} m
                </text>
              </g>
            );
          })}
          {/* Dimension labels */}
          <text x={bx + bw/2} y={by - 6} textAnchor="middle" fontSize="9" fill="#555">{width} m</text>
          <text x={bx + bw + 6} y={by + bh/2} textAnchor="start" fontSize="9" fill="#555" dominantBaseline="middle">{depth} m</text>
          {/* Barra de escala */}
          <SvgScaleBar x={bx} y={by + bh + 10} scaleM={scale} lengthM={Math.min(5, Math.floor(width / 2))} />
        </svg>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Fachada</p>
        <svg data-testid="casa-front-view" width="100%"
          viewBox={`0 0 ${VB_W} ${FRONT_H}`} preserveAspectRatio="xMidYMid meet"
          className="border border-gray-200 rounded bg-sky-50"
        >
          <line x1={fx-6} y1={groundY} x2={fx+fw+6} y2={groundY} stroke="#666" strokeWidth={1.5} />
          {floorBlocks}
          {roofEl}
          <text x={fx+fw+10} y={fby+totalFH/2} textAnchor="start" fontSize="9" fill="#555" dominantBaseline="middle">
            {floors} {floors === 1 ? 'piso' : 'pisos'}
          </text>
          <text x={fx+fw/2} y={groundY+14} textAnchor="middle" fontSize="9" fill="#555">{width} m</text>
        </svg>
      </div>
    </div>
  );
}
