/**
 * Planar graph face traversal for detecting closed rooms from wall segments.
 *
 * Algorithm: half-edge DCEL traversal.
 * For each directed edge (u→v), the "next" edge in the left face is found by:
 *   at vertex v, sort outgoing edges CCW by angle, find u's position,
 *   then take the neighbor at (idx - 1 + degree) % degree.
 *
 * Interior faces (rooms) have positive shoelace area in screen coordinates
 * (y-down), because the traversal visits vertices CW in screen space.
 * The exterior face visits them CCW → negative area → filtered out.
 */

const shoelaceArea = (poly) => {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
};

const centroidOf = (poly) => {
  let cx = 0, cy = 0, area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-9) return { x: poly[0].x, y: poly[0].y };
  return { x: cx / (6 * area), y: cy / (6 * area) };
};

/**
 * Detects closed rooms from a list of wall segments on a given floor.
 *
 * @param {Array<{x1,y1,x2,y2,floor}>} walls
 * @param {number} floor - floor index to filter
 * @param {number} epsilon - distance below which two endpoints are merged (meters)
 * @returns {Array<{id, polygon, area, centroid}>}
 *   polygon: Point[] (meters), area: m², centroid: Point
 */
export const detectRooms = (walls, floor = 0, epsilon = 0.05) => {
  const floorWalls = walls.filter(w => (w.floor ?? 0) === floor);
  if (floorWalls.length < 2) return [];

  // --- Step 1: deduplicate endpoints into nodes ---
  const nodes = [];
  const getNodeIdx = (x, y) => {
    for (let i = 0; i < nodes.length; i++) {
      if (Math.abs(nodes[i].x - x) < epsilon && Math.abs(nodes[i].y - y) < epsilon) return i;
    }
    nodes.push({ x, y });
    return nodes.length - 1;
  };

  // --- Step 2: build adjacency lists ---
  // adj[i] = [{ to: nodeIdx, angle }] sorted CCW after Step 3
  const adj = [];
  const ensureAdj = (i) => { while (adj.length <= i) adj.push([]); };

  const addDirectedEdge = (from, to) => {
    ensureAdj(from);
    ensureAdj(to);
    // Avoid duplicate directed edges (e.g. two walls between same pair)
    if (adj[from].some(e => e.to === to)) return;
    const dx = nodes[to].x - nodes[from].x;
    const dy = nodes[to].y - nodes[from].y;
    adj[from].push({ to, angle: Math.atan2(dy, dx) });
  };

  for (const wall of floorWalls) {
    const a = getNodeIdx(wall.x1, wall.y1);
    const b = getNodeIdx(wall.x2, wall.y2);
    if (a === b) continue; // degenerate wall
    addDirectedEdge(a, b);
    addDirectedEdge(b, a);
  }

  // --- Step 3: sort each node's outgoing edges CCW ---
  for (const neighbors of adj) {
    neighbors.sort((a, b) => a.angle - b.angle);
  }

  // --- Step 4: half-edge face traversal ---
  const visited = new Set();
  const faces = [];

  for (let u = 0; u < adj.length; u++) {
    for (const { to: v } of adj[u]) {
      const startKey = `${u}:${v}`;
      if (visited.has(startKey)) continue;

      const polygon = [];
      let cu = u, cv = v;
      let iters = 0;

      while (true) {
        const key = `${cu}:${cv}`;
        if (visited.has(key)) break;
        visited.add(key);
        polygon.push({ ...nodes[cu] });

        const cvNeighbors = adj[cv];
        if (!cvNeighbors || cvNeighbors.length === 0) break;
        const idx = cvNeighbors.findIndex(n => n.to === cu);
        if (idx === -1) break;
        const prevIdx = (idx - 1 + cvNeighbors.length) % cvNeighbors.length;
        const nextV = cvNeighbors[prevIdx].to;
        [cu, cv] = [cv, nextV];

        if (cu === u && cv === v) break;
        if (++iters > 2000) break;
      }

      if (polygon.length >= 3) faces.push(polygon);
    }
  }

  // --- Step 5: keep only interior faces (positive shoelace in y-down coords) ---
  const MIN_AREA = 0.1; // m² — ignore tiny slivers
  return faces
    .map((polygon) => ({ polygon, area: shoelaceArea(polygon) }))
    .filter(({ area }) => area > MIN_AREA)
    .map(({ polygon, area }) => ({
      id: `detected-${polygon.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('|')}`,
      polygon,
      area: Math.abs(area),
      centroid: centroidOf(polygon),
    }));
};

/**
 * Merges geometrically detected rooms with user-stored room assignments.
 * For each detected room, finds the stored room whose centroid is closest
 * (within maxDist meters) and copies its type/label.
 *
 * @param {Array<{id, polygon, area, centroid}>} detected
 * @param {Array<{id, centroid, type, label}>} stored
 * @param {number} maxDist - max centroid distance to consider a match (meters)
 * @returns {Array<{id, polygon, area, centroid, type, label}>}
 */
export const mergeRoomAssignments = (detected, stored, maxDist = 2) => {
  return detected.map((room) => {
    let bestMatch = null;
    let bestDist = maxDist;
    for (const s of stored) {
      if (!s.centroid) continue;
      const dx = s.centroid.x - room.centroid.x;
      const dy = s.centroid.y - room.centroid.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; bestMatch = s; }
    }
    return {
      ...room,
      type: bestMatch?.type ?? undefined,
      label: bestMatch?.label ?? '',
    };
  });
};
