import { evaluateLayout } from './layoutFitness.js';
import { randomOperator } from './layoutOperators.js';
import { getTerrainBbox } from './layoutGeometry.js';
import { isPointInPolygon } from './collisionUtils.js';

const samplePointInPolygon = (terrainMeters, rng, maxTries = 40) => {
  const bbox = getTerrainBbox(terrainMeters);
  for (let i = 0; i < maxTries; i++) {
    const x = bbox.minX + rng() * bbox.w;
    const y = bbox.minY + rng() * bbox.h;
    if (isPointInPolygon({ x, y }, terrainMeters)) return { x, y };
  }
  return { x: bbox.minX + bbox.w * 0.5, y: bbox.minY + bbox.h * 0.5 };
};

export const samplePointInTerrain = samplePointInPolygon;

export const DEFAULT_SA_CONFIG = {
  T0: 50,
  alpha: 0.95,
  itersPerT: 200,
  Tmin: 0.1,
  maxTimeMs: 5000,
  seed: 42,
  traceEvery: 100,
};

export const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomInitialLayout = (elements, terrainMeters, rng) => {
  return {
    elements: elements.map(el => {
      if (el.locked) return { ...el };
      const p = samplePointInPolygon(terrainMeters, rng);
      return { ...el, x: p.x, y: p.y, rotation: el.rotation || 0 };
    }),
  };
};

// Perturb the user's layout: each non-locked element gets gaussian-ish jitter
// clamped to the terrain polygon. Keeps locked elements untouched.
export const perturbedLayout = (elements, terrainMeters, rng, sigmaFraction = 0.1) => {
  const bbox = getTerrainBbox(terrainMeters);
  const diag = Math.sqrt(bbox.w * bbox.w + bbox.h * bbox.h);
  const sigma = diag * sigmaFraction;
  const gauss = () => {
    const u1 = Math.max(rng(), Number.EPSILON);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  return {
    elements: elements.map(el => {
      if (el.locked) return { ...el };
      let nx = el.x + gauss() * sigma;
      let ny = el.y + gauss() * sigma;
      if (!isPointInPolygon({ x: nx, y: ny }, terrainMeters)) {
        const p = samplePointInPolygon(terrainMeters, rng);
        nx = p.x; ny = p.y;
      }
      return { ...el, x: nx, y: ny };
    }),
  };
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const solveSA = (initialLayout, context, config = DEFAULT_SA_CONFIG) => {
  const cfg = { ...DEFAULT_SA_CONFIG, ...config };
  const rng = mulberry32(cfg.seed);
  const { terrainMeters } = context;

  let current = initialLayout;
  let currentScore = evaluateLayout(current, context).total;
  let best = current;
  let bestScore = currentScore;

  let T = cfg.T0;
  const trace = [];
  let iter = 0;
  const startTime = nowMs();
  let stoppedBy = 'Tmin';

  outer: while (T > cfg.Tmin) {
    for (let k = 0; k < cfg.itersPerT; k++) {
      const candidate = randomOperator(current, {
        temperature: T / cfg.T0,
        terrainMeters,
        rng,
      });
      const candidateScore = evaluateLayout(candidate, context).total;
      const delta = candidateScore - currentScore;
      if (delta < 0 || rng() < Math.exp(-delta / T)) {
        current = candidate;
        currentScore = candidateScore;
        if (currentScore < bestScore) {
          best = current;
          bestScore = currentScore;
        }
      }
      iter++;
      if (iter % cfg.traceEvery === 0) {
        trace.push({ iter, T, current: currentScore, best: bestScore });
      }
      if (nowMs() - startTime > cfg.maxTimeMs) {
        stoppedBy = 'time';
        break outer;
      }
    }
    T *= cfg.alpha;
  }

  return { best, bestScore, finalTemperature: T, iterations: iter, trace, stoppedBy };
};
