// ValidationResult = { id, severity: 'error'|'warning', message, elementId?, segmentId? }

const CONNECT_THRESHOLD = 0.5; // meters

function dist2D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function segmentAngleDeg(p1, p2) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
}

function angleDiff(a1, a2) {
  let d = Math.abs(((a2 - a1) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function isOrthogonal(p1, p2, tolerance = 5) {
  const ang = ((segmentAngleDeg(p1, p2) % 90) + 90) % 90;
  return ang <= tolerance || ang >= 90 - tolerance;
}

function buildGraph(nes, segs, network) {
  const nodes = nes.filter(ne => ne.network === network || ne.network === 'combined');
  const netSegs = segs.filter(s => s.network === network);
  const adj = new Map(nodes.map(ne => [ne.id, new Set()]));
  for (const seg of netSegs) {
    if (seg.points.length < 2) continue;
    const sp = seg.points[0];
    const ep = seg.points[seg.points.length - 1];
    const startEls = nodes.filter(n => dist2D(n, sp) <= CONNECT_THRESHOLD);
    const endEls   = nodes.filter(n => dist2D(n, ep) <= CONNECT_THRESHOLD);
    for (const s of startEls) {
      for (const e of endEls) {
        if (s.id !== e.id) {
          adj.get(s.id)?.add(e.id);
          adj.get(e.id)?.add(s.id);
        }
      }
    }
  }
  return { adj, nodes };
}

function reachableFrom(startId, adj) {
  const visited = new Set([startId]);
  const queue = [startId];
  while (queue.length) {
    const cur = queue.shift();
    for (const nb of (adj.get(cur) ?? [])) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
    }
  }
  return visited;
}

export function validateHouse(detail) {
  const results = [];
  const nes  = detail.networkElements  ?? [];
  const segs = detail.networkSegments  ?? [];
  const elecSegs = segs.filter(s => s.network === 'electrical');

  // ── Electrical ─────────────────────────────────────────────────────────────
  const mainPanel = nes.find(ne => ne.type === 'main-panel');
  const jboxes    = nes.filter(ne => ne.type === 'junction-box');

  for (const jb of jboxes) {
    const connections = elecSegs.filter(s => {
      const sp = s.points[0];
      const ep = s.points[s.points.length - 1];
      return dist2D(jb, sp) <= CONNECT_THRESHOLD || dist2D(jb, ep) <= CONNECT_THRESHOLD;
    }).length;
    if (connections > 4) { // 1 input + 3 outputs
      results.push({ id: `jb-${jb.id}`, elementId: jb.id, severity: 'error', message: 'Caja de conexion: mas de 3 salidas (norma SEC)' });
    }
  }

  if (mainPanel) {
    const { adj, nodes } = buildGraph(nes, segs, 'electrical');
    const reachable = reachableFrom(mainPanel.id, adj);
    for (const ne of nodes) {
      if (ne.type === 'main-panel') continue;
      if (!reachable.has(ne.id)) {
        results.push({ id: `el-nc-${ne.id}`, elementId: ne.id, severity: 'warning', message: 'Elemento electrico sin conexion al tablero' });
      }
    }
  }

  // ── Water ──────────────────────────────────────────────────────────────────
  const waterEntry = nes.find(ne => ne.type === 'water-entry');

  for (const seg of segs.filter(s => s.network === 'water')) {
    for (let i = 0; i < seg.points.length - 1; i++) {
      if (!isOrthogonal(seg.points[i], seg.points[i + 1])) {
        results.push({ id: `wd-${seg.id}-${i}`, segmentId: seg.id, severity: 'warning', message: 'Tuberia de agua diagonal (evitar; dificulta reparaciones)' });
        break;
      }
    }
  }

  if (waterEntry) {
    const { adj, nodes } = buildGraph(nes, segs, 'water');
    const reachable = reachableFrom(waterEntry.id, adj);
    for (const ne of nodes) {
      if (ne.type === 'water-entry') continue;
      if (!reachable.has(ne.id)) {
        results.push({ id: `wt-nc-${ne.id}`, elementId: ne.id, severity: 'warning', message: 'Fixture sin conexion a la entrada de agua' });
      }
    }
  }

  // ── Drainage ───────────────────────────────────────────────────────────────
  const drainExit = nes.find(ne => ne.type === 'drain-exit');

  for (const seg of segs.filter(s => s.network === 'drainage')) {
    for (let i = 1; i < seg.points.length - 1; i++) {
      const a1 = segmentAngleDeg(seg.points[i - 1], seg.points[i]);
      const a2 = segmentAngleDeg(seg.points[i], seg.points[i + 1]);
      if (Math.abs(angleDiff(a1, a2) - 90) < 10) {
        results.push({ id: `dr90-${seg.id}-${i}`, segmentId: seg.id, severity: 'error', message: 'Codo de 90 grados en desague (usar 45 grados, NCh 1360)' });
        break;
      }
    }
  }

  if (drainExit) {
    const { adj, nodes } = buildGraph(nes, segs, 'drainage');
    const reachable = reachableFrom(drainExit.id, adj);
    for (const ne of nodes) {
      if (ne.type === 'drain-exit') continue;
      if (!reachable.has(ne.id)) {
        results.push({ id: `dr-nc-${ne.id}`, elementId: ne.id, severity: 'warning', message: 'Fixture sin conexion a la salida de desague' });
      }
    }
  }

  return results;
}
