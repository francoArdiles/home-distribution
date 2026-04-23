import { solveSA, randomInitialLayout, perturbedLayout, mulberry32, DEFAULT_SA_CONFIG } from './layoutSolver.js';
import { diversityDistance } from './layoutDiversity.js';

export const runMultiRun = (payload, onProgress) => {
  const {
    elements,
    terrainMeters,
    constraints = [],
    weights,
    numRuns = 8,
    maxPicks = 5,
    minDiversity = 3,
    scoreFactor = 2,
    config = {},
    seedBase = 1000,
    entrancePoint = null,
  } = payload;

  const context = { terrainMeters, constraints, weights, entrancePoint };
  const runs = [];
  // Seeding strategy:
  //   run 0: user's layout verbatim (strong starting point),
  //   runs 1..numRuns-3: perturb user's layout with increasing sigma,
  //   last 2 runs: full random (diversification).
  const seedingFor = (i) => {
    if (i === 0) return 'verbatim';
    if (i >= numRuns - 2) return 'random';
    return 'perturbed';
  };
  for (let i = 0; i < numRuns; i++) {
    const seed = seedBase + i;
    const rng = mulberry32(seed);
    const mode = seedingFor(i);
    let initial;
    if (mode === 'verbatim') {
      initial = { elements: elements.map(el => ({ ...el })) };
    } else if (mode === 'perturbed') {
      const sigmaFraction = 0.05 + 0.03 * i;
      initial = perturbedLayout(elements, terrainMeters, rng, sigmaFraction);
    } else {
      initial = randomInitialLayout(elements, terrainMeters, rng);
    }
    const saConfig = { ...DEFAULT_SA_CONFIG, ...config, seed };
    const result = solveSA(initial, context, saConfig);
    runs.push({ layout: result.best, score: result.bestScore });
    if (onProgress) {
      const bestSoFar = runs.reduce((m, r) => Math.min(m, r.score), Infinity);
      onProgress({ done: i + 1, total: numRuns, bestSoFar });
    }
  }

  const sorted = runs.slice().sort((a, b) => a.score - b.score);
  if (sorted.length === 0) return [];
  const best = sorted[0].score;
  const threshold = best >= 0 ? best * scoreFactor : best / scoreFactor;
  const filtered = sorted.filter(p => p.score <= threshold);

  const picks = [];
  for (const cand of filtered) {
    const diverse = picks.every(p => diversityDistance(cand.layout, p.layout, terrainMeters) >= minDiversity);
    if (picks.length === 0 || diverse) picks.push(cand);
    if (picks.length >= maxPicks) break;
  }
  return picks;
};
