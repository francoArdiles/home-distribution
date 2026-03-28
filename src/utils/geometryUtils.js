// Geometry utility functions for home-distribution project
// Implements shoelace formula for area, distance calculation for perimeter,
// and segment intersection detection for self-intersection validation

/**
 * Calculate the area of a polygon using the shoelace formula (Gauss's area formula)
 * @param {Array<{x: number, y: number>}} points - Array of points in order
 * @returns {number} Area in square units (same units as point coordinates)
 */
export const calculateArea = (points) => {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
};

/**
 * Calculate the perimeter of a polygon by summing distances between consecutive points
 * @param {Array<{x: number, y: number>}} points - Array of points in order
 * @returns {number} Perimeter in linear units (same units as point coordinates)
 */
export const calculatePerimeter = (points) => {
  if (points.length < 2) return 0;

  let perimeter = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  return perimeter;
};

/**
 * Determine the orientation of three points (p, q, r)
 * Returns: 0 -> colinear, 1 -> clockwise, 2 -> counterclockwise
 * @param {{x: number, y: number}} p - First point
 * @param {{x: number, y: number}} q - Second point
 * @param {{x: number, y: number}} r - Third point
 * @returns {number} Orientation value
 */
const orientation = (p, q, r) => {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (val === 0) return 0; // colinear
  return val > 0 ? 1 : 2; // clock or counterclock wise
};

/**
 * Check if point q lies on segment pr
 * @param {{x: number, y: number}} p - First point of segment
 * @param {{x: number, y: number}} q - Point to check
 * @param {{x: number, y: number}} r - Second point of segment
 * @returns {boolean} True if q lies on segment pr
 */
const onSegment = (p, q, r) => {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
         q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
};

/**
 * Check if two line segments intersect
 * @param {{p1: {x:number,y:number}, p2: {x:number,y<number>}}} seg1 - First segment
 * @param {{p1: {x:number,y<number>}, p2: {x:number,y<number>}}} seg2 - Second segment
 * @returns {boolean} True if segments intersect
 */
export const segmentsIntersect = (seg1, seg2) => {
  const o1 = orientation(seg1.p1, seg1.p2, seg2.p1);
  const o2 = orientation(seg1.p1, seg1.p2, seg2.p2);
  const o3 = orientation(seg2.p1, seg2.p2, seg1.p1);
  const o4 = orientation(seg2.p1, seg2.p2, seg1.p2);

  // General case
  if (o1 !== o2 && o3 !== o4) return true;

  // Special Cases
  if (o1 === 0 && onSegment(seg1.p1, seg2.p1, seg1.p2)) return true;
  if (o2 === 0 && onSegment(seg1.p1, seg2.p2, seg1.p2)) return true;
  if (o3 === 0 && onSegment(seg2.p1, seg1.p1, seg2.p2)) return true;
  if (o4 === 0 && onSegment(seg2.p1, seg1.p2, seg2.p2)) return true;

  return false;
};

/**
 * Check if adding a new point would cause self-intersection in the polygon
 * Excludes the last segment (which shares the new point's p1) from checking
 * @param {Array<{x: number, y: number>}} existingPoints - Current points in polygon
 * @param {{x: number, y: number}} newPoint - Point to check for addition
 * @returns {boolean} True if adding the point would cause self-intersection
 */
export const wouldCauseSelfIntersection = (existingPoints, newPoint) => {
  if (existingPoints.length < 2) return false;
  
  const newSegment = {
    p1: existingPoints[existingPoints.length - 1],
    p2: newPoint
  };
  
  // Check against all existing segments except the last one (which shares p1)
  for (let i = 0; i < existingPoints.length - 1; i++) {
    const seg = {
      p1: existingPoints[i],
      p2: existingPoints[i + 1]
    };
    if (segmentsIntersect(newSegment, seg)) {
      return true;
    }
  }
  
  return false;
};