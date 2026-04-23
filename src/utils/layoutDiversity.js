import { getTerrainBbox } from './layoutGeometry.js';

export const diversityDistance = (layoutA, layoutB, terrainMeters) => {
  const bbox = getTerrainBbox(terrainMeters);
  const diag2 = bbox.w * bbox.w + bbox.h * bbox.h;
  const a = layoutA.elements || [];
  const b = layoutB.elements || [];
  const ids = new Set([...a.map(e => e.id), ...b.map(e => e.id)]);
  if (ids.size === 0) return 0;
  const byIdA = new Map(a.map(e => [e.id, e]));
  const byIdB = new Map(b.map(e => [e.id, e]));
  let sum = 0;
  for (const id of ids) {
    const ea = byIdA.get(id);
    const eb = byIdB.get(id);
    if (ea && eb) {
      sum += (ea.x - eb.x) ** 2 + (ea.y - eb.y) ** 2;
    } else {
      sum += diag2;
    }
  }
  return Math.sqrt(sum / ids.size);
};
