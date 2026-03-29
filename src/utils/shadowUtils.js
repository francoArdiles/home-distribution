import { azimuthToVector } from './solarUtils.js';

/**
 * Calculate the length of a shadow cast by an element.
 * @param {number} elementHeight - height in meters
 * @param {number} elevation     - solar elevation in degrees (0 = horizon, 90 = zenith)
 * @returns {number} shadow length in meters, or Infinity when sun is at or below horizon
 */
export const getShadowLength = (elementHeight, elevation) => {
  if (elevation <= 0) return Infinity;
  const elevRad = (elevation * Math.PI) / 180;
  return elementHeight / Math.tan(elevRad);
};

/**
 * Direction that the shadow points toward (opposite to the sun).
 * @param {number} azimuth - solar azimuth in degrees (N=0, E=90, S=180, W=270)
 * @returns {number} shadow direction in degrees [0, 360)
 */
export const getShadowDirection = (azimuth) => ((azimuth + 180) % 360 + 360) % 360;

/**
 * Calculate the shadow polygon for a placed element.
 * Returns an array of {x, y} points (in meters) representing the shadow on the ground.
 * Returns empty array when the sun is at or below the horizon.
 *
 * @param {object} element - { x, y, width, height, radius, shape, elementHeight }
 *   x, y = center in meters; elementHeight = height of element in meters (default 3)
 * @param {number} elevation - solar elevation in degrees
 * @param {number} azimuth   - solar azimuth in degrees
 * @returns {Array<{x, y}>}
 */
export const getShadowPolygon = (element, elevation, azimuth) => {
  if (elevation <= 0) return [];

  const length = getShadowLength(element.elementHeight ?? 3, elevation);
  if (!isFinite(length)) return [];

  const shadowDir = getShadowDirection(azimuth);
  const vec = azimuthToVector(shadowDir); // unit vector pointing in shadow direction

  const dx = vec.x * length;
  const dy = vec.y * length;

  const { x, y, shape } = element;

  if (shape === 'circle') {
    const r = element.radius ?? element.width / 2;
    // Approximate circle shadow as a parallelogram-like polygon using key points
    // perpendicular to shadow direction
    const perpX = -vec.y;
    const perpY = vec.x;
    return [
      { x: x - perpX * r,        y: y - perpY * r },
      { x: x + perpX * r,        y: y + perpY * r },
      { x: x + perpX * r + dx,   y: y + perpY * r + dy },
      { x: x - perpX * r + dx,   y: y - perpY * r + dy },
    ];
  }

  // Rectangle: project all 4 corners in shadow direction
  const hw = element.width / 2;
  const hh = element.height / 2;
  const corners = [
    { x: x - hw, y: y - hh },
    { x: x + hw, y: y - hh },
    { x: x + hw, y: y + hh },
    { x: x - hw, y: y + hh },
  ];
  return corners.map(c => ({ x: c.x + dx, y: c.y + dy }));
};
