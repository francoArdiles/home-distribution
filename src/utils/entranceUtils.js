/**
 * Calculates the length of an edge in meters.
 * p1, p2 are in layer pixels; baseScale is pixels/meter.
 */
export const getEdgeLengthMeters = (p1, p2, baseScale) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy) / baseScale;
};

/**
 * Converts entrance {position (0–1), widthM (meters)} to gap t-parameters along the edge.
 * Returns { t1, t2 } clamped to [0, 1].
 */
export const entranceToT = (position, widthM, edgeLengthM) => {
  const halfT = (widthM / 2) / edgeLengthM;
  const t1 = Math.max(0, position - halfT);
  const t2 = Math.min(1, position + halfT);
  return { t1, t2 };
};

/**
 * Computes the gap start, end and center points along an edge.
 * p1, p2 in any coordinate space; t1, t2 from entranceToT.
 */
export const getEntranceGapPoints = (p1, p2, t1, t2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const tm = (t1 + t2) / 2;
  return {
    gapStart: { x: p1.x + t1 * dx, y: p1.y + t1 * dy },
    gapEnd:   { x: p1.x + t2 * dx, y: p1.y + t2 * dy },
    center:   { x: p1.x + tm * dx, y: p1.y + tm * dy },
  };
};

/**
 * Clamps entrance position so the gap fits entirely on the edge (doesn't exceed 0 or 1).
 */
export const clampEntrancePosition = (position, widthM, edgeLengthM) => {
  if (edgeLengthM <= 0) return 0.5;
  const halfT = (widthM / 2) / edgeLengthM;
  return Math.max(halfT, Math.min(1 - halfT, position));
};

/**
 * Projects point (px, py) onto segment p1→p2.
 * Returns the t parameter (0–1) of the closest point on the segment.
 */
export const projectPointOnEdge = (px, py, p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0;
  const t = ((px - p1.x) * dx + (py - p1.y) * dy) / len2;
  return Math.max(0, Math.min(1, t));
};
