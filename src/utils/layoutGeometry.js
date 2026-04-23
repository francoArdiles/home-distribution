import { isPointInPolygon } from './collisionUtils.js';

export const getTerrainBbox = (terrainMeters) => {
  const xs = terrainMeters.map(p => p.x);
  const ys = terrainMeters.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
};

export const terrainDiagonal = (terrainMeters) => {
  const { w, h } = getTerrainBbox(terrainMeters);
  return Math.sqrt(w * w + h * h);
};

// Effective bbox of an element given rotation (rect only; circles are rotation-invariant).
export const effectiveExtents = (el) => {
  if (el.shape === 'circle') {
    const r = el.radius || el.width / 2;
    return { w: r * 2, h: r * 2 };
  }
  if (el.rotation === 90) return { w: el.height, h: el.width };
  return { w: el.width, h: el.height };
};

export const elementArea = (el) => {
  if (el.shape === 'circle') {
    const r = el.radius || el.width / 2;
    return Math.PI * r * r;
  }
  return el.width * el.height;
};

// Axis-aligned rectangles overlap area assuming center-based (x,y).
const rectRectOverlapArea = (a, b) => {
  const extA = effectiveExtents(a);
  const extB = effectiveExtents(b);
  const ax1 = a.x - extA.w / 2, ax2 = a.x + extA.w / 2;
  const ay1 = a.y - extA.h / 2, ay2 = a.y + extA.h / 2;
  const bx1 = b.x - extB.w / 2, bx2 = b.x + extB.w / 2;
  const by1 = b.y - extB.h / 2, by2 = b.y + extB.h / 2;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  return ix * iy;
};

// Exact analytic formula for circle-circle overlap.
const circleCircleOverlapArea = (a, b) => {
  const ra = a.radius || a.width / 2;
  const rb = b.radius || b.width / 2;
  const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  if (d >= ra + rb) return 0;
  if (d <= Math.abs(ra - rb)) {
    const rMin = Math.min(ra, rb);
    return Math.PI * rMin * rMin;
  }
  const r2a = ra * ra, r2b = rb * rb;
  const alpha = Math.acos((d * d + r2a - r2b) / (2 * d * ra)) * 2;
  const beta = Math.acos((d * d + r2b - r2a) / (2 * d * rb)) * 2;
  return 0.5 * (r2a * (alpha - Math.sin(alpha)) + r2b * (beta - Math.sin(beta)));
};

// Approx rect-circle overlap via sampling (cheap, bounded error).
const rectCircleOverlapArea = (rect, circle) => {
  const ext = effectiveExtents(rect);
  const r = circle.radius || circle.width / 2;
  const N = 12;
  let hits = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const px = rect.x - ext.w / 2 + ext.w * (i + 0.5) / N;
      const py = rect.y - ext.h / 2 + ext.h * (j + 0.5) / N;
      const dx = px - circle.x;
      const dy = py - circle.y;
      if (dx * dx + dy * dy <= r * r) hits++;
    }
  }
  return (hits / (N * N)) * ext.w * ext.h;
};

export const overlapArea = (a, b) => {
  const aCirc = a.shape === 'circle';
  const bCirc = b.shape === 'circle';
  if (aCirc && bCirc) return circleCircleOverlapArea(a, b);
  if (aCirc) return rectCircleOverlapArea(b, a);
  if (bCirc) return rectCircleOverlapArea(a, b);
  return rectRectOverlapArea(a, b);
};

// Fraction of element area outside the terrain polygon, approximated by sampling.
export const outOfTerrainFraction = (el, terrainMeters) => {
  const ext = effectiveExtents(el);
  const N = 8;
  let total = 0;
  let outside = 0;
  if (el.shape === 'circle') {
    const r = el.radius || el.width / 2;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const dx = -r + 2 * r * (i + 0.5) / N;
        const dy = -r + 2 * r * (j + 0.5) / N;
        if (dx * dx + dy * dy > r * r) continue;
        total++;
        if (!isPointInPolygon({ x: el.x + dx, y: el.y + dy }, terrainMeters)) outside++;
      }
    }
  } else {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const px = el.x - ext.w / 2 + ext.w * (i + 0.5) / N;
        const py = el.y - ext.h / 2 + ext.h * (j + 0.5) / N;
        total++;
        if (!isPointInPolygon({ x: px, y: py }, terrainMeters)) outside++;
      }
    }
  }
  return total === 0 ? 0 : outside / total;
};
