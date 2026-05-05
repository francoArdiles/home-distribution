import { distanceElementToElement, distanceElementToPoint } from './distanceUtils.js';
import { isPointInPolygon } from './collisionUtils.js';
import { getTerrainBbox } from './layoutGeometry.js';

const asDistanceShape = (el) => {
  if (el.shape === 'circle') {
    return { x: el.x, y: el.y, radius: el.radius || el.width / 2, shape: 'circle' };
  }
  const w = el.rotation === 90 ? el.height : el.width;
  const h = el.rotation === 90 ? el.width : el.height;
  return { x: el.x, y: el.y, width: w, height: h, shape: 'rectangle' };
};

const distBetween = (a, b) => distanceElementToElement(asDistanceShape(a), asDistanceShape(b));

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Move element along vector (dx,dy); clamp to bbox, revert if outside polygon.
const tryMove = (el, dx, dy, bbox, terrainMeters) => {
  const nx = clamp(el.x + dx, bbox.minX, bbox.maxX);
  const ny = clamp(el.y + dy, bbox.minY, bbox.maxY);
  if (!isPointInPolygon({ x: nx, y: ny }, terrainMeters)) return el;
  return { ...el, x: nx, y: ny };
};

// Returns the list of pairs (element-element) with their required min/max distance
// induced by enabled constraints (including 'any'-targeted ones).
const buildPairwiseConstraints = (elements, constraints) => {
  const pairs = [];
  const byId = new Map(elements.map(e => [e.id, e]));
  for (const c of constraints) {
    if (!c.enabled) continue;
    if (c.type !== 'min-distance' && c.type !== 'max-distance') continue;
    const src = byId.get(c.sourceId);
    if (!src) continue;
    if (c.targetId === 'any') {
      for (const other of elements) {
        if (other.id === c.sourceId) continue;
        pairs.push({ a: src, b: other, type: c.type, value: c.value });
      }
    } else if (c.targetId === 'terrain' || c.targetId === 'entrance') {
      // Handled separately in repairLayout.
    } else {
      const tgt = byId.get(c.targetId);
      if (!tgt) continue;
      pairs.push({ a: src, b: tgt, type: c.type, value: c.value });
    }
  }
  return pairs;
};

// Repair violations by pushing or pulling element pairs along their axis.
// Locked elements never move. Returns { layout, converged }.
export const repairLayout = (layout, context, maxIters = 10) => {
  const { terrainMeters, constraints = [], entrancePoint = null } = context;
  if (!constraints || constraints.length === 0) return { layout, converged: true };
  const bbox = getTerrainBbox(terrainMeters);

  let elements = layout.elements.map(el => ({ ...el }));

  for (let iter = 0; iter < maxIters; iter++) {
    const idxById = new Map(elements.map((e, i) => [e.id, i]));
    const pairs = buildPairwiseConstraints(elements, constraints);
    let fixedAny = false;
    let hasViolation = false;

    for (const p of pairs) {
      const ia = idxById.get(p.a.id);
      const ib = idxById.get(p.b.id);
      if (ia == null || ib == null) continue;
      const a = elements[ia];
      const b = elements[ib];
      const actual = distBetween(a, b);
      const violatesMin = p.type === 'min-distance' && actual < p.value;
      const violatesMax = p.type === 'max-distance' && actual > p.value;
      if (!violatesMin && !violatesMax) continue;
      hasViolation = true;
      if (a.locked && b.locked) continue;

      const dxC = b.x - a.x;
      const dyC = b.y - a.y;
      const dist = Math.sqrt(dxC * dxC + dyC * dyC) || 1;
      const ux = dxC / dist;
      const uy = dyC / dist;
      // delta: positive = separate; negative = pull together.
      const delta = violatesMin ? (p.value - actual + 0.05) : -(actual - p.value + 0.05);

      const bothFree = !a.locked && !b.locked;
      const shareA = bothFree ? 0.5 : (a.locked ? 0 : 1);
      const shareB = bothFree ? 0.5 : (b.locked ? 0 : 1);

      if (shareA > 0) {
        const na = tryMove(a, -ux * delta * shareA, -uy * delta * shareA, bbox, terrainMeters);
        if (na !== a) { elements[ia] = na; fixedAny = true; }
      }
      if (shareB > 0) {
        const nb = tryMove(b, ux * delta * shareB, uy * delta * shareB, bbox, terrainMeters);
        if (nb !== b) { elements[ib] = nb; fixedAny = true; }
      }
    }

    // Handle entrance-targeted constraints (min/max distance to a fixed point).
    for (const c of constraints) {
      if (!c.enabled) continue;
      if (c.type !== 'min-distance' && c.type !== 'max-distance') continue;
      if (c.targetId !== 'entrance' || !entrancePoint) continue;
      const i = idxById.get(c.sourceId);
      if (i == null) continue;
      const el = elements[i];
      if (el.locked) continue;
      const actual = distanceElementToPoint(asDistanceShape(el), entrancePoint);
      const violatesMin = c.type === 'min-distance' && actual < c.value;
      const violatesMax = c.type === 'max-distance' && actual > c.value;
      if (!violatesMin && !violatesMax) continue;
      hasViolation = true;
      const dx = el.x - entrancePoint.x;
      const dy = el.y - entrancePoint.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / d, uy = dy / d;
      const delta = violatesMin ? (c.value - actual + 0.05) : -(actual - c.value + 0.05);
      const ne = tryMove(el, ux * delta, uy * delta, bbox, terrainMeters);
      if (ne !== el) { elements[i] = ne; fixedAny = true; }
    }

    if (!hasViolation) return { layout: { elements }, converged: true };
    if (!fixedAny) return { layout: { elements }, converged: false };
  }

  return { layout: { elements }, converged: false };
};
