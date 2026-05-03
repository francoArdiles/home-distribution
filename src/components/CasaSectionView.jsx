import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import SvgGrid from './SvgGrid.jsx';
import SvgScaleBar from './SvgScaleBar.jsx';
import { detectRooms, mergeRoomAssignments } from '../utils/roomDetection.js';
import {
  NETWORK_COLORS, NET_ICON_CODES, NETWORK_GROUPS, getNetworkElementDef,
} from '../data/networkElementTypes.js';
import { validateHouse } from '../utils/houseValidation.js';
import { generateElectricalNetwork } from '../utils/electricalAlgorithm.js';
import { generateWaterNetwork } from '../utils/waterAlgorithm.js';
import { generateDrainageNetwork } from '../utils/drainageAlgorithm.js';

// ── Network element SVG symbol renderer ───────────────────────────────────────
// All symbols drawn relative to (0,0); caller wraps in <g transform="translate(cx,cy)">
function NetSymbol({ type, r, color }) {
  const s = r;
  const w = 0.7; // stroke width
  switch (type) {
    case 'main-panel':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <rect x={-s} y={-s * 0.65} width={s * 2} height={s * 1.3} fill="white" />
          {[-0.4, 0, 0.4].map(x => (
            <line key={x} x1={x * s} y1={-s * 0.45} x2={x * s} y2={s * 0.45} />
          ))}
        </g>
      );
    case 'junction-box':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <rect x={-s} y={-s} width={s * 2} height={s * 2} fill="white" />
          <circle r={s * 0.28} fill={color} stroke="none" />
        </g>
      );
    case 'outlet':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s} fill="white" />
          <line x1={-s * 0.28} y1={-s * 0.52} x2={-s * 0.28} y2={s * 0.52} />
          <line x1={ s * 0.28} y1={-s * 0.52} x2={ s * 0.28} y2={s * 0.52} />
        </g>
      );
    case 'outlet-special':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s} fill="white" />
          <line x1={-s * 0.28} y1={-s * 0.52} x2={-s * 0.28} y2={s * 0.52} />
          <line x1={ s * 0.28} y1={-s * 0.52} x2={ s * 0.28} y2={s * 0.52} />
          <circle r={s * 0.18} cx={0} cy={s * 0.72} fill={color} stroke="none" />
        </g>
      );
    case 'switch':
      return (
        <g stroke={color} strokeWidth={w}>
          <circle r={s * 0.38} fill={color} stroke="none" />
          <line x1={0} y1={0} x2={s * 1.05} y2={-s * 1.05} fill="none" />
          <line x1={s * 0.65} y1={-s * 1.25} x2={s * 1.25} y2={-s * 0.65} fill="none" />
        </g>
      );
    case 'light-point':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s * 0.45} />
          {[0, 90, 180, 270].map(a => {
            const rad = a * Math.PI / 180;
            return <line key={a} x1={Math.cos(rad) * s * 0.55} y1={Math.sin(rad) * s * 0.55}
              x2={Math.cos(rad) * s} y2={Math.sin(rad) * s} />;
          })}
        </g>
      );
    case 'water-entry':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s} fill="white" />
          <path d={`M ${-s * 0.5} 0 L ${s * 0.4} 0 M ${s * 0.1} ${-s * 0.38} L ${s * 0.55} 0 L ${s * 0.1} ${s * 0.38}`} />
        </g>
      );
    case 'water-tap':
      return (
        <g stroke={color} strokeWidth={w} fill="none">
          <line x1={-s * 0.75} y1={-s * 0.25} x2={s * 0.75} y2={-s * 0.25} />
          <line x1={0} y1={-s * 0.25} x2={0} y2={s * 0.52} />
          <circle cx={0} cy={s * 0.68} r={s * 0.22} fill={color} stroke="none" />
        </g>
      );
    case 'boiler':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <rect x={-s * 0.65} y={-s} width={s * 1.3} height={s * 2} rx={s * 0.25} fill="white" />
          <path d={`M ${-s * 0.2} ${s * 0.35} Q 0 ${-s * 0.05} ${s * 0.2} ${s * 0.35}`} />
        </g>
      );
    case 'shower-head':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s} fill="white" />
          {[[-0.35,-0.35],[0,-0.48],[0.35,-0.35],[-0.48,0],[0.48,0],[-0.35,0.35],[0,0.48],[0.35,0.35]].map(([x,y],i) => (
            <circle key={i} cx={x * s} cy={y * s} r={s * 0.1} fill={color} stroke="none" />
          ))}
        </g>
      );
    case 'sink':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <rect x={-s} y={-s * 0.65} width={s * 2} height={s * 1.3} rx={s * 0.18} fill="white" />
          <circle r={s * 0.2} />
        </g>
      );
    case 'washing-machine':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <rect x={-s} y={-s} width={s * 2} height={s * 2} rx={s * 0.1} fill="white" />
          <circle r={s * 0.55} />
        </g>
      );
    case 'wc':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <ellipse rx={s * 0.68} ry={s} fill="white" />
          <ellipse rx={s * 0.4} ry={s * 0.52} cy={s * 0.1} />
        </g>
      );
    case 'drain-exit':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s} fill="white" />
          <path d={`M 0 ${-s * 0.48} L 0 ${s * 0.48} M ${-s * 0.35} ${s * 0.18} L 0 ${s * 0.5} L ${s * 0.35} ${s * 0.18}`} />
        </g>
      );
    case 'wc-drain':
    case 'shower-drain':
    case 'sink-drain':
    case 'floor-drain':
    case 'washing-drain':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s} fill="white" />
          <line x1={-s * 0.62} y1={0} x2={s * 0.62} y2={0} />
          <line x1={0} y1={-s * 0.62} x2={0} y2={s * 0.62} />
        </g>
      );
    case 'cleanout':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <circle r={s} fill="white" />
          <circle r={s * 0.32} fill={color} stroke="none" />
        </g>
      );
    case 'inspection-chamber':
      return (
        <g fill="none" stroke={color} strokeWidth={w}>
          <rect x={-s} y={-s} width={s * 2} height={s * 2} fill="white" />
          <line x1={-s * 0.7} y1={-s * 0.7} x2={s * 0.7} y2={s * 0.7} />
          <line x1={ s * 0.7} y1={-s * 0.7} x2={-s * 0.7} y2={s * 0.7} />
        </g>
      );
    default:
      return <circle r={s} fill={color + '33'} stroke={color} strokeWidth={w} />;
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────
const FLOOR_HEIGHT_M = 3;
const VB_W = 200;
const PAD = 28;
const DEFAULT_WALL_THICKNESS = 0.15;
const SNAP_THRESHOLD = 0.4;
const DOOR_DEFAULT_WIDTH = 0.9;
const WINDOW_DEFAULT_WIDTH = 1.2;
const WALL_HOVER_THRESHOLD = 0.4;

const ROOM_STYLES = {
  bedroom:  { fill: 'rgba(167,139,250,0.22)', stroke: '#7C3AED' },
  bathroom: { fill: 'rgba(147,197,253,0.22)', stroke: '#2563EB' },
  laundry:  { fill: 'rgba(103,232,249,0.22)', stroke: '#0891B2' },
  common:   { fill: 'rgba(134,239,172,0.22)', stroke: '#16A34A' },
  exterior: { fill: 'rgba(156,163,175,0.15)', stroke: '#9CA3AF' },
};

const ROOM_TYPE_LABELS = {
  bedroom: 'Habitacion',
  bathroom: 'Bano',
  laundry: 'Lavanderia',
  common: 'Area comun',
  exterior: 'Exterior',
};

const DEFAULT_LAYERS = {
  architectural: { visible: true },
  electrical:    { visible: true },
  water:         { visible: true },
  drainage:      { visible: true },
};

// Snaps the 'to' point along the allowed direction from 'from' based on network tool.
function snapPipePoint(from, to, tool) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-6) return to;
  const rawAngle = Math.atan2(dy, dx);
  const step = tool === 'pipe-water' ? Math.PI / 2 : Math.PI / 4;
  const snapped = Math.round(rawAngle / step) * step;
  return { x: from.x + dist * Math.cos(snapped), y: from.y + dist * Math.sin(snapped) };
}

// ── Pure helpers ───────────────────────────────────────────────────────────────
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
  const T = 6; // tolerance in SVG px — covers the border stroke + a bit of margin
  return x >= bx - T && x <= bx + bw + T && y >= by - T && y <= by + bh + T;
}

function buildSnapPoints(walls, width, depth) {
  return [
    { x: 0, y: 0 }, { x: width, y: 0 },
    { x: 0, y: depth }, { x: width, y: depth },
    ...walls.flatMap(w => [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]),
  ];
}

export function getSnapPoint(raw, walls, width, depth, threshold = SNAP_THRESHOLD, gridStepM = 0) {
  const candidates = buildSnapPoints(walls, width, depth);
  let best = null;
  let bestDist = threshold;
  for (const c of candidates) {
    const d = Math.sqrt((c.x - raw.x) ** 2 + (c.y - raw.y) ** 2);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (best) return { ...best, snapped: true };
  if (gridStepM > 0) {
    const gx = Math.round(raw.x / gridStepM) * gridStepM;
    const gy = Math.round(raw.y / gridStepM) * gridStepM;
    if (Math.sqrt((gx - raw.x) ** 2 + (gy - raw.y) ** 2) < threshold) {
      return { x: gx, y: gy, snapped: true };
    }
  }
  // Clamp to building bounds so border clicks always land on the edge
  return {
    x: Math.max(0, Math.min(width, raw.x)),
    y: Math.max(0, Math.min(depth, raw.y)),
    snapped: false,
  };
}

function vectorAngleDeg(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}
function normAngle(deg) { return ((deg % 360) + 360) % 360; }

// Returns { wall, t } for the wall closest to ptM within threshold, or null.
function closestWallPoint(ptM, walls, threshold = WALL_HOVER_THRESHOLD) {
  let best = null;
  let bestDist = threshold;
  for (const wall of walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) continue;
    const t = Math.max(0, Math.min(1,
      ((ptM.x - wall.x1) * dx + (ptM.y - wall.y1) * dy) / len2
    ));
    const projX = wall.x1 + t * dx;
    const projY = wall.y1 + t * dy;
    const dist = Math.sqrt((ptM.x - projX) ** 2 + (ptM.y - projY) ** 2);
    if (dist < bestDist) { bestDist = dist; best = { wall, t }; }
  }
  return best;
}

// Point-in-polygon (ray casting) — polygon in meter coords.
function pointInPolygon(pt, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

const NET_ICON_R = 3; // SVG units; ~0.2 m at typical scale

// Ray-segment intersection: ray from pt in direction (dx,dy).
// Returns t >= 0 along the ray where it hits segment (x1,y1)-(x2,y2), or Infinity.
function raySegmentT(px, py, rdx, rdy, x1, y1, x2, y2) {
  const sdx = x2 - x1, sdy = y2 - y1;
  const denom = rdx * sdy - rdy * sdx;
  if (Math.abs(denom) < 1e-10) return Infinity;
  const t = ((x1 - px) * sdy - (y1 - py) * sdx) / denom;
  const u = ((x1 - px) * rdy - (y1 - py) * rdx) / denom;
  if (t >= -1e-9 && u >= -1e-9 && u <= 1 + 1e-9) return Math.max(0, t);
  return Infinity;
}

// Cast ray in direction (rdx,rdy) from pt, return distance to nearest wall or border.
function castRay(pt, rdx, rdy, walls, width, depth) {
  // Border lines
  const borders = [
    [0, 0, width, 0],
    [width, 0, width, depth],
    [width, depth, 0, depth],
    [0, depth, 0, 0],
  ];
  let minT = Infinity;
  for (const [x1, y1, x2, y2] of borders) {
    const t = raySegmentT(pt.x, pt.y, rdx, rdy, x1, y1, x2, y2);
    if (t < minT) minT = t;
  }
  for (const wall of walls) {
    const t = raySegmentT(pt.x, pt.y, rdx, rdy, wall.x1, wall.y1, wall.x2, wall.y2);
    if (t < minT) minT = t;
  }
  return minT === Infinity ? 0 : minT;
}

function computeMeasurements(pt, walls, width, depth, wallThickness) {
  const ht = wallThickness / 2;
  const left   = Math.max(0, castRay(pt, -1, 0, walls, width, depth) - ht);
  const right  = Math.max(0, castRay(pt,  1, 0, walls, width, depth) - ht);
  const top    = Math.max(0, castRay(pt,  0, -1, walls, width, depth) - ht);
  const bottom = Math.max(0, castRay(pt,  0,  1, walls, width, depth) - ht);
  const areaW = left + right;
  const areaH = top + bottom;
  return { left, right, top, bottom, areaW, areaH, area: areaW * areaH };
}

function NetworkElementIcon({ ne, cx, cy, r = NET_ICON_R, selected = false }) {
  const def = getNetworkElementDef(ne.type);
  const color = def ? NETWORK_COLORS[def.network] : '#888';
  const angle = ne.rotation ?? 0;
  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${angle})`}>
      {/* transparent hit area */}
      <rect x={-r * 1.4} y={-r * 1.4} width={r * 2.8} height={r * 2.8} fill="transparent" />
      <NetSymbol type={ne.type} r={r} color={color} />
      {selected && (
        <rect x={-r * 1.2} y={-r * 1.2} width={r * 2.4} height={r * 2.4}
          fill="none" stroke="#EF4444" strokeWidth={0.8} strokeDasharray="2,1" />
      )}
    </g>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CasaSectionView({ element, detail, editMode, onChange }) {
  const width    = element?.width  ?? 10;
  const depth    = element?.height ?? 8;
  const floors   = detail?.floors   ?? 1;
  const roofType = detail?.roofType ?? 'a dos aguas';

  const [internalWalls,           setInternalWalls]           = useState(detail?.walls           ?? []);
  const [internalLabels,          setInternalLabels]          = useState(detail?.labels          ?? []);
  const [internalDoors,           setInternalDoors]           = useState(detail?.doors           ?? []);
  const [internalWindows,         setInternalWindows]         = useState(detail?.windows         ?? []);
  const [internalRooms,           setInternalRooms]           = useState(detail?.rooms           ?? []);
  const [internalNetworkElements, setInternalNetworkElements] = useState(detail?.networkElements ?? []);

  const [selectedFloor,          setSelectedFloor]          = useState(0);
  const [wallThickness,          setWallThickness]          = useState(DEFAULT_WALL_THICKNESS);
  const [tool,                   setTool]                   = useState('wall');
  const [drawingWall,            setDrawingWall]            = useState(null);
  const [cursorMeter,            setCursorMeter]            = useState(null);
  const [hoveredWallId,          setHoveredWallId]          = useState(null);
  const [hoveredWallTarget,      setHoveredWallTarget]      = useState(null);
  const [dragging,               setDragging]               = useState(null);
  const [draggingLabel,          setDraggingLabel]          = useState(null);
  const [selectedRoomId,         setSelectedRoomId]         = useState(null);
  const [selectedNetworkElementId, setSelectedNetworkElementId] = useState(null);
  const [selectedNetworkType,    setSelectedNetworkType]    = useState(null); // type string to place
  const [networkRotation,        setNetworkRotation]        = useState(0);   // 0|90|180|270
  const [showNetworkPalette,       setShowNetworkPalette]       = useState(false);
  const [draggingNetworkElement,   setDraggingNetworkElement]   = useState(null); // { id, startMeter, startPos }
  const [internalNetworkSegments,  setInternalNetworkSegments]  = useState(detail?.networkSegments ?? []);
  const [internalLayers,           setInternalLayers]           = useState(detail?.layers ?? DEFAULT_LAYERS);
  const [drawingSegment,           setDrawingSegment]           = useState(null); // { network, points }
  const [pipeSubtype,              setPipeSubtype]              = useState('cold');
  const [selectedSegmentId,        setSelectedSegmentId]        = useState(null);
  const [showValidation,           setShowValidation]           = useState(true);
  const [algoWarnings,             setAlgoWarnings]             = useState([]);
  const [isEditing,                setIsEditing]                = useState(true);
  const [showGrid,               setShowGrid]               = useState(true);
  const [showMeasurements,       setShowMeasurements]       = useState(true);
  const [showRooms,              setShowRooms]              = useState(true);
  const [measurePoint,           setMeasurePoint]           = useState(null);
  const isDraggingRef = useRef(false);
  const svgRef = useRef(null);

  const editingEnabled = editMode !== undefined ? editMode : isEditing;

  const walls           = detail?.walls           ?? internalWalls;
  const labels          = detail?.labels          ?? internalLabels;
  const doors           = detail?.doors           ?? internalDoors;
  const windows         = detail?.windows         ?? internalWindows;
  const storedRooms     = detail?.rooms           ?? internalRooms;
  const networkElements = detail?.networkElements ?? internalNetworkElements;
  const networkSegments = detail?.networkSegments ?? internalNetworkSegments;
  const layers          = detail?.layers          ?? internalLayers;

  // ── Floor filters ──────────────────────────────────────────────────────────
  const wallsOnFloor           = walls.filter(w => (w.floor ?? 0) === selectedFloor);
  const labelsOnFloor          = labels.filter(l => (l.floor ?? 0) === selectedFloor);
  const doorsOnFloor           = doors.filter(d => (d.floor ?? 0) === selectedFloor);
  const windowsOnFloor         = windows.filter(w => (w.floor ?? 0) === selectedFloor);
  const networkElementsOnFloor = networkElements.filter(ne => (ne.floor ?? 0) === selectedFloor);
  const networkSegmentsOnFloor = networkSegments.filter(s => (s.floor ?? 0) === selectedFloor);

  // ── Room detection ─────────────────────────────────────────────────────────
  const detectedRooms = useMemo(
    () => detectRooms(walls, selectedFloor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(wallsOnFloor)]
  );

  const mergedRooms = useMemo(
    () => mergeRoomAssignments(detectedRooms, storedRooms),
    [detectedRooms, storedRooms]
  );

  const selectedRoom = mergedRooms.find(r => r.id === selectedRoomId);

  // ── Scale & layout ─────────────────────────────────────────────────────────
  const scale = (VB_W - PAD * 2) / width;
  const bx = PAD, by = PAD;
  const bw = width * scale;
  const bh = depth * scale;
  const TOP_H = Math.round(bh + PAD * 2);
  const epRadius = 0.075 * scale;

  // ── updateDetail ──────────────────────────────────────────────────────────
  const updateDetail = useCallback((updater) => {
    const updates = updater({
      walls, labels, doors, windows, rooms: storedRooms, networkElements, networkSegments, layers,
    });
    const newDetail = {
      ...detail,
      walls:            updates.walls            ?? walls,
      labels:           updates.labels           ?? labels,
      doors:            updates.doors            ?? doors,
      windows:          updates.windows          ?? windows,
      rooms:            updates.rooms            ?? storedRooms,
      networkElements:  updates.networkElements  ?? networkElements,
      networkSegments:  updates.networkSegments  ?? networkSegments,
      layers:           updates.layers           ?? layers,
    };
    if (onChange) {
      onChange(newDetail);
    } else {
      if (updates.walls            !== undefined) setInternalWalls(updates.walls);
      if (updates.labels           !== undefined) setInternalLabels(updates.labels);
      if (updates.doors            !== undefined) setInternalDoors(updates.doors);
      if (updates.windows          !== undefined) setInternalWindows(updates.windows);
      if (updates.rooms            !== undefined) setInternalRooms(updates.rooms);
      if (updates.networkElements  !== undefined) setInternalNetworkElements(updates.networkElements);
      if (updates.networkSegments  !== undefined) setInternalNetworkSegments(updates.networkSegments);
      if (updates.layers           !== undefined) setInternalLayers(updates.layers);
    }
  }, [onChange, detail, walls, labels, doors, windows, storedRooms, networkElements, networkSegments, layers]);

  // ── Validation (debounced via useMemo on stable serialized state) ─────────
  const validationResults = useMemo(
    () => showValidation ? validateHouse({ networkElements, networkSegments }) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showValidation, JSON.stringify(networkElements), JSON.stringify(networkSegments)]
  );

  const validationByElement = useMemo(() => {
    const map = new Map();
    for (const r of validationResults) {
      if (r.elementId) {
        if (!map.has(r.elementId)) map.set(r.elementId, []);
        map.get(r.elementId).push(r);
      }
    }
    return map;
  }, [validationResults]);

  // ── Auto-generate handlers ─────────────────────────────────────────────────
  const handleGenerateElectrical = useCallback(() => {
    const { segments, autoBoxes, warnings } = generateElectricalNetwork(
      { networkElements, networkSegments, rooms: storedRooms },
      selectedFloor
    );
    setAlgoWarnings(warnings);
    if (segments.length === 0 && autoBoxes.length === 0) return;
    updateDetail(({ networkElements: nes, networkSegments: segs }) => ({
      networkElements: [...nes, ...autoBoxes],
      networkSegments: [...segs, ...segments],
    }));
  }, [networkElements, networkSegments, storedRooms, selectedFloor, updateDetail]);

  const handleGenerateWater = useCallback(() => {
    const { coldSegments, hotSegments, warnings } = generateWaterNetwork(
      { networkElements, networkSegments },
      selectedFloor
    );
    setAlgoWarnings(warnings);
    const all = [...coldSegments, ...hotSegments];
    if (all.length === 0) return;
    updateDetail(({ networkSegments: segs }) => ({ networkSegments: [...segs, ...all] }));
  }, [networkElements, networkSegments, selectedFloor, updateDetail]);

  const handleGenerateDrainage = useCallback(() => {
    const { segments, warnings } = generateDrainageNetwork(
      { networkElements, networkSegments },
      selectedFloor
    );
    setAlgoWarnings(warnings);
    if (segments.length === 0) return;
    updateDetail(({ networkSegments: segs }) => ({ networkSegments: [...segs, ...segments] }));
  }, [networkElements, networkSegments, selectedFloor, updateDetail]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!editingEnabled) return;
      if (e.key === 'r' || e.key === 'R') {
        if (tool === 'place-network') {
          setNetworkRotation(r => (r + 90) % 360);
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNetworkElementId) {
          updateDetail(({ networkElements: nes }) => ({
            networkElements: nes.filter(ne => ne.id !== selectedNetworkElementId),
          }));
          setSelectedNetworkElementId(null);
        } else if (selectedSegmentId) {
          updateDetail(({ networkSegments: segs }) => ({
            networkSegments: segs.filter(s => s.id !== selectedSegmentId),
          }));
          setSelectedSegmentId(null);
        }
      }
      if (e.key === 'Enter') {
        if (drawingSegment && drawingSegment.points.length >= 2) {
          updateDetail(({ networkSegments: segs }) => ({
            networkSegments: [...segs, {
              id: `seg-${generateId()}`,
              network: drawingSegment.network,
              points: drawingSegment.points,
              subtype: drawingSegment.network === 'water' ? pipeSubtype : null,
              diameter: null,
              isExternal: false,
              floor: selectedFloor,
            }],
          }));
          setDrawingSegment(null);
        }
      }
      if (e.key === 'Escape') {
        setDrawingWall(null);
        setDrawingSegment(null);
        if (tool === 'measure') {
          setTool('wall');
          setMeasurePoint(null);
        }
        if (tool === 'place-network') {
          setTool('wall');
          setSelectedNetworkType(null);
        }
        if (tool === 'pipe-electrical' || tool === 'pipe-water' || tool === 'pipe-drainage') {
          setTool('wall');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingEnabled, tool, selectedNetworkElementId, selectedSegmentId, drawingSegment, pipeSubtype, selectedFloor, updateDetail]);

  // ── Coord helpers ─────────────────────────────────────────────────────────
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
  const finishDrawingSegment = useCallback((pts) => {
    const points = pts ?? drawingSegment?.points;
    if (!points || points.length < 2 || !drawingSegment) return;
    updateDetail(({ networkSegments: segs }) => ({
      networkSegments: [...segs, {
        id: `seg-${generateId()}`,
        network: drawingSegment.network,
        points,
        subtype: drawingSegment.network === 'water' ? pipeSubtype : null,
        diameter: null,
        isExternal: false,
        floor: selectedFloor,
      }],
    }));
    setDrawingSegment(null);
  }, [drawingSegment, pipeSubtype, selectedFloor, updateDetail]);

  const handleSvgDoubleClick = useCallback((e) => {
    if (!drawingSegment || drawingSegment.points.length < 3) return;
    e.stopPropagation();
    // Remove last point (added by the click that also fired this dblclick)
    finishDrawingSegment(drawingSegment.points.slice(0, -1));
  }, [drawingSegment, finishDrawingSegment]);

  const handleSvgClick = useCallback((e) => {
    if (!editingEnabled) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    if (!isInsideBuilding(coords.x, coords.y, bx, by, bw, bh)) return;
    const raw = svgToMeters(coords.x, coords.y);
    const isShiftOrCtrl = e.shiftKey || e.ctrlKey;

    if (tool === 'wall') {
      if (isShiftOrCtrl) {
        const snapped = getSnapPoint(raw, wallsOnFloor, width, depth, SNAP_THRESHOLD, showGrid ? 1 : 0);
        updateDetail(({ walls: w, labels: l }) => ({
          walls: w,
          labels: [...l, { id: `label-${generateId()}`, x: snapped.x, y: snapped.y, text: 'Etiqueta', floor: selectedFloor }],
        }));
      } else if (drawingWall) {
        const snapped = getSnapPoint(raw, wallsOnFloor, width, depth, SNAP_THRESHOLD, showGrid ? 1 : 0);
        updateDetail(({ walls: w, labels: l }) => ({
          walls: [...w, {
            id: `wall-${generateId()}`,
            x1: drawingWall.x, y1: drawingWall.y,
            x2: snapped.x, y2: snapped.y,
            thickness: wallThickness, floor: selectedFloor,
          }],
          labels: l,
        }));
        setDrawingWall(null);
        setCursorMeter(null);
      } else {
        const snapped = getSnapPoint(raw, wallsOnFloor, width, depth, SNAP_THRESHOLD, showGrid ? 1 : 0);
        setDrawingWall({ x: snapped.x, y: snapped.y });
      }
    } else if (tool === 'door' || tool === 'window') {
      if (hoveredWallTarget) {
        const { wall, t } = hoveredWallTarget;
        if (tool === 'door') {
          updateDetail(({ doors: ds }) => ({
            doors: [...ds, { id: `door-${generateId()}`, wallId: wall.id, t, width: DOOR_DEFAULT_WIDTH, swing: 'left', floor: selectedFloor }],
          }));
        } else {
          updateDetail(({ windows: ws }) => ({
            windows: [...ws, { id: `win-${generateId()}`, wallId: wall.id, t, width: WINDOW_DEFAULT_WIDTH, floor: selectedFloor }],
          }));
        }
      }
    } else if (tool === 'place-network') {
      if (selectedNetworkType) {
        const def = getNetworkElementDef(selectedNetworkType);
        updateDetail(({ networkElements: nes }) => ({
          networkElements: [...nes, {
            id: `ne-${generateId()}`,
            type: selectedNetworkType,
            x: Math.max(0, Math.min(width, raw.x)),
            y: Math.max(0, Math.min(depth, raw.y)),
            rotation: networkRotation,
            network: def?.network ?? 'electrical',
            floor: selectedFloor,
            properties: { ...(def?.defaultProps ?? {}) },
          }],
        }));
      }
    } else if (tool === 'pipe-electrical' || tool === 'pipe-water' || tool === 'pipe-drainage') {
      const network = tool.replace('pipe-', '');
      if (!drawingSegment) {
        setDrawingSegment({ network, points: [raw] });
      } else {
        const lastPt = drawingSegment.points[drawingSegment.points.length - 1];
        const snapped = snapPipePoint(lastPt, raw, tool);
        const clamped = { x: Math.max(0, Math.min(width, snapped.x)), y: Math.max(0, Math.min(depth, snapped.y)) };
        setDrawingSegment(prev => ({ ...prev, points: [...prev.points, clamped] }));
      }
    } else if (tool === 'select') {
      // Network elements are selected via mousedown; SVG click on empty space deselects or selects room
      if (isDraggingRef.current) return;
      const clicked = mergedRooms.find(r => pointInPolygon(raw, r.polygon));
      setSelectedRoomId(clicked ? clicked.id : null);
      if (!clicked) { setSelectedNetworkElementId(null); setSelectedSegmentId(null); }
    }
  }, [
    editingEnabled, getSvgCoords, svgToMeters, bx, by, bw, bh,
    tool, drawingWall, wallThickness, selectedFloor, wallsOnFloor, width, depth,
    showGrid, hoveredWallTarget, mergedRooms, updateDetail,
    selectedNetworkType, networkRotation, drawingSegment,
  ]);

  const handleWallBodyClick = useCallback((e, wall) => {
    e.stopPropagation();
    if (!editingEnabled || isDraggingRef.current || tool !== 'wall') return;
    updateDetail(({ walls: w, labels: l }) => ({ walls: w.filter(ww => ww.id !== wall.id), labels: l }));
  }, [editingEnabled, tool, updateDetail]);

  const handleWallBodyMouseDown = useCallback((e, wall) => {
    if (!editingEnabled || tool !== 'wall') return;
    e.stopPropagation();
    const coords = getSvgCoords(e);
    if (!coords) return;
    isDraggingRef.current = false;
    setDragging({ type: 'wall', wallId: wall.id, startMeter: svgToMeters(coords.x, coords.y), startWall: { ...wall } });
  }, [editingEnabled, tool, getSvgCoords, svgToMeters]);

  const handleEndpointMouseDown = useCallback((e, wall, endpoint) => {
    if (!editingEnabled || tool !== 'wall') return;
    e.stopPropagation();
    const coords = getSvgCoords(e);
    if (!coords) return;
    isDraggingRef.current = false;
    setDragging({ type: 'endpoint', wallId: wall.id, endpoint, startMeter: svgToMeters(coords.x, coords.y), startWall: { ...wall } });
  }, [editingEnabled, tool, getSvgCoords, svgToMeters]);

  const handleMouseMove = useCallback((e) => {
    const coords = getSvgCoords(e);
    if (!coords) return;
    const m = svgToMeters(coords.x, coords.y);

    // Always track cursor for previews
    setCursorMeter(m);

    if (tool === 'measure') {
      if (isInsideBuilding(coords.x, coords.y, bx, by, bw, bh)) {
        setMeasurePoint({
          x: Math.max(0, Math.min(width, m.x)),
          y: Math.max(0, Math.min(depth, m.y)),
        });
      } else {
        setMeasurePoint(null);
      }
      return;
    }

    if (tool === 'door' || tool === 'window') {
      const target = closestWallPoint(m, wallsOnFloor);
      setHoveredWallTarget(target);
    } else {
      setHoveredWallTarget(null);
    }

    if (draggingNetworkElement) {
      isDraggingRef.current = true;
      const dx = m.x - draggingNetworkElement.startMeter.x;
      const dy = m.y - draggingNetworkElement.startMeter.y;
      const { id, startPos } = draggingNetworkElement;
      updateDetail(({ networkElements: nes }) => ({
        networkElements: nes.map(ne => ne.id === id
          ? { ...ne, x: Math.max(0, Math.min(width, startPos.x + dx)), y: Math.max(0, Math.min(depth, startPos.y + dy)) }
          : ne),
      }));
      return;
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
  }, [dragging, draggingLabel, draggingNetworkElement, tool, wallsOnFloor, getSvgCoords, svgToMeters, width, depth, updateDetail]);

  const handleMouseUp = useCallback(() => {
    setDraggingLabel(null);
    setDragging(null);
    setDraggingNetworkElement(null);
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

  const handleDoorClick = useCallback((e, door) => {
    e.stopPropagation();
    if (!editingEnabled || tool !== 'door') return;
    updateDetail(({ doors: ds }) => ({ doors: ds.filter(d => d.id !== door.id) }));
  }, [editingEnabled, tool, updateDetail]);

  const handleWindowClick = useCallback((e, win) => {
    e.stopPropagation();
    if (!editingEnabled || tool !== 'window') return;
    updateDetail(({ windows: ws }) => ({ windows: ws.filter(w => w.id !== win.id) }));
  }, [editingEnabled, tool, updateDetail]);

  const handleNetworkElementMouseDown = useCallback((e, ne) => {
    if (!editingEnabled || tool !== 'select') return;
    e.stopPropagation();
    const coords = getSvgCoords(e);
    if (!coords) return;
    isDraggingRef.current = false;
    setSelectedNetworkElementId(ne.id);
    setSelectedRoomId(null);
    setDraggingNetworkElement({
      id: ne.id,
      startMeter: svgToMeters(coords.x, coords.y),
      startPos: { x: ne.x, y: ne.y },
    });
  }, [editingEnabled, tool, getSvgCoords, svgToMeters]);

  const handleRoomTypeChange = useCallback((type) => {
    if (!selectedRoom) return;
    updateDetail(({ rooms: rs }) => {
      const existing = rs.find(r => {
        if (!r.centroid || !selectedRoom.centroid) return false;
        const dx = r.centroid.x - selectedRoom.centroid.x;
        const dy = r.centroid.y - selectedRoom.centroid.y;
        return Math.sqrt(dx * dx + dy * dy) < 1;
      });
      if (existing) {
        return { rooms: rs.map(r => r === existing ? { ...r, type } : r) };
      }
      return {
        rooms: [...rs, { id: `room-stored-${generateId()}`, centroid: selectedRoom.centroid, type, label: '' }],
      };
    });
  }, [selectedRoom, updateDetail]);

  const handleRoomLabelChange = useCallback((label) => {
    if (!selectedRoom) return;
    updateDetail(({ rooms: rs }) => {
      const existing = rs.find(r => {
        if (!r.centroid || !selectedRoom.centroid) return false;
        const dx = r.centroid.x - selectedRoom.centroid.x;
        const dy = r.centroid.y - selectedRoom.centroid.y;
        return Math.sqrt(dx * dx + dy * dy) < 1;
      });
      if (existing) {
        return { rooms: rs.map(r => r === existing ? { ...r, label } : r) };
      }
      return {
        rooms: [...rs, { id: `room-stored-${generateId()}`, centroid: selectedRoom.centroid, type: undefined, label }],
      };
    });
  }, [selectedRoom, updateDetail]);

  // ── Render: wall with door/window openings ─────────────────────────────────
  const renderWall = (wall) => {
    const x1 = bx + mToPx(wall.x1, scale);
    const y1 = by + mToPx(wall.y1, scale);
    const x2 = bx + mToPx(wall.x2, scale);
    const y2 = by + mToPx(wall.y2, scale);
    const tp = mToPx(wall.thickness, scale);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dx = (tp / 2) * Math.sin(angle);
    const dy = (tp / 2) * Math.cos(angle);
    const points = `${x1-dx},${y1+dy} ${x1+dx},${y1-dy} ${x2+dx},${y2-dy} ${x2-dx},${y2+dy}`;
    const isHovered = hoveredWallId === wall.id;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 8;

    const wallDoors   = doorsOnFloor.filter(d => d.wallId === wall.id);
    const wallWindows = windowsOnFloor.filter(w => w.wallId === wall.id);
    const wLen = wallLength(wall);
    const ux = (wall.x2 - wall.x1) / (wLen || 1);
    const uy = (wall.y2 - wall.y1) / (wLen || 1);

    const openingRect = (t, openWidth) => {
      const half = openWidth / 2;
      const tStart = Math.max(0, t - half / wLen);
      const tEnd   = Math.min(1, t + half / wLen);
      const sx = bx + mToPx(wall.x1 + tStart * (wall.x2 - wall.x1), scale);
      const sy = by + mToPx(wall.y1 + tStart * (wall.y2 - wall.y1), scale);
      const ex = bx + mToPx(wall.x1 + tEnd   * (wall.x2 - wall.x1), scale);
      const ey = by + mToPx(wall.y1 + tEnd   * (wall.y2 - wall.y1), scale);
      const uxPx = mToPx(ux, scale), uyPx = mToPx(uy, scale);
      const perpPx = tp * 0.6;
      return { sx, sy, ex, ey, perpX: -uyPx / scale * perpPx, perpY: uxPx / scale * perpPx };
    };

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
          style={{ cursor: editingEnabled && tool === 'wall' ? 'pointer' : 'default' }}
          onClick={(e) => handleWallBodyClick(e, wall)}
          onMouseDown={(e) => handleWallBodyMouseDown(e, wall)}
        />

        {wallDoors.map(door => {
          const { sx, sy, ex, ey, perpX, perpY } = openingRect(door.t, door.width);
          const pts = `${sx-perpX},${sy-perpY} ${ex-perpX},${ey-perpY} ${ex+perpX},${ey+perpY} ${sx+perpX},${sy+perpY}`;
          return (
            <g key={door.id} onClick={(e) => handleDoorClick(e, door)} style={{ cursor: tool === 'door' ? 'pointer' : 'default' }}>
              <polygon points={pts} fill="#E8D5B7" stroke="none" />
              {renderDoorSymbol(sx, sy, ex, ey, door, ux, uy, tp)}
            </g>
          );
        })}

        {wallWindows.map(win => {
          const { sx, sy, ex, ey, perpX, perpY } = openingRect(win.t, win.width);
          const pts = `${sx-perpX},${sy-perpY} ${ex-perpX},${ey-perpY} ${ex+perpX},${ey+perpY} ${sx+perpX},${sy+perpY}`;
          return (
            <g key={win.id} onClick={(e) => handleWindowClick(e, win)} style={{ cursor: tool === 'window' ? 'pointer' : 'default' }}>
              <polygon points={pts} fill="#AEE0F5" stroke="none" opacity={0.7} />
              {renderWindowSymbol(sx, sy, ex, ey, ux, uy, tp)}
            </g>
          );
        })}

        {isHovered && (
          <g data-testid={`wall-measure-${wall.id}`}>
            <rect x={mx - 18} y={my - 7} width={36} height={12} rx={2}
              fill="rgba(255,255,255,0.92)" stroke="#8B6914" strokeWidth={0.5} />
            <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#333">
              {wallLength(wall).toFixed(2)} m
            </text>
          </g>
        )}

        {editingEnabled && tool === 'wall' && (
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

  const renderDoorSymbol = (sx, sy, ex, ey, door, ux, uy, tp) => {
    const perpX = -uy * tp * 2;
    const perpY = ux * tp * 2;
    const dw = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
    const leafX = sx + perpX * (dw / (tp * 2));
    const leafY = sy + perpY * (dw / (tp * 2));
    return (
      <g fill="none" stroke="#5C3317" strokeWidth={0.6}>
        <line x1={sx} y1={sy} x2={leafX} y2={leafY} />
        <path d={`M ${leafX} ${leafY} A ${dw} ${dw} 0 0 1 ${ex} ${ey}`} />
      </g>
    );
  };

  const renderWindowSymbol = (sx, sy, ex, ey, ux, uy, tp) => {
    const thirds = [0.33, 0.67];
    return (
      <g stroke="#2563EB" strokeWidth={0.5} fill="none">
        {thirds.map((f, i) => {
          const px = sx + (ex - sx) * f;
          const py = sy + (ey - sy) * f;
          const perpX = -uy * tp * 0.5;
          const perpY = ux * tp * 0.5;
          return <line key={i} x1={px - perpX} y1={py - perpY} x2={px + perpX} y2={py + perpY} />;
        })}
      </g>
    );
  };

  const renderWallHighlight = () => {
    if (!hoveredWallTarget || (tool !== 'door' && tool !== 'window')) return null;
    const { wall, t } = hoveredWallTarget;
    const wLen = wallLength(wall);
    const hLen = (tool === 'door' ? DOOR_DEFAULT_WIDTH : WINDOW_DEFAULT_WIDTH) / 2;
    const tStart = Math.max(0, t - hLen / wLen);
    const tEnd   = Math.min(1, t + hLen / wLen);
    const sx = bx + mToPx(wall.x1 + tStart * (wall.x2 - wall.x1), scale);
    const sy = by + mToPx(wall.y1 + tStart * (wall.y2 - wall.y1), scale);
    const ex = bx + mToPx(wall.x1 + tEnd   * (wall.x2 - wall.x1), scale);
    const ey = by + mToPx(wall.y1 + tEnd   * (wall.y2 - wall.y1), scale);
    const tp = mToPx(wall.thickness, scale);
    const angle = Math.atan2(ey - sy, ex - sx);
    const dx = (tp / 2) * Math.sin(angle);
    const dy = (tp / 2) * Math.cos(angle);
    return (
      <polygon
        points={`${sx-dx},${sy+dy} ${ex-dx},${ey+dy} ${ex+dx},${ey-dy} ${sx+dx},${sy-dy}`}
        fill={tool === 'door' ? 'rgba(59,130,246,0.4)' : 'rgba(6,182,212,0.4)'}
        stroke="#2563EB" strokeWidth={0.8}
        pointerEvents="none"
      />
    );
  };

  // ── Render: network elements ───────────────────────────────────────────────
  const renderNetworkElements = () => networkElementsOnFloor.filter(ne => {
    const net = ne.network;
    if (net === 'combined') return layers.water?.visible !== false || layers.drainage?.visible !== false;
    return layers[net]?.visible !== false;
  }).map(ne => {
    const cx = bx + mToPx(ne.x, scale);
    const cy = by + mToPx(ne.y, scale);
    const isSelected = ne.id === selectedNetworkElementId;
    const vIssues = validationByElement.get(ne.id) ?? [];
    const hasError   = vIssues.some(v => v.severity === 'error');
    const hasWarning = vIssues.some(v => v.severity === 'warning');
    return (
      <g key={ne.id}
        onMouseDown={(e) => handleNetworkElementMouseDown(e, ne)}
        style={{ cursor: tool === 'select' ? (isSelected ? 'move' : 'pointer') : 'default' }}>
        <NetworkElementIcon ne={ne} cx={cx} cy={cy} selected={isSelected} />
        {showValidation && (hasError || hasWarning) && (
          <circle cx={cx + NET_ICON_R} cy={cy - NET_ICON_R} r={2.2}
            fill={hasError ? '#EF4444' : '#F59E0B'} stroke="white" strokeWidth={0.5}
            pointerEvents="none" />
        )}
      </g>
    );
  });

  // Cursor preview when placing a network element
  const renderNetworkCursor = () => {
    if (tool !== 'place-network' || !cursorMeter || !selectedNetworkType) return null;
    const cx = bx + mToPx(Math.max(0, Math.min(width, cursorMeter.x)), scale);
    const cy = by + mToPx(Math.max(0, Math.min(depth, cursorMeter.y)), scale);
    const previewNe = { type: selectedNetworkType, rotation: networkRotation };
    return (
      <g opacity={0.6} pointerEvents="none">
        <NetworkElementIcon ne={previewNe} cx={cx} cy={cy} />
        {networkRotation !== 0 && (
          <text x={cx + NET_ICON_R + 2} y={cy - NET_ICON_R}
            fontSize={5} fill="#555">{networkRotation}°</text>
        )}
      </g>
    );
  };

  // ── Render: rooms ─────────────────────────────────────────────────────────
  const renderRoom = (room) => {
    if (!showRooms) return null;
    const pxPoints = room.polygon
      .map(p => `${bx + mToPx(p.x, scale)},${by + mToPx(p.y, scale)}`)
      .join(' ');
    const style = room.type ? ROOM_STYLES[room.type] : { fill: 'rgba(0,0,0,0.04)', stroke: 'transparent' };
    const isSelected = room.id === selectedRoomId;
    const cx = bx + mToPx(room.centroid.x, scale);
    const cy = by + mToPx(room.centroid.y, scale);
    const typeLabel = room.type ? ROOM_TYPE_LABELS[room.type] : null;
    const displayLabel = room.label || typeLabel;

    return (
      <g key={room.id} onClick={() => tool === 'select' && setSelectedRoomId(room.id === selectedRoomId ? null : room.id)}
        style={{ cursor: tool === 'select' ? 'pointer' : 'default' }}>
        <polygon
          points={pxPoints}
          fill={style.fill}
          stroke={isSelected ? '#EF4444' : style.stroke}
          strokeWidth={isSelected ? 1.5 : 0.8}
          strokeDasharray={room.type === 'exterior' ? '3,2' : 'none'}
        />
        {displayLabel && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fontSize={6} fill={style.stroke ?? '#666'} style={{ pointerEvents: 'none' }}>
            {displayLabel}
          </text>
        )}
      </g>
    );
  };

  const renderLabel = (label) => {
    const x = bx + mToPx(label.x, scale);
    const y = by + mToPx(label.y, scale);
    return (
      <g key={label.id} data-testid={`label-${label.id}`}
        onClick={(e) => handleLabelClick(e, label)}
        onMouseDown={(e) => handleLabelDragStart(e, label)}
        style={{ cursor: editingEnabled ? 'move' : 'default' }}>
        <rect x={x - 20} y={y - 8} width={40} height={16} fill="rgba(255,255,255,0.8)" stroke="#8B6914" strokeWidth={0.5} rx={3} />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#333">
          {label.text.length > 8 ? label.text.substring(0, 7) + '...' : label.text}
        </text>
      </g>
    );
  };

  // ── Render: network segments (pipes/conduits) ──────────────────────────────
  const renderNetworkSegments = () => networkSegmentsOnFloor.map(seg => {
    if (!layers[seg.network]?.visible) return null;
    const color = seg.network === 'water' && seg.subtype === 'hot' ? '#EF4444' : NETWORK_COLORS[seg.network] ?? '#888';
    const pts = seg.points.map(p => `${bx + mToPx(p.x, scale)},${by + mToPx(p.y, scale)}`).join(' ');
    const isSelected = seg.id === selectedSegmentId;
    return (
      <g key={seg.id}
        style={{ cursor: tool === 'select' ? 'pointer' : 'default' }}
        onClick={(e) => { if (tool === 'select') { e.stopPropagation(); setSelectedSegmentId(seg.id === selectedSegmentId ? null : seg.id); setSelectedNetworkElementId(null); } }}>
        {/* wider transparent stroke for easier click detection */}
        <polyline points={pts} fill="none" stroke="transparent" strokeWidth={6} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth={isSelected ? 2.2 : 1.5}
          strokeDasharray={seg.isExternal ? '4,2' : 'none'} opacity={0.9} />
      </g>
    );
  });

  // Cursor preview when drawing a pipe segment
  const renderPipeCursor = () => {
    const isPipe = tool === 'pipe-electrical' || tool === 'pipe-water' || tool === 'pipe-drainage';
    if (!isPipe || !cursorMeter) return null;
    const network = tool.replace('pipe-', '');
    const color = NETWORK_COLORS[network] ?? '#888';
    if (!drawingSegment) {
      const cx = bx + mToPx(Math.max(0, Math.min(width, cursorMeter.x)), scale);
      const cy = by + mToPx(Math.max(0, Math.min(depth, cursorMeter.y)), scale);
      return <circle cx={cx} cy={cy} r={2} fill={color} opacity={0.6} pointerEvents="none" />;
    }
    const lastPt = drawingSegment.points[drawingSegment.points.length - 1];
    const snapped = snapPipePoint(lastPt, cursorMeter, tool);
    const clamped = { x: Math.max(0, Math.min(width, snapped.x)), y: Math.max(0, Math.min(depth, snapped.y)) };
    const allPts = [...drawingSegment.points, clamped];
    const pts = allPts.map(p => `${bx + mToPx(p.x, scale)},${by + mToPx(p.y, scale)}`).join(' ');
    const cx = bx + mToPx(clamped.x, scale);
    const cy = by + mToPx(clamped.y, scale);
    const segLen = Math.sqrt((clamped.x - lastPt.x) ** 2 + (clamped.y - lastPt.y) ** 2);
    return (
      <g pointerEvents="none" opacity={0.75}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4,2" />
        <circle cx={cx} cy={cy} r={2} fill={color} />
        <text x={cx + 4} y={cy - 3} fontSize={5} fill={color}>{segLen.toFixed(2)} m</text>
      </g>
    );
  };

  const renderDrawingPreview = () => {
    if (tool !== 'wall' || !drawingWall) return null;
    const sx = bx + mToPx(drawingWall.x, scale);
    const sy = by + mToPx(drawingWall.y, scale);
    const startCircle = (
      <circle cx={sx} cy={sy} r={epRadius * 1.5}
        fill="#E8D5B7" stroke="#8B6914" strokeWidth={1.2} strokeDasharray="2,1" />
    );
    if (!cursorMeter) return startCircle;
    const snapped = getSnapPoint(cursorMeter, wallsOnFloor, width, depth, SNAP_THRESHOLD, showGrid ? 1 : 0);
    const cx2 = bx + mToPx(snapped.x, scale);
    const cy2 = by + mToPx(snapped.y, scale);
    const connectedWall = wallsOnFloor.find(w =>
      (Math.abs(w.x1 - drawingWall.x) < 0.01 && Math.abs(w.y1 - drawingWall.y) < 0.01) ||
      (Math.abs(w.x2 - drawingWall.x) < 0.01 && Math.abs(w.y2 - drawingWall.y) < 0.01)
    );
    let angleText;
    if (connectedWall) {
      const isStart = Math.abs(connectedWall.x1 - drawingWall.x) < 0.01 && Math.abs(connectedWall.y1 - drawingWall.y) < 0.01;
      const refAngle = isStart
        ? vectorAngleDeg(connectedWall.x1, connectedWall.y1, connectedWall.x2, connectedWall.y2)
        : vectorAngleDeg(connectedWall.x2, connectedWall.y2, connectedWall.x1, connectedWall.y1);
      const newAngle = vectorAngleDeg(drawingWall.x, drawingWall.y, snapped.x, snapped.y);
      let rel = normAngle(newAngle - refAngle);
      if (rel > 180) rel = 360 - rel;
      angleText = `${rel.toFixed(0)}°`;
    } else {
      angleText = `${normAngle(vectorAngleDeg(drawingWall.x, drawingWall.y, snapped.x, snapped.y)).toFixed(0)}°`;
    }
    return (
      <>
        {startCircle}
        <line data-testid="drawing-preview-line"
          x1={sx} y1={sy} x2={cx2} y2={cy2}
          stroke="#8B6914" strokeWidth={1} strokeDasharray="4,2" />
        {snapped.snapped && (
          <circle cx={cx2} cy={cy2} r={epRadius * 2} fill="none" stroke="#1E90FF" strokeWidth={1} />
        )}
        <g data-testid="drawing-angle-label">
          <rect x={cx2 + 4} y={cy2 - 9} width={24} height={12} rx={2}
            fill="rgba(255,255,255,0.9)" stroke="#8B6914" strokeWidth={0.5} />
          <text x={cx2 + 16} y={cy2 - 3} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#333">
            {angleText}
          </text>
        </g>
      </>
    );
  };

  const renderMeasureOverlay = () => {
    if (tool !== 'measure' || !measurePoint) return null;
    const m = computeMeasurements(measurePoint, wallsOnFloor, width, depth, wallThickness);
    const cx = bx + mToPx(measurePoint.x, scale);
    const cy = by + mToPx(measurePoint.y, scale);
    const lx = bx + mToPx(measurePoint.x - m.left, scale);
    const rx = bx + mToPx(measurePoint.x + m.right, scale);
    const ty = by + mToPx(measurePoint.y - m.top, scale);
    const by2 = by + mToPx(measurePoint.y + m.bottom, scale);

    const hmx = (lx + rx) / 2;
    const vmy = (ty + by2) / 2;

    const lineStyle = { stroke: '#4299E1', strokeWidth: 0.8, strokeDasharray: '3,2', pointerEvents: 'none' };
    const labelBg = 'rgba(255,255,255,0.85)';
    const labelColor = '#2563EB';
    const fs = 4.5;
    const pw = 18, ph = 7;

    const dimLabel = (x, y, text, offsetX = 0, offsetY = -5) => (
      <g pointerEvents="none">
        <rect x={x + offsetX - pw / 2} y={y + offsetY - ph / 2} width={pw} height={ph} rx={1} fill={labelBg} stroke={labelColor} strokeWidth={0.3} />
        <text x={x + offsetX} y={y + offsetY} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fill={labelColor}>{text}</text>
      </g>
    );

    const totalH = (m.left + m.right).toFixed(2);
    const totalV = (m.top + m.bottom).toFixed(2);

    const containingRoom = detectedRooms.find(r => pointInPolygon(measurePoint, r.polygon));
    const displayArea = containingRoom ? containingRoom.area : m.area;

    return (
      <g pointerEvents="none">
        <line x1={lx} y1={cy} x2={rx} y2={cy} {...lineStyle} />
        <line x1={cx} y1={ty} x2={cx} y2={by2} {...lineStyle} />
        {dimLabel(hmx, cy, `${totalH} m`, 0, -5)}
        {dimLabel(cx, vmy, `${totalV} m`, 12, 0)}
        <rect x={cx + 3} y={cy + 3} width={28} height={8} rx={1.5} fill={labelBg} stroke={labelColor} strokeWidth={0.3} />
        <text x={cx + 17} y={cy + 7} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fill={labelColor}>
          {displayArea.toFixed(2)} m²
        </text>
      </g>
    );
  };

  // ── Facade (unchanged) ────────────────────────────────────────────────────
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

  let roofEl;
  if (roofType === 'plano') {
    roofEl = <rect data-testid="casa-roof" x={fx - 3} y={fby - roofH * fScaleY} width={fw + 6} height={roofH * fScaleY} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  } else if (roofType === 'shed') {
    roofEl = <polygon data-testid="casa-roof" points={`${fx-3},${fby} ${fx+fw+3},${fby} ${fx+fw+3},${PAD}`} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  } else {
    roofEl = <polygon data-testid="casa-roof" points={`${fx-3},${fby} ${fx+fw/2},${PAD} ${fx+fw+3},${fby}`} fill="#8B6914" stroke="#5C3317" strokeWidth={1} />;
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  const toolBtnClass = (t) =>
    `px-2 py-0.5 text-xs rounded border ${tool === t ? 'bg-amber-200 border-amber-500 text-amber-800 font-semibold' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'}`;

  const selectedNeDef = selectedNetworkElementId
    ? getNetworkElementDef(networkElements.find(ne => ne.id === selectedNetworkElementId)?.type)
    : null;

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
          {/* Tool selector */}
          <div className="flex gap-1 items-center flex-wrap">
            <span className="text-xs text-gray-500">Herramienta:</span>
            <button onClick={() => { setTool('wall'); setDrawingWall(null); setDrawingSegment(null); }} className={toolBtnClass('wall')} data-testid="tool-wall">Pared</button>
            <button onClick={() => { setTool('door'); setDrawingWall(null); setDrawingSegment(null); }} className={toolBtnClass('door')} data-testid="tool-door">Puerta</button>
            <button onClick={() => { setTool('window'); setDrawingWall(null); setDrawingSegment(null); }} className={toolBtnClass('window')} data-testid="tool-window">Ventana</button>
            <button onClick={() => { setTool('select'); setDrawingWall(null); setDrawingSegment(null); }} className={toolBtnClass('select')} data-testid="tool-select">Cuartos</button>
            <button onClick={() => { setTool('measure'); setDrawingWall(null); setDrawingSegment(null); setMeasurePoint(null); }} className={toolBtnClass('measure')} data-testid="tool-measure">Medir</button>
            <button
              onClick={() => { setShowNetworkPalette(v => !v); setDrawingWall(null); setDrawingSegment(null); }}
              className={`px-2 py-0.5 text-xs rounded border ${
                tool === 'place-network' || showNetworkPalette
                  ? 'bg-amber-200 border-amber-500 text-amber-800 font-semibold'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="tool-network-palette">
              Red
            </button>
            <span className="text-xs text-gray-400 mx-1">|</span>
            <span className="text-xs text-gray-500">Tuberia:</span>
            <button onClick={() => { setTool('pipe-electrical'); setDrawingWall(null); setDrawingSegment(null); }} className={toolBtnClass('pipe-electrical')} data-testid="tool-pipe-electrical">Electrica</button>
            <button onClick={() => { setTool('pipe-water'); setDrawingWall(null); setDrawingSegment(null); }} className={toolBtnClass('pipe-water')} data-testid="tool-pipe-water">Agua</button>
            <button onClick={() => { setTool('pipe-drainage'); setDrawingWall(null); setDrawingSegment(null); }} className={toolBtnClass('pipe-drainage')} data-testid="tool-pipe-drainage">Desague</button>
          </div>

          {tool === 'wall' && (
            <div data-testid="wall-thickness-control" className="flex items-center gap-1">
              <label className="text-xs text-gray-600">Grosor:</label>
              <input type="number" value={wallThickness}
                onChange={(e) => setWallThickness(parseFloat(e.target.value) || DEFAULT_WALL_THICKNESS)}
                step="0.05" min="0.05" max="0.5"
                className="w-14 px-1 py-0.5 text-xs border border-gray-300 rounded" />
              <span className="text-xs text-gray-400">m</span>
            </div>
          )}

          {tool === 'pipe-water' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Tipo:</span>
              <button onClick={() => setPipeSubtype('cold')}
                className={`px-2 py-0.5 text-xs rounded border ${pipeSubtype === 'cold' ? 'bg-blue-100 border-blue-400 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-600'}`}>
                Fria
              </button>
              <button onClick={() => setPipeSubtype('hot')}
                className={`px-2 py-0.5 text-xs rounded border ${pipeSubtype === 'hot' ? 'bg-red-100 border-red-400 text-red-700 font-semibold' : 'bg-white border-gray-300 text-gray-600'}`}>
                Caliente
              </button>
            </div>
          )}

          <span className="text-xs text-gray-400">
            {tool === 'wall'           && 'Clic: nueva pared · Clic en pared: borrar · Drag: mover'}
            {tool === 'door'           && 'Clic sobre pared: colocar puerta · Clic en puerta: borrar'}
            {tool === 'window'         && 'Clic sobre pared: colocar ventana · Clic en ventana: borrar'}
            {tool === 'select'         && 'Clic en cuarto: asignar tipo · Clic en elemento/tuberia: seleccionar · Delete: borrar'}
            {tool === 'measure'        && 'Mueve el cursor sobre el plano para medir · Esc: salir'}
            {tool === 'place-network'  && `Colocando: ${getNetworkElementDef(selectedNetworkType)?.label ?? ''} · R: rotar · Esc: cancelar`}
            {tool === 'pipe-electrical' && (drawingSegment ? `${drawingSegment.points.length} pts · Enter/doble clic: finalizar · Esc: cancelar` : 'Clic: iniciar conduit (snap 45°) · snaps ortogonal/diagonal')}
            {tool === 'pipe-water'      && (drawingSegment ? `${drawingSegment.points.length} pts · Enter/doble clic: finalizar · Esc: cancelar` : 'Clic: iniciar tuberia (snap 90°) · solo ortogonal')}
            {tool === 'pipe-drainage'   && (drawingSegment ? `${drawingSegment.points.length} pts · Enter/doble clic: finalizar · Esc: cancelar` : 'Clic: iniciar desague (snap 45°) · evitar 90°')}
          </span>

          <div className="flex gap-1 ml-auto flex-wrap">
            <button data-testid="grid-toggle" onClick={() => setShowGrid(v => !v)}
              className={`px-2 py-0.5 text-xs rounded border ${showGrid ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-white border-gray-300 text-gray-500'}`}>
              Cuadricula
            </button>
            <button data-testid="measurements-toggle" onClick={() => setShowMeasurements(v => !v)}
              className={`px-2 py-0.5 text-xs rounded border ${showMeasurements ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-500'}`}>
              Cotas
            </button>
            <button data-testid="rooms-toggle" onClick={() => setShowRooms(v => !v)}
              className={`px-2 py-0.5 text-xs rounded border ${showRooms ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-500'}`}>
              Zonas
            </button>
            <span className="text-xs text-gray-400">|</span>
            <button data-testid="validation-toggle" onClick={() => setShowValidation(v => !v)}
              className={`px-2 py-0.5 text-xs rounded border ${showValidation ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-gray-300 text-gray-500'}`}>
              Valid
            </button>
            <span className="text-xs text-gray-400">|</span>
            {['architectural', 'electrical', 'water', 'drainage'].map(key => {
              const colors = { architectural: 'bg-gray-100 border-gray-400 text-gray-700', electrical: 'bg-yellow-100 border-yellow-400 text-yellow-700', water: 'bg-blue-100 border-blue-400 text-blue-700', drainage: 'bg-green-100 border-green-400 text-green-700' };
              const labels = { architectural: 'Arq', electrical: 'Elec', water: 'Agua', drainage: 'Des' };
              const visible = layers[key]?.visible !== false;
              return (
                <button key={key}
                  data-testid={`layer-toggle-${key}`}
                  onClick={() => updateDetail(({ layers: l }) => ({ layers: { ...l, [key]: { visible: !l[key]?.visible } } }))}
                  className={`px-2 py-0.5 text-xs rounded border ${visible ? colors[key] : 'bg-white border-gray-300 text-gray-400 line-through'}`}>
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Network elements palette */}
      {editingEnabled && showNetworkPalette && (
        <div data-testid="network-palette" className="p-2 bg-white border border-gray-200 rounded text-xs space-y-2">
          {NETWORK_GROUPS.map(group => (
            <div key={group.key}>
              <div className="font-semibold mb-1" style={{ color: NETWORK_COLORS[group.key] }}>
                {group.label}
              </div>
              <div className="flex flex-wrap gap-1">
                {group.types.map(def => {
                  const isActive = tool === 'place-network' && selectedNetworkType === def.type;
                  return (
                    <button
                      key={def.type}
                      data-testid={`palette-${def.type}`}
                      onClick={() => {
                        setSelectedNetworkType(def.type);
                        setTool('place-network');
                        setDrawingWall(null);
                        setNetworkRotation(0);
                      }}
                      className={`px-2 py-1 rounded border text-xs flex items-center gap-1 ${
                        isActive
                          ? 'font-semibold'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                      style={isActive ? {
                        borderColor: NETWORK_COLORS[group.key],
                        background: NETWORK_COLORS[group.key] + '22',
                        color: NETWORK_COLORS[group.key],
                      } : {}}
                    >
                      <span style={{ color: NETWORK_COLORS[group.key], fontWeight: 700, minWidth: 20 }}>
                        {NET_ICON_CODES[def.type]}
                      </span>
                      {def.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Auto-generation buttons */}
          <div className="pt-1 border-t border-gray-100">
            <div className="font-semibold mb-1 text-gray-500">Auto-generar red</div>
            <div className="flex flex-wrap gap-1">
              <button data-testid="auto-gen-electrical" onClick={handleGenerateElectrical}
                className="px-2 py-1 rounded border text-xs"
                style={{ borderColor: NETWORK_COLORS.electrical, color: NETWORK_COLORS.electrical }}>
                Electrica
              </button>
              <button data-testid="auto-gen-water" onClick={handleGenerateWater}
                className="px-2 py-1 rounded border text-xs"
                style={{ borderColor: NETWORK_COLORS.water, color: NETWORK_COLORS.water }}>
                Agua
              </button>
              <button data-testid="auto-gen-drainage" onClick={handleGenerateDrainage}
                className="px-2 py-1 rounded border text-xs"
                style={{ borderColor: NETWORK_COLORS.drainage, color: NETWORK_COLORS.drainage }}>
                Desague
              </button>
              <button onClick={() => updateDetail(({ networkSegments: segs }) => ({ networkSegments: segs.filter(s => !s.id.startsWith('seg-')) }))}
                className="px-2 py-1 rounded border text-xs border-red-200 text-red-500 hover:bg-red-50 ml-auto">
                Limpiar red
              </button>
            </div>
            {algoWarnings.length > 0 && (
              <div className="mt-1 text-red-500 text-xs">{algoWarnings[0]}</div>
            )}
          </div>
        </div>
      )}

      {/* Room type editor */}
      {tool === 'select' && selectedRoom && (
        <div className="p-2 bg-white border border-gray-200 rounded text-xs space-y-1" data-testid="room-type-panel">
          <div className="font-semibold text-gray-700">
            Tipo de cuarto ({selectedRoom.area?.toFixed(1)} m2)
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(ROOM_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                onClick={() => handleRoomTypeChange(type)}
                className={`px-2 py-0.5 rounded border text-xs ${selectedRoom.type === type ? 'font-semibold border-opacity-100' : 'border-gray-300 text-gray-600'}`}
                style={selectedRoom.type === type ? {
                  background: ROOM_STYLES[type]?.fill ?? '#eee',
                  borderColor: ROOM_STYLES[type]?.stroke ?? '#999',
                  color: ROOM_STYLES[type]?.stroke ?? '#333',
                } : {}}
              >
                {label}
              </button>
            ))}
            {selectedRoom.type && (
              <button onClick={() => handleRoomTypeChange(undefined)} className="px-2 py-0.5 rounded border border-gray-300 text-gray-500 text-xs">
                Sin tipo
              </button>
            )}
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-gray-500">Nombre:</span>
            <input
              type="text"
              value={selectedRoom.label ?? ''}
              onChange={(e) => handleRoomLabelChange(e.target.value)}
              placeholder="ej. Dormitorio principal"
              className="flex-1 px-1 py-0.5 border border-gray-300 rounded text-xs"
            />
          </div>
        </div>
      )}

      {/* Selected segment info */}
      {tool === 'select' && selectedSegmentId && (() => {
        const seg = networkSegments.find(s => s.id === selectedSegmentId);
        if (!seg) return null;
        const color = seg.network === 'water' && seg.subtype === 'hot' ? '#EF4444' : NETWORK_COLORS[seg.network];
        const label = seg.network === 'water' ? (seg.subtype === 'hot' ? 'Agua caliente' : 'Agua fria') : seg.network === 'electrical' ? 'Conduit electrico' : 'Desague';
        return (
          <div className="p-2 bg-white border border-gray-200 rounded text-xs flex items-center gap-2" data-testid="segment-info">
            <span style={{ color, fontWeight: 700 }}>&#9135;</span>
            <span className="text-gray-700">{label} ({seg.points.length - 1} tramo{seg.points.length > 2 ? 's' : ''})</span>
            <button
              className="px-2 py-0.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={() => updateDetail(({ networkSegments: segs }) => ({ networkSegments: segs.map(s => s.id === selectedSegmentId ? { ...s, isExternal: !s.isExternal } : s) }))}>
              {seg.isExternal ? 'Interior' : 'Exterior'}
            </button>
            <button
              className="ml-auto px-2 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => { updateDetail(({ networkSegments: segs }) => ({ networkSegments: segs.filter(s => s.id !== selectedSegmentId) })); setSelectedSegmentId(null); }}>
              Borrar
            </button>
          </div>
        );
      })()}

      {/* Selected network element info */}
      {tool === 'select' && selectedNetworkElementId && selectedNeDef && (
        <div className="p-2 bg-white border border-gray-200 rounded text-xs flex items-center gap-2" data-testid="network-element-info">
          <span style={{ color: NETWORK_COLORS[selectedNeDef.network], fontWeight: 700 }}>
            {NET_ICON_CODES[selectedNeDef.type]}
          </span>
          <span className="text-gray-700">{selectedNeDef.label}</span>
          <button
            className="ml-auto px-2 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => {
              updateDetail(({ networkElements: nes }) => ({
                networkElements: nes.filter(ne => ne.id !== selectedNetworkElementId),
              }));
              setSelectedNetworkElementId(null);
            }}>
            Borrar
          </button>
        </div>
      )}

      {/* Validation results */}
      {showValidation && validationResults.length > 0 && (
        <div data-testid="validation-panel" className="p-2 bg-white border border-red-200 rounded text-xs space-y-0.5 max-h-28 overflow-y-auto">
          <div className="font-semibold text-red-700 mb-1">Validacion ({validationResults.length})</div>
          {validationResults.map(r => (
            <div key={r.id} className={`flex items-start gap-1 ${r.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
              <span className="mt-0.5">{r.severity === 'error' ? '●' : '◉'}</span>
              <span>{r.message}</span>
            </div>
          ))}
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
          className={`border-2 border-gray-300 rounded bg-amber-50 ${
            editingEnabled && tool === 'measure' ? 'cursor-crosshair' :
            editingEnabled && (tool === 'select' || tool === 'place-network') ? 'cursor-pointer' : editingEnabled ? 'cursor-crosshair' : ''
          }`}
          onClick={handleSvgClick}
          onDoubleClick={handleSvgDoubleClick}
        >
          <rect x={bx} y={by} width={bw} height={bh} fill="#E8D5B7" stroke="#8B6914" strokeWidth={1.5} />

          {editingEnabled && showGrid && (
            <SvgGrid bx={bx} by={by} bw={bw} bh={bh} scaleM={scale} stepM={0.5} majorStepM={1} />
          )}

          {mergedRooms.map(renderRoom)}

          {editingEnabled && tool === 'wall' && !drawingWall && wallsOnFloor.length === 0 && (
            <text x={bx + bw / 2} y={by + bh / 2} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="#AAA">
              Clic para anadir pared
            </text>
          )}

          {layers.architectural?.visible !== false && wallsOnFloor.map(renderWall)}
          {layers.architectural?.visible !== false && renderWallHighlight()}
          {renderNetworkSegments()}
          {renderNetworkElements()}
          {renderNetworkCursor()}
          {renderPipeCursor()}
          {labelsOnFloor.map(renderLabel)}
          {renderDrawingPreview()}
          {renderMeasureOverlay()}

          {showMeasurements && wallsOnFloor.map(wall => {
            const wx1 = bx + mToPx(wall.x1, scale);
            const wy1 = by + mToPx(wall.y1, scale);
            const wx2 = bx + mToPx(wall.x2, scale);
            const wy2 = by + mToPx(wall.y2, scale);
            const mx = (wx1 + wx2) / 2;
            const my = (wy1 + wy2) / 2;
            const angle = Math.atan2(wy2 - wy1, wx2 - wx1);
            const offX = -Math.sin(angle) * 7;
            const offY = Math.cos(angle) * 7;
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

          <text x={bx + bw / 2} y={by - 6} textAnchor="middle" fontSize="9" fill="#555">{width} m</text>
          <text x={bx + bw + 6} y={by + bh / 2} textAnchor="start" fontSize="9" fill="#555" dominantBaseline="middle">{depth} m</text>

          <SvgScaleBar x={bx} y={by + bh + 10} scaleM={scale} lengthM={Math.min(5, Math.floor(width / 2))} />
        </svg>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Fachada</p>
        <svg data-testid="casa-front-view" width="100%"
          viewBox={`0 0 ${VB_W} ${FRONT_H}`} preserveAspectRatio="xMidYMid meet"
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
