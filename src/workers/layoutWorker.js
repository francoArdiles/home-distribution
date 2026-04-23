import { runMultiRun } from '../utils/layoutMultiRun.js';
import { generatePaths } from '../utils/pathGenerator.js';

self.onmessage = (e) => {
  const payload = e.data;
  try {
    const picks = runMultiRun({ ...payload, entrancePoint: payload.entrance ?? null }, (p) => {
      self.postMessage({ type: 'progress', ...p });
    });
    const results = picks.map(p => ({
      layout: p.layout,
      score: p.score,
      paths: generatePaths(p.layout, payload.terrainMeters, { entrance: payload.entrance ?? null }),
    }));
    self.postMessage({ type: 'done', proposals: results });
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message ?? String(err) });
  }
};
