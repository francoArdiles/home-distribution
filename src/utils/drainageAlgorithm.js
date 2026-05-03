function dist2D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function primMST(nodes) {
  if (nodes.length <= 1) return [];
  const inTree = new Set([0]);
  const edges = [];
  while (inTree.size < nodes.length) {
    let best = { d: Infinity, i: -1, j: -1 };
    for (const i of inTree) {
      for (let j = 0; j < nodes.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist2D(nodes[i], nodes[j]);
        if (d < best.d) best = { d, i, j };
      }
    }
    if (best.j === -1) break;
    inTree.add(best.j);
    edges.push([best.i, best.j]);
  }
  return edges;
}

// Routes p1→p2 using 45° diagonals then orthogonal, avoiding 90° elbows at joins.
function drainageRoute(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < 0.01 && ady < 0.01) return [p1, p2];
  if (adx < 0.01 || ady < 0.01) return [p1, p2]; // already orthogonal
  // Diagonal first, then straight
  if (adx >= ady) {
    const mid = { x: p1.x + (dx > 0 ? ady : -ady), y: p2.y };
    return [p1, mid, p2];
  } else {
    const mid = { x: p2.x, y: p1.y + (dy > 0 ? adx : -adx) };
    return [p1, mid, p2];
  }
}

function makeSegment(p1, p2, diameter, floor) {
  return {
    id: `seg-${generateId()}`,
    network: 'drainage',
    points: drainageRoute(p1, p2),
    subtype: null, diameter, isExternal: false, floor,
  };
}

const WC_TYPES    = new Set(['wc', 'wc-drain']);
const DRAIN_TYPES = new Set(['shower-head', 'sink', 'washing-machine', 'shower-drain', 'sink-drain', 'floor-drain', 'washing-drain', 'cleanout']);

// Returns { segments, autoCleanouts, warnings }
export function generateDrainageNetwork(detail, floor = 0) {
  const nes = (detail.networkElements ?? []).filter(ne => (ne.floor ?? 0) === floor);

  const drainExit = nes.find(ne => ne.type === 'drain-exit');
  if (!drainExit) {
    return { segments: [], autoCleanouts: [], warnings: ['Coloca una salida de desague para generar la red.'] };
  }

  const warnings = [];
  const segments  = [];

  const wcFixtures    = nes.filter(ne => WC_TYPES.has(ne.type));
  const otherFixtures = nes.filter(ne => DRAIN_TYPES.has(ne.type) || (ne.network === 'combined' && !WC_TYPES.has(ne.type)));

  // WC group: connect directly to drain exit at 100 mm
  const wcNodes = [drainExit, ...wcFixtures];
  primMST(wcNodes).forEach(([i, j]) => segments.push(makeSegment(wcNodes[i], wcNodes[j], 100, floor)));

  // Other fixtures: 50 mm, routed via collector to drain exit
  const otherNodes = [drainExit, ...otherFixtures];
  primMST(otherNodes).forEach(([i, j]) => segments.push(makeSegment(otherNodes[i], otherNodes[j], 50, floor)));

  return { segments, autoCleanouts: [], warnings };
}
