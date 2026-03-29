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
 * Snaps a value to the nearest multiple of gridSize.
 */
export const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;
