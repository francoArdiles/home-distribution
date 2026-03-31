/**
 * Ray casting algorithm: checks if a point is inside a polygon.
 * @param {{x:number,y:number}} point - point in any coordinate space
 * @param {Array<{x:number,y:number}>} polygon - polygon vertices in same space
 */
export const isPointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Checks if a rectangle (in meters) is fully inside a polygon (in pixels).
 * rect: { x, y, width, height } — x,y is top-left corner in meters
 * polygon: vertices in pixels
 * baseScale: pixels per meter
 */
export const isRectangleInPolygon = (rect, polygon, baseScale) => {
  const { x, y, width, height } = rect;
  const corners = [
    { x: x * baseScale,           y: y * baseScale },
    { x: (x + width) * baseScale, y: y * baseScale },
    { x: (x + width) * baseScale, y: (y + height) * baseScale },
    { x: x * baseScale,           y: (y + height) * baseScale },
  ];
  return corners.every(corner => isPointInPolygon(corner, polygon));
};

/**
 * Checks if a circle (in meters) is fully inside a polygon (in pixels).
 * Approximates by checking center + 8 points on circumference.
 * circle: { x, y, radius } — center in meters
 */
export const isCircleInPolygon = (circle, polygon, baseScale) => {
  const cx = circle.x * baseScale;
  const cy = circle.y * baseScale;
  const r = circle.radius * baseScale;
  if (!isPointInPolygon({ x: cx, y: cy }, polygon)) return false;
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (!isPointInPolygon({ x: px, y: py }, polygon)) return false;
  }
  return true;
};

/**
 * Checks if a polygon element (with arbitrary position and rotation) is fully inside
 * a terrain polygon.
 * @param {Array<{x,y}>} defPoints - element polygon vertices in meters, relative to element center
 * @param {number} cx  - element center x in meters
 * @param {number} cy  - element center y in meters
 * @param {number} rotDeg - rotation in degrees
 * @param {Array<{x,y}>} terrainPolygon - terrain vertices in layer pixels
 * @param {number} baseScale - pixels per meter
 */
export const isPolygonElementInPolygon = (defPoints, cx, cy, rotDeg, terrainPolygon, baseScale) => {
  const rad = rotDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return defPoints.every(pt => {
    const rx = pt.x * cos - pt.y * sin;
    const ry = pt.x * sin + pt.y * cos;
    return isPointInPolygon(
      { x: (cx + rx) * baseScale, y: (cy + ry) * baseScale },
      terrainPolygon
    );
  });
};

/**
 * Snaps a value to the nearest multiple of gridSize.
 */
export const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;

/**
 * Returns true if two axis-aligned rectangles overlap.
 * Both rects: { x, y, width, height } where x,y is the CENTER in meters.
 */
export const doRectsOverlap = (a, b) => {
  const ax1 = a.x - a.width / 2, ax2 = a.x + a.width / 2;
  const ay1 = a.y - a.height / 2, ay2 = a.y + a.height / 2;
  const bx1 = b.x - b.width / 2, bx2 = b.x + b.width / 2;
  const by1 = b.y - b.height / 2, by2 = b.y + b.height / 2;
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
};

/**
 * Returns true if two circles overlap.
 * Both circles: { x, y, radius } in meters.
 */
export const doCirclesOverlap = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < (a.radius + b.radius);
};

/**
 * Returns true if a rectangle and a circle overlap.
 * rect: { x, y, width, height } — x,y is CENTER in meters.
 * circle: { x, y, radius } in meters.
 */
export const doRectCircleOverlap = (rect, circle) => {
  const nx = Math.abs(circle.x - rect.x);
  const ny = Math.abs(circle.y - rect.y);
  const hw = rect.width / 2;
  const hh = rect.height / 2;
  if (nx >= hw + circle.radius || ny >= hh + circle.radius) return false;
  if (nx <= hw || ny <= hh) return true;
  const cornerDx = nx - hw;
  const cornerDy = ny - hh;
  return cornerDx * cornerDx + cornerDy * cornerDy < circle.radius * circle.radius;
};

/**
 * Returns true if two elements overlap (any combination of rect/circle).
 * Elements must have { x, y, width, height, shape?, radius? } with x,y as CENTER in meters.
 */
export const doElementsOverlap = (a, b) => {
  const aIsCircle = a.shape === 'circle' || !!a.radius;
  const bIsCircle = b.shape === 'circle' || !!b.radius;
  const ar = a.radius || a.width / 2;
  const br = b.radius || b.width / 2;
  if (aIsCircle && bIsCircle) return doCirclesOverlap({ ...a, radius: ar }, { ...b, radius: br });
  if (aIsCircle) return doRectCircleOverlap(b, { ...a, radius: ar });
  if (bIsCircle) return doRectCircleOverlap(a, { ...b, radius: br });
  return doRectsOverlap(a, b);
};
