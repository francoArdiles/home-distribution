import { getTerrainBbox } from './layoutGeometry.js';
import { isPointInPolygon } from './collisionUtils.js';

const gaussian = (rng) => {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const pickIndex = (rng, n) => Math.min(n - 1, Math.floor(rng() * n));

const isLocked = (el) => el?.locked === true;

const movableIndices = (elements) => {
  const out = [];
  for (let i = 0; i < elements.length; i++) if (!isLocked(elements[i])) out.push(i);
  return out;
};

const pickMovable = (rng, elements) => {
  const idxs = movableIndices(elements);
  if (idxs.length === 0) return -1;
  return idxs[pickIndex(rng, idxs.length)];
};

export const jitter = (layout, { temperature, terrainMeters, rng }) => {
  const { elements } = layout;
  if (elements.length === 0) return layout;
  const idx = pickMovable(rng, elements);
  if (idx < 0) return layout;
  const bbox = getTerrainBbox(terrainMeters);
  const diag = Math.sqrt(bbox.w * bbox.w + bbox.h * bbox.h);
  const sigma = temperature * diag / 4;
  const dx = gaussian(rng) * sigma;
  const dy = gaussian(rng) * sigma;
  const target = elements[idx];
  const next = {
    ...target,
    x: clamp(target.x + dx, bbox.minX, bbox.maxX),
    y: clamp(target.y + dy, bbox.minY, bbox.maxY),
  };
  return { ...layout, elements: elements.map((e, i) => (i === idx ? next : e)) };
};

export const swap = (layout, { rng }) => {
  const { elements } = layout;
  if (elements.length < 2) return layout;
  const movable = movableIndices(elements);
  if (movable.length < 2) return layout;
  const i = movable[pickIndex(rng, movable.length)];
  let j = movable[pickIndex(rng, movable.length)];
  if (j === i) j = movable[(movable.indexOf(i) + 1) % movable.length];
  const a = elements[i];
  const b = elements[j];
  const swapped = elements.map((e, k) => {
    if (k === i) return { ...a, x: b.x, y: b.y };
    if (k === j) return { ...b, x: a.x, y: a.y };
    return e;
  });
  return { ...layout, elements: swapped };
};

export const rotate = (layout, { rng }) => {
  const { elements } = layout;
  const rotatables = elements
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.shape !== 'circle' && !isLocked(e));
  if (rotatables.length === 0) return layout;
  const pick = rotatables[pickIndex(rng, rotatables.length)];
  const next = { ...pick.e, rotation: pick.e.rotation === 90 ? 0 : 90 };
  return { ...layout, elements: elements.map((e, i) => (i === pick.i ? next : e)) };
};

export const reseed = (layout, { terrainMeters, rng }) => {
  const { elements } = layout;
  if (elements.length === 0) return layout;
  const idx = pickMovable(rng, elements);
  if (idx < 0) return layout;
  const bbox = getTerrainBbox(terrainMeters);
  let nx, ny, ok = false;
  for (let t = 0; t < 20; t++) {
    nx = bbox.minX + rng() * bbox.w;
    ny = bbox.minY + rng() * bbox.h;
    if (isPointInPolygon({ x: nx, y: ny }, terrainMeters)) { ok = true; break; }
  }
  if (!ok) { nx = bbox.minX + bbox.w * 0.5; ny = bbox.minY + bbox.h * 0.5; }
  const target = elements[idx];
  const next = { ...target, x: nx, y: ny };
  return { ...layout, elements: elements.map((e, i) => (i === idx ? next : e)) };
};

export const randomOperator = (layout, ctx) => {
  const r = ctx.rng();
  if (r < 0.50) return jitter(layout, ctx);
  if (r < 0.70) return swap(layout, ctx);
  if (r < 0.85) return rotate(layout, ctx);
  return reseed(layout, ctx);
};
