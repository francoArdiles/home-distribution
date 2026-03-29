import { isPointInPolygon } from './collisionUtils.js';

export const distancePointToPoint = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const distancePointToSegment = (point, segA, segB) => {
  const ab = { x: segB.x - segA.x, y: segB.y - segA.y };
  const ap = { x: point.x - segA.x, y: point.y - segA.y };
  const ab2 = ab.x * ab.x + ab.y * ab.y;
  if (ab2 === 0) return distancePointToPoint(point, segA);
  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / ab2));
  const closest = { x: segA.x + t * ab.x, y: segA.y + t * ab.y };
  return distancePointToPoint(point, closest);
};

export const distancePointToPolygon = (point, polygon) => {
  if (isPointInPolygon(point, polygon)) return 0;
  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const d = distancePointToSegment(point, a, b);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

// rect: { x, y, width, height } — x,y is CENTER in meters
export const distanceRectToRect = (rectA, rectB) => {
  const dx = Math.max(0, Math.abs(rectA.x - rectB.x) - (rectA.width + rectB.width) / 2);
  const dy = Math.max(0, Math.abs(rectA.y - rectB.y) - (rectA.height + rectB.height) / 2);
  return Math.sqrt(dx * dx + dy * dy);
};

// circ: { x, y, radius } — center in meters
export const distanceCircleToCircle = (circA, circB) => {
  const d = distancePointToPoint(circA, circB) - circA.radius - circB.radius;
  return Math.max(0, d);
};

// Distance from center of circle to nearest point on rect border, minus radius
export const distanceRectToCircle = (rect, circle) => {
  // rect: x,y = center; half extents
  const hw = rect.width / 2;
  const hh = rect.height / 2;
  const dx = Math.max(0, Math.abs(circle.x - rect.x) - hw);
  const dy = Math.max(0, Math.abs(circle.y - rect.y) - hh);
  const distToEdge = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, distToEdge - circle.radius);
};

export const distanceElementToElement = (elA, elB) => {
  const shapeA = elA.shape || 'rectangle';
  const shapeB = elB.shape || 'rectangle';
  if (shapeA === 'circle' && shapeB === 'circle') {
    return distanceCircleToCircle(
      { x: elA.x, y: elA.y, radius: elA.radius || elA.width / 2 },
      { x: elB.x, y: elB.y, radius: elB.radius || elB.width / 2 }
    );
  }
  if (shapeA === 'circle') {
    return distanceRectToCircle(elB, { x: elA.x, y: elA.y, radius: elA.radius || elA.width / 2 });
  }
  if (shapeB === 'circle') {
    return distanceRectToCircle(elA, { x: elB.x, y: elB.y, radius: elB.radius || elB.width / 2 });
  }
  return distanceRectToRect(elA, elB);
};

// Distance from a point to the polygon BOUNDARY (not 0 if inside)
const distancePointToPolygonBoundary = (point, polygon) => {
  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const d = distancePointToSegment(point, a, b);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

// terrainPoints are in layer pixels (meters × baseScale)
export const distanceElementToTerrain = (element, terrainPoints, baseScale) => {
  // Convert terrain to meters
  const terrainInMeters = terrainPoints.map(p => ({ x: p.x / baseScale, y: p.y / baseScale }));

  const shape = element.shape || 'rectangle';
  if (shape === 'circle') {
    const r = element.radius || element.width / 2;
    const distCenter = distancePointToPolygonBoundary({ x: element.x, y: element.y }, terrainInMeters);
    return Math.max(0, distCenter - r);
  }
  // Rectangle: min distance from any corner to the polygon boundary
  const hw = element.width / 2;
  const hh = element.height / 2;
  const corners = [
    { x: element.x - hw, y: element.y - hh },
    { x: element.x + hw, y: element.y - hh },
    { x: element.x + hw, y: element.y + hh },
    { x: element.x - hw, y: element.y + hh },
  ];
  let minDist = Infinity;
  for (const corner of corners) {
    const d = distancePointToPolygonBoundary(corner, terrainInMeters);
    if (d < minDist) minDist = d;
  }
  return minDist;
};
