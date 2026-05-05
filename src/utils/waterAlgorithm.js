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

function manhattanRoute(p1, p2) {
  if (Math.abs(p1.x - p2.x) < 0.01 && Math.abs(p1.y - p2.y) < 0.01) return [p1, p2];
  if (Math.abs(p1.x - p2.x) < 0.01 || Math.abs(p1.y - p2.y) < 0.01) return [p1, p2];
  return [p1, { x: p2.x, y: p1.y }, p2];
}

function makeSegment(p1, p2, subtype, floor) {
  return {
    id: `seg-${generateId()}`,
    network: 'water',
    points: manhattanRoute(p1, p2),
    subtype, diameter: null, isExternal: false, floor,
  };
}

const COLD_ONLY = new Set(['wc', 'wc-drain']);
const BOTH_NETS = new Set(['shower-head', 'sink', 'washing-machine']);

// Returns { coldSegments, hotSegments, warnings }
export function generateWaterNetwork(detail, floor = 0) {
  const nes = (detail.networkElements ?? []).filter(ne => (ne.floor ?? 0) === floor);

  const waterEntry = nes.find(ne => ne.type === 'water-entry');
  if (!waterEntry) {
    return { coldSegments: [], hotSegments: [], warnings: ['Coloca una entrada de agua para generar la red.'] };
  }

  const boiler   = nes.find(ne => ne.type === 'boiler');
  const warnings = [];

  const coldFixtures = nes.filter(ne =>
    COLD_ONLY.has(ne.type) ||
    (ne.type === 'water-tap' && (ne.properties?.tempType ?? 'cold') !== 'hot')
  );
  const hotFixtures = nes.filter(ne =>
    ne.type === 'water-tap' && ne.properties?.tempType === 'hot'
  );
  const bothFixtures = nes.filter(ne => BOTH_NETS.has(ne.type));

  // Cold network: entry → cold fixtures + both-temperature fixtures
  const coldNodes = [waterEntry, ...coldFixtures, ...bothFixtures];
  const coldSegs  = primMST(coldNodes).map(([i, j]) => makeSegment(coldNodes[i], coldNodes[j], 'cold', floor));

  // Hot network: entry → boiler → hot + both-temperature fixtures
  const hotSegs = [];
  if (boiler) {
    // cold supply to boiler
    coldSegs.push(makeSegment(waterEntry, boiler, 'cold', floor));
    const hotNodes = [boiler, ...hotFixtures, ...bothFixtures];
    primMST(hotNodes).forEach(([i, j]) => hotSegs.push(makeSegment(hotNodes[i], hotNodes[j], 'hot', floor)));
  } else if (hotFixtures.length > 0 || bothFixtures.length > 0) {
    warnings.push('Sin calefon: los fixtures de agua caliente no seran conectados.');
  }

  return { coldSegments: coldSegs, hotSegments: hotSegs, warnings };
}
