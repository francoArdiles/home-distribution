import { isPointInPolygon } from './collisionUtils.js';
import { distancePointToSegment } from './distanceUtils.js';
import { getTerrainBbox, effectiveExtents, elementArea } from './layoutGeometry.js';

const DEFAULT_OPTIONS = {
  gridStep: 0.5,
  widths: { main: 1.2, shared: 0.8, branch: 0.5 },
  entrancePadding: 0.3,
  entrance: null,  // { x, y, width? } in meters: forces a route from hub to this point
  entranceWidthFactor: 0.75,
};

let _pathIdCounter = 0;

const pickHub = (elements, hubId) => {
  if (hubId) return elements.find(e => e.id === hubId);
  const casas = elements.filter(e => e.definitionId === 'casa');
  if (casas.length > 0) return casas.reduce((a, b) => (elementArea(a) >= elementArea(b) ? a : b));
  return elements.reduce((a, b) => (elementArea(a) >= elementArea(b) ? a : b));
};

const distToPolygonBorder = (pt, polygon) => {
  let min = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const d = distancePointToSegment(pt, a, b);
    if (d < min) min = d;
  }
  return min;
};

const buildGrid = (elements, terrainMeters, gridStep, borderMargin = 0) => {
  const bbox = getTerrainBbox(terrainMeters);
  const cols = Math.max(1, Math.ceil(bbox.w / gridStep));
  const rows = Math.max(1, Math.ceil(bbox.h / gridStep));
  const walkable = new Uint8Array(cols * rows);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const px = bbox.minX + (i + 0.5) * gridStep;
      const py = bbox.minY + (j + 0.5) * gridStep;
      const inside = isPointInPolygon({ x: px, y: py }, terrainMeters);
      if (!inside) continue;
      if (borderMargin > 0 && distToPolygonBorder({ x: px, y: py }, terrainMeters) < borderMargin) continue;
      walkable[j * cols + i] = 1;
    }
  }

  // Carve out elements (expanded by minSpacing/2).
  for (const el of elements) {
    const pad = ((el.properties?.minSpacing ?? 1) / 2);
    const ext = effectiveExtents(el);
    const w = ext.w + 2 * pad;
    const h = ext.h + 2 * pad;
    if (el.shape === 'circle') {
      const r = (el.radius || el.width / 2) + pad;
      const i0 = Math.max(0, Math.floor((el.x - r - bbox.minX) / gridStep));
      const i1 = Math.min(cols, Math.ceil((el.x + r - bbox.minX) / gridStep));
      const j0 = Math.max(0, Math.floor((el.y - r - bbox.minY) / gridStep));
      const j1 = Math.min(rows, Math.ceil((el.y + r - bbox.minY) / gridStep));
      for (let j = j0; j < j1; j++) {
        for (let i = i0; i < i1; i++) {
          const px = bbox.minX + (i + 0.5) * gridStep;
          const py = bbox.minY + (j + 0.5) * gridStep;
          if ((px - el.x) ** 2 + (py - el.y) ** 2 <= r * r) walkable[j * cols + i] = 0;
        }
      }
    } else {
      const i0 = Math.max(0, Math.floor((el.x - w / 2 - bbox.minX) / gridStep));
      const i1 = Math.min(cols, Math.ceil((el.x + w / 2 - bbox.minX) / gridStep));
      const j0 = Math.max(0, Math.floor((el.y - h / 2 - bbox.minY) / gridStep));
      const j1 = Math.min(rows, Math.ceil((el.y + h / 2 - bbox.minY) / gridStep));
      for (let j = j0; j < j1; j++) {
        for (let i = i0; i < i1; i++) walkable[j * cols + i] = 0;
      }
    }
  }

  return { walkable, cols, rows, bbox, gridStep };
};

const cellAt = (grid, x, y) => {
  const i = Math.floor((x - grid.bbox.minX) / grid.gridStep);
  const j = Math.floor((y - grid.bbox.minY) / grid.gridStep);
  return { i: Math.max(0, Math.min(grid.cols - 1, i)), j: Math.max(0, Math.min(grid.rows - 1, j)) };
};

const cellCenter = (grid, i, j) => ({
  x: grid.bbox.minX + (i + 0.5) * grid.gridStep,
  y: grid.bbox.minY + (j + 0.5) * grid.gridStep,
});

const nearestWalkable = (grid, cx, cy) => {
  const maxR = Math.max(grid.cols, grid.rows);
  for (let r = 0; r <= maxR; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = cx + di;
        const j = cy + dj;
        if (i < 0 || j < 0 || i >= grid.cols || j >= grid.rows) continue;
        if (grid.walkable[j * grid.cols + i]) return { i, j };
      }
    }
  }
  return null;
};

const entranceCell = (grid, el) => {
  const ext = effectiveExtents(el);
  const r = el.shape === 'circle' ? (el.radius || el.width / 2) : Math.max(ext.w, ext.h) / 2;
  const candidates = [
    { x: el.x + r + grid.gridStep, y: el.y },
    { x: el.x - r - grid.gridStep, y: el.y },
    { x: el.x, y: el.y + r + grid.gridStep },
    { x: el.x, y: el.y - r - grid.gridStep },
  ];
  for (const c of candidates) {
    const cell = cellAt(grid, c.x, c.y);
    if (grid.walkable[cell.j * grid.cols + cell.i]) return cell;
  }
  const center = cellAt(grid, el.x, el.y);
  return nearestWalkable(grid, center.i, center.j);
};

// Simple A* on 8-connected grid. Returns array of cells or null.
const astar = (grid, start, goal) => {
  if (!start || !goal) return null;
  const { cols, rows, walkable } = grid;
  const key = (i, j) => j * cols + i;
  const open = [{ i: start.i, j: start.j, f: 0, g: 0 }];
  const gScore = new Map([[key(start.i, start.j), 0]]);
  const came = new Map();
  const closed = new Uint8Array(cols * rows);

  const h = (i, j) => Math.hypot(i - goal.i, j - goal.j);
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  while (open.length > 0) {
    let minIdx = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[minIdx].f) minIdx = i;
    const cur = open.splice(minIdx, 1)[0];
    const k = key(cur.i, cur.j);
    if (closed[k]) continue;
    closed[k] = 1;
    if (cur.i === goal.i && cur.j === goal.j) {
      const path = [];
      let ck = k;
      let ci = cur.i, cj = cur.j;
      path.push({ i: ci, j: cj });
      while (came.has(ck)) {
        const prev = came.get(ck);
        path.push(prev);
        ck = key(prev.i, prev.j);
      }
      return path.reverse();
    }
    for (const [di, dj, cost] of dirs) {
      const ni = cur.i + di;
      const nj = cur.j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      if (!walkable[nj * cols + ni]) continue;
      if (closed[nj * cols + ni]) continue;
      const tentative = cur.g + cost;
      const nk = key(ni, nj);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentative);
        came.set(nk, { i: cur.i, j: cur.j });
        open.push({ i: ni, j: nj, g: tentative, f: tentative + h(ni, nj) });
      }
    }
  }
  return null;
};

const edgeKey = (a, b) => {
  const ak = a.j * 100000 + a.i;
  const bk = b.j * 100000 + b.i;
  return ak < bk ? `${ak}-${bk}` : `${bk}-${ak}`;
};

// Break list of edges (by traffic) into polylines via greedy walk.
const edgesToPolylines = (edges, widthFor, grid) => {
  // Bucket edges by width (different tracks become separate paths).
  const buckets = new Map();
  for (const [, info] of edges) {
    const w = widthFor(info);
    if (!buckets.has(w)) buckets.set(w, []);
    buckets.get(w).push({ a: info.a, b: info.b });
  }
  const polylines = [];
  for (const [w, list] of buckets) {
    // Build adjacency per bucket.
    const adj = new Map();
    const addAdj = (p, q) => {
      const k = `${p.i},${p.j}`;
      if (!adj.has(k)) adj.set(k, []);
      adj.get(k).push(q);
    };
    for (const { a, b } of list) { addAdj(a, b); addAdj(b, a); }
    const visited = new Set();
    const visitEdge = (a, b) => visited.add(edgeKey(a, b));
    const hasVisited = (a, b) => visited.has(edgeKey(a, b));
    for (const { a, b } of list) {
      if (hasVisited(a, b)) continue;
      // Walk from a along unvisited edges.
      const chain = [a, b];
      visitEdge(a, b);
      let tail = b;
      while (true) {
        const neigh = adj.get(`${tail.i},${tail.j}`) || [];
        const next = neigh.find(n => !hasVisited(tail, n));
        if (!next) break;
        visitEdge(tail, next);
        chain.push(next);
        tail = next;
      }
      polylines.push({ width: w, cells: chain });
    }
  }
  return polylines.map(pl => ({
    ...pl,
    points: simplifyPolyline(pl.cells.map(c => cellCenter(grid, c.i, c.j)), 0.25),
  }));
};

// Douglas-Peucker polyline simplification (epsilon in meters).
const simplifyPolyline = (points, eps) => {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop();
    let maxD = 0, idx = -1;
    const a = points[lo], b = points[hi];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    for (let i = lo + 1; i < hi; i++) {
      const p = points[i];
      const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
      const cx = a.x + t * dx, cy = a.y + t * dy;
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > 0) {
      keep[idx] = 1;
      stack.push([lo, idx], [idx, hi]);
    }
  }
  return points.filter((_, i) => keep[i]);
};

export const generatePaths = (layout, terrainMeters, options = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options, widths: { ...DEFAULT_OPTIONS.widths, ...(options.widths || {}) } };
  const elements = layout.elements || [];
  if (elements.length < 2) return [];

  const hub = pickHub(elements, opts.hubId);
  if (!hub) return [];

  const entranceWidth = opts.entrance && typeof opts.entrance.width === 'number'
    ? opts.entrance.width * opts.entranceWidthFactor
    : opts.widths.main;
  const maxWidth = Math.max(opts.widths.main, opts.widths.shared, opts.widths.branch, entranceWidth);
  const borderMargin = maxWidth / 2;

  const grid = buildGrid(elements, terrainMeters, opts.gridStep, borderMargin);
  const hubCell = entranceCell(grid, hub);
  if (!hubCell) return [];

  const edges = new Map();
  const recordRoute = (route) => {
    for (let i = 0; i + 1 < route.length; i++) {
      const a = route[i];
      const b = route[i + 1];
      const k = edgeKey(a, b);
      const existing = edges.get(k);
      if (existing) existing.traffic++;
      else edges.set(k, { traffic: 1, a, b, touchesHub: false });
    }
  };

  const pathModeOf = (el) => el.properties?.pathMode ?? 'hub';
  const clusterKeyOf = (el) => el.properties?.clusterId ?? `__auto_${el.definitionId}`;

  const markHubAdjacent = (route) => {
    const last = route[route.length - 1];
    const prev = route[route.length - 2];
    if (prev) {
      const info = edges.get(edgeKey(prev, last));
      if (info) info.touchesHub = true;
    }
  };

  // Partition elements (excluding hub): by routing mode.
  const hubMembers = [];
  const clusters = new Map(); // key -> [{el, entry}]
  for (const el of elements) {
    if (el.id === hub.id) continue;
    const mode = pathModeOf(el);
    if (mode === 'none') continue;
    const entry = entranceCell(grid, el);
    if (!entry) continue;
    if (mode === 'cluster') {
      const k = clusterKeyOf(el);
      if (!clusters.has(k)) clusters.set(k, []);
      clusters.get(k).push({ el, entry });
    } else {
      hubMembers.push({ el, entry });
    }
  }

  for (const { entry } of hubMembers) {
    const route = astar(grid, entry, hubCell);
    if (route && route.length > 0) {
      recordRoute(route);
      markHubAdjacent(route);
    }
  }

  // Clusters: MST internally, only the representative routes to hub.
  for (const members of clusters.values()) {
    if (members.length === 0) continue;
    if (members.length === 1) {
      const route = astar(grid, members[0].entry, hubCell);
      if (route && route.length > 0) { recordRoute(route); markHubAdjacent(route); }
      continue;
    }
    // Pairwise A* routes within cluster + to hub (to pick representative).
    const n = members.length;
    const toHub = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      toHub[i] = astar(grid, members[i].entry, hubCell);
    }
    let repIdx = -1;
    let repLen = Infinity;
    for (let i = 0; i < n; i++) {
      if (toHub[i] && toHub[i].length < repLen) { repLen = toHub[i].length; repIdx = i; }
    }
    if (repIdx < 0) continue;
    const repRoute = toHub[repIdx];
    recordRoute(repRoute);
    markHubAdjacent(repRoute);

    // Build MST over members using pairwise route lengths (Prim).
    const routes = Array.from({ length: n }, () => new Array(n).fill(null));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r = astar(grid, members[i].entry, members[j].entry);
        routes[i][j] = r;
        routes[j][i] = r;
      }
    }
    const inTree = new Array(n).fill(false);
    inTree[repIdx] = true;
    for (let step = 1; step < n; step++) {
      let bestI = -1, bestJ = -1, bestLen = Infinity;
      for (let i = 0; i < n; i++) {
        if (!inTree[i]) continue;
        for (let j = 0; j < n; j++) {
          if (inTree[j] || !routes[i][j]) continue;
          if (routes[i][j].length < bestLen) {
            bestLen = routes[i][j].length;
            bestI = i; bestJ = j;
          }
        }
      }
      if (bestJ < 0) break;
      recordRoute(routes[bestI][bestJ]);
      inTree[bestJ] = true;
    }
  }

  // Route from hub to terrain entrance (if provided).
  if (opts.entrance) {
    const entranceSnap = cellAt(grid, opts.entrance.x, opts.entrance.y);
    const entranceCellFree = grid.walkable[entranceSnap.j * grid.cols + entranceSnap.i]
      ? entranceSnap
      : nearestWalkable(grid, entranceSnap.i, entranceSnap.j);
    if (entranceCellFree) {
      const route = astar(grid, entranceCellFree, hubCell);
      if (route && route.length > 0) {
        recordRoute(route);
        for (let i = 0; i + 1 < route.length; i++) {
          const k = edgeKey(route[i], route[i + 1]);
          const info = edges.get(k);
          if (info) {
            info.traffic += 2;
            info.touchesHub = true;
            info.entranceWidth = entranceWidth;
          }
        }
      }
    }
  }

  const widthFor = (info) => {
    if (info.entranceWidth != null) return info.entranceWidth;
    if (info.touchesHub) return opts.widths.main;
    if (info.traffic >= 2) return opts.widths.shared;
    return opts.widths.branch;
  };

  const polylines = edgesToPolylines(edges, widthFor, grid);

  return polylines.map(pl => ({
    id: `autopath_${Date.now()}_${++_pathIdCounter}`,
    points: pl.points,
    width: pl.width,
    label: 'Camino auto',
    source: 'auto',
    finished: true,
    color: '#D4A96A',
    borderColor: '#8B6914',
  }));
};
