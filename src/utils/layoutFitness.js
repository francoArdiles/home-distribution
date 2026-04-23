import { distanceElementToElement, distanceElementToTerrain, distanceElementToPoint, distancePointToPoint } from './distanceUtils.js';
import { isPointInPolygon } from './collisionUtils.js';
import {
  getTerrainBbox,
  terrainDiagonal,
  elementArea,
  overlapArea,
  outOfTerrainFraction,
} from './layoutGeometry.js';

export const DEFAULT_WEIGHTS = {
  violations: 1000,
  overlap: 1000,
  outOfTerrain: 1000,
  pathLength: 5,
  deadSpace: 3,
  orientation: 2,
  imbalance: 1,
};

// Wrap layout element as the shape expected by distanceUtils (rotation-aware extents).
const asDistanceShape = (el) => {
  if (el.shape === 'circle') {
    return { x: el.x, y: el.y, radius: el.radius || el.width / 2, shape: 'circle' };
  }
  const w = el.rotation === 90 ? el.height : el.width;
  const h = el.rotation === 90 ? el.width : el.height;
  return { x: el.x, y: el.y, width: w, height: h, shape: 'rectangle' };
};

// distanceElementToTerrain expects terrainPoints in layer pixels + baseScale.
// We pass baseScale=1 and terrainMeters directly (already meters).
const distToTerrainMeters = (el, terrainMeters) =>
  distanceElementToTerrain(asDistanceShape(el), terrainMeters, 1);

const distBetween = (a, b) => distanceElementToElement(asDistanceShape(a), asDistanceShape(b));

// Returns a non-normalized "violations magnitude" score:
//   per violated constraint: a fixed floor (so that count itself matters)
//   + normalized overshoot (so magnitude also matters).
// No division by constraint count (dilution) and no cap at 1 (gradient loss).
export const VIOLATION_FLOOR = 0.25;
export const penaltyMinMax = (layout, constraints, terrainMeters, entrancePoint = null) => {
  if (!constraints || constraints.length === 0) return 0;
  const diag = terrainDiagonal(terrainMeters) || 1;
  let score = 0;
  for (const c of constraints) {
    if (!c.enabled) continue;
    const source = layout.elements.find(e => e.id === c.sourceId);
    if (!source) continue;
    let actual;
    if (c.targetId === 'terrain') {
      actual = distToTerrainMeters(source, terrainMeters);
    } else if (c.targetId === 'entrance') {
      if (!entrancePoint) continue;
      actual = distanceElementToPoint(asDistanceShape(source), entrancePoint);
    } else if (c.targetId === 'any') {
      const others = layout.elements.filter(e => e.id !== c.sourceId);
      if (others.length === 0) continue;
      actual = Math.min(...others.map(o => distBetween(source, o)));
    } else {
      const target = layout.elements.find(e => e.id === c.targetId);
      if (!target) continue;
      actual = distBetween(source, target);
    }
    const overshoot = c.type === 'max-distance'
      ? Math.max(0, actual - c.value)
      : Math.max(0, c.value - actual);
    if (overshoot > 0) {
      score += VIOLATION_FLOOR + overshoot / diag;
    }
  }
  return score;
};

export const penaltyOverlap = (layout) => {
  const els = layout.elements;
  if (els.length < 2) return 0;
  let totalOverlap = 0;
  let totalArea = 0;
  for (const el of els) totalArea += elementArea(el);
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      totalOverlap += overlapArea(els[i], els[j]);
    }
  }
  if (totalArea === 0) return 0;
  return Math.min(1, totalOverlap / totalArea);
};

export const penaltyOutOfTerrain = (layout, terrainMeters) => {
  const els = layout.elements;
  if (els.length === 0) return 0;
  let outsideArea = 0;
  let totalArea = 0;
  for (const el of els) {
    const area = elementArea(el);
    totalArea += area;
    outsideArea += area * outOfTerrainFraction(el, terrainMeters);
  }
  if (totalArea === 0) return 0;
  return outsideArea / totalArea;
};

// Greedy Prim MST between element centers, normalized by terrain diagonal.
export const penaltyPathLength = (layout, terrainMeters) => {
  const els = layout.elements;
  if (els.length < 2) return 0;
  const diag = terrainDiagonal(terrainMeters) || 1;
  const n = els.length;
  const inTree = new Array(n).fill(false);
  const minEdge = new Array(n).fill(Infinity);
  minEdge[0] = 0;
  let totalLen = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) {
      if (!inTree[v] && (u === -1 || minEdge[v] < minEdge[u])) u = v;
    }
    inTree[u] = true;
    totalLen += minEdge[u];
    for (let v = 0; v < n; v++) {
      if (!inTree[v]) {
        const d = distancePointToPoint(els[u], els[v]);
        if (d < minEdge[v]) minEdge[v] = d;
      }
    }
  }
  return Math.min(1, totalLen / (diag * n));
};

// Cells of 1m inside terrain, count those not adjacent to occupied -> dead islands.
export const penaltyDeadSpace = (layout, terrainMeters) => {
  const bbox = getTerrainBbox(terrainMeters);
  const step = 1;
  const cols = Math.max(1, Math.ceil(bbox.w / step));
  const rows = Math.max(1, Math.ceil(bbox.h / step));
  if (cols * rows > 10000) return 0;  // too big to rasterize, skip
  const grid = new Uint8Array(cols * rows);  // 0=free, 1=occupied, 2=outside
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const px = bbox.minX + (i + 0.5) * step;
      const py = bbox.minY + (j + 0.5) * step;
      if (!isPointInPolygon({ x: px, y: py }, terrainMeters)) {
        grid[j * cols + i] = 2;
      }
    }
  }
  for (const el of layout.elements) {
    const w = el.rotation === 90 ? el.height : el.width;
    const h = el.rotation === 90 ? el.width : el.height;
    const i0 = Math.floor((el.x - w / 2 - bbox.minX) / step);
    const i1 = Math.ceil((el.x + w / 2 - bbox.minX) / step);
    const j0 = Math.floor((el.y - h / 2 - bbox.minY) / step);
    const j1 = Math.ceil((el.y + h / 2 - bbox.minY) / step);
    for (let j = Math.max(0, j0); j < Math.min(rows, j1); j++) {
      for (let i = Math.max(0, i0); i < Math.min(cols, i1); i++) {
        if (grid[j * cols + i] === 0) grid[j * cols + i] = 1;
      }
    }
  }
  let free = 0;
  let dead = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (grid[j * cols + i] !== 0) continue;
      free++;
      let freeNeighbors = 0;
      if (i > 0 && grid[j * cols + i - 1] === 0) freeNeighbors++;
      if (i < cols - 1 && grid[j * cols + i + 1] === 0) freeNeighbors++;
      if (j > 0 && grid[(j - 1) * cols + i] === 0) freeNeighbors++;
      if (j < rows - 1 && grid[(j + 1) * cols + i] === 0) freeNeighbors++;
      if (freeNeighbors < 4) dead++;
    }
  }
  return free === 0 ? 0 : dead / free;
};

// sunNeeds mismatch: project center of element vs ideal zone for sun type.
export const penaltyOrientation = (layout, terrainMeters) => {
  const bbox = getTerrainBbox(terrainMeters);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const diag = terrainDiagonal(terrainMeters) || 1;
  const relevant = layout.elements.filter(e => e.properties?.sunNeeds);
  if (relevant.length === 0) return 0;
  let total = 0;
  for (const el of relevant) {
    let target;
    if (el.properties.sunNeeds === 'full') target = { x: cx, y: bbox.minY + bbox.h * 0.25 };
    else if (el.properties.sunNeeds === 'partial') target = { x: cx, y: cy };
    else target = { x: cx, y: bbox.minY + bbox.h * 0.75 };
    const d = Math.sqrt((el.x - target.x) ** 2 + (el.y - target.y) ** 2);
    total += d / diag;
  }
  return Math.min(1, total / relevant.length);
};

export const penaltyImbalance = (layout, terrainMeters) => {
  const els = layout.elements;
  if (els.length === 0) return 0;
  const bbox = getTerrainBbox(terrainMeters);
  const tcx = (bbox.minX + bbox.maxX) / 2;
  const tcy = (bbox.minY + bbox.maxY) / 2;
  const diag = terrainDiagonal(terrainMeters) || 1;
  let sumA = 0, sumX = 0, sumY = 0;
  for (const el of els) {
    const a = elementArea(el);
    sumA += a;
    sumX += a * el.x;
    sumY += a * el.y;
  }
  if (sumA === 0) return 0;
  const ecx = sumX / sumA;
  const ecy = sumY / sumA;
  const d = Math.sqrt((ecx - tcx) ** 2 + (ecy - tcy) ** 2);
  return Math.min(1, d / diag);
};

export const evaluateLayout = (layout, context) => {
  const { terrainMeters, constraints = [], weights = DEFAULT_WEIGHTS, entrancePoint = null } = context;
  if (!layout.elements || layout.elements.length === 0) {
    return {
      total: 0,
      breakdown: { violations: 0, overlap: 0, outOfTerrain: 0, pathLength: 0, deadSpace: 0, orientation: 0, imbalance: 0 },
    };
  }
  const breakdown = {
    violations: penaltyMinMax(layout, constraints, terrainMeters, entrancePoint),
    overlap: penaltyOverlap(layout),
    outOfTerrain: penaltyOutOfTerrain(layout, terrainMeters),
    pathLength: penaltyPathLength(layout, terrainMeters),
    deadSpace: penaltyDeadSpace(layout, terrainMeters),
    orientation: penaltyOrientation(layout, terrainMeters),
    imbalance: penaltyImbalance(layout, terrainMeters),
  };
  const total =
    weights.violations * breakdown.violations +
    weights.overlap * breakdown.overlap +
    weights.outOfTerrain * breakdown.outOfTerrain +
    weights.pathLength * breakdown.pathLength +
    weights.deadSpace * breakdown.deadSpace +
    weights.orientation * breakdown.orientation +
    weights.imbalance * breakdown.imbalance;
  return { total, breakdown };
};
