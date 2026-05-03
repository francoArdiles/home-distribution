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

function pointInPolygon(pt, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function makeSegment(p1, p2, floor) {
  return {
    id: `seg-${generateId()}`,
    network: 'electrical',
    points: manhattanRoute(p1, p2),
    subtype: null, diameter: null, isExternal: false, floor,
  };
}

// Returns { segments, autoBoxes, warnings }
export function generateElectricalNetwork(detail, floor = 0) {
  const nes  = (detail.networkElements ?? []).filter(ne => (ne.floor ?? 0) === floor);
  const rooms = detail.rooms ?? [];

  const mainPanel = nes.find(ne => ne.type === 'main-panel');
  if (!mainPanel) {
    return { segments: [], autoBoxes: [], warnings: ['Coloca un tablero principal para generar la red electrica.'] };
  }

  const warnings = [];
  const segments = [];
  const autoBoxes = [];

  const specials = nes.filter(ne => ne.type === 'outlet-special');
  const lights   = nes.filter(ne => ne.type === 'light-point' || ne.type === 'switch');
  const outlets  = nes.filter(ne => ne.type === 'outlet');
  const fixtures = [...lights, ...outlets];

  // Special outlets go directly to the panel (dedicated circuit)
  for (const sp of specials) {
    segments.push(makeSegment(mainPanel, sp, floor));
  }

  if (fixtures.length === 0) return { segments, autoBoxes, warnings };

  // Group fixtures by room
  const roomGroups = new Map();
  const unassigned = [];
  for (const el of fixtures) {
    let placed = false;
    for (const room of rooms) {
      if (room.polygon && pointInPolygon(el, room.polygon)) {
        if (!roomGroups.has(room.id)) roomGroups.set(room.id, { room, elements: [] });
        roomGroups.get(room.id).elements.push(el);
        placed = true;
        break;
      }
    }
    if (!placed) unassigned.push(el);
  }

  // Per-room junction box at centroid; connect elements respecting 3-output limit
  const jboxNodes = [mainPanel];
  for (const [, { room, elements }] of roomGroups) {
    const cx = room.centroid?.x ?? (elements.reduce((s, e) => s + e.x, 0) / elements.length);
    const cy = room.centroid?.y ?? (elements.reduce((s, e) => s + e.y, 0) / elements.length);
    const jbox = {
      id: `auto-jb-${generateId()}`,
      type: 'junction-box',
      x: cx, y: cy,
      rotation: 0, network: 'electrical', floor,
      properties: { maxOutputs: 3, auto: true },
    };
    autoBoxes.push(jbox);
    jboxNodes.push(jbox);

    let currentBox = jbox;
    let outputs = 0;
    for (const el of elements) {
      if (outputs >= 3) {
        const extraBox = {
          id: `auto-jb-${generateId()}`,
          type: 'junction-box',
          x: (currentBox.x + el.x) / 2, y: (currentBox.y + el.y) / 2,
          rotation: 0, network: 'electrical', floor,
          properties: { maxOutputs: 3, auto: true },
        };
        autoBoxes.push(extraBox);
        segments.push(makeSegment(currentBox, extraBox, floor));
        currentBox = extraBox;
        outputs = 0;
      }
      segments.push(makeSegment(currentBox, el, floor));
      outputs++;
    }
  }

  // Connect unassigned fixtures directly to panel
  for (const el of unassigned) {
    segments.push(makeSegment(mainPanel, el, floor));
  }

  // MST among jboxNodes (panel + all room junction boxes)
  const mstEdges = primMST(jboxNodes);
  for (const [i, j] of mstEdges) {
    segments.push(makeSegment(jboxNodes[i], jboxNodes[j], floor));
  }

  return { segments, autoBoxes, warnings };
}
