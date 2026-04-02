/**
 * Utilities for path (sendero/camino) elements.
 * A path is an ordered list of points (in meters) with a width (in meters).
 */

let _idCounter = 0;

/**
 * Creates a new path starting at the given point.
 * @param {{ x: number, y: number }} startPoint - in meters
 * @param {number} width - path width in meters (default 1)
 * @param {string} label - display label (default 'Camino')
 * @returns {Path}
 */
export const createPath = (startPoint, width = 1, label = 'Camino') => ({
  id: `path_${Date.now()}_${++_idCounter}`,
  points: [{ ...startPoint }],
  width,
  label,
  finished: false,
  color: '#D4A96A',
  borderColor: '#8B6914',
});

/**
 * Returns a new path with the given point appended.
 * If the path is already finished, returns it unchanged.
 * @param {Path} path
 * @param {{ x: number, y: number }} point - in meters
 * @returns {Path}
 */
export const addPointToPath = (path, point) => {
  if (path.finished) return path;
  return { ...path, points: [...path.points, { ...point }] };
};

/**
 * Returns a new path marked as finished.
 * @param {Path} path
 * @returns {Path}
 */
export const finishPath = (path) => ({ ...path, finished: true });

/**
 * Returns the length of each segment (in meters).
 * @param {Path} path
 * @returns {number[]}
 */
export const pathSegmentLengths = (path) => {
  const { points } = path;
  const lengths = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lengths.push(Math.sqrt(dx * dx + dy * dy));
  }
  return lengths;
};

/**
 * Returns the total length of the path (in meters).
 * @param {Path} path
 * @returns {number}
 */
export const pathTotalLength = (path) =>
  pathSegmentLengths(path).reduce((sum, l) => sum + l, 0);

/**
 * A path is valid if it is finished and has at least 2 points.
 * @param {Path} path
 * @returns {boolean}
 */
export const isPathValid = (path) => path.finished && path.points.length >= 2;
