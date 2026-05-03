import { solveSA, randomInitialLayout, perturbedLayout, mulberry32, DEFAULT_SA_CONFIG } from './layoutSolver.js';
import { solveGA, DEFAULT_GA_CONFIG } from './layoutGA.js';
import { diversityDistance } from './layoutDiversity.js';
import { evaluateLayout } from './layoutFitness.js';
import { compareLex } from './layoutRanking.js';

export const SUPPORTED_ALGORITHMS = ['sa', 'ga'];

const solverFor = (algorithm) => {
  if (algorithm === 'ga') return { solve: solveGA, defaults: DEFAULT_GA_CONFIG };
  return { solve: solveSA, defaults: DEFAULT_SA_CONFIG };
};

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
    algorithm = 'sa',
  } = payload;

  const { solve, defaults } = solverFor(algorithm);
  const context = { terrainMeters, constraints, weights, entrancePoint };
  const runs = [];
  // Seeding strategy: start from the user's (feasible) layout and perturb
  // with increasing sigma across runs. Fresh random starts fall into
  // hard-constraint violations that neither SA nor GA can escape within
  // the time budget, so they're useless for alternative-layout generation.
  const seedingFor = (i) => {
    if (i === 0) return 'verbatim';
    if (algorithm === 'ga' && i >= numRuns - 1) return 'random';
    if (algorithm === 'sa' && i >= numRuns - 2) return 'random';
    return 'perturbed';
  };
  for (let i = 0; i < numRuns; i++) {
    const seed = seedBase + i * 1009;
    const rng = mulberry32(seed);
    const mode = seedingFor(i);
    let initial;
    if (mode === 'verbatim') {
      initial = { elements: elements.map(el => ({ ...el })) };
    } else if (mode === 'perturbed') {
      const sigmaFraction = 0.08 + 0.08 * i;
      initial = perturbedLayout(elements, terrainMeters, rng, sigmaFraction);
    } else {
      initial = randomInitialLayout(elements, terrainMeters, rng);
    }
    const runConfig = { ...defaults, ...config, seed };
    const result = solve(initial, context, runConfig);
    const pushRun = (layout, scoreFallback) => {
      const ev = evaluateLayout(layout, context);
      runs.push({
        layout,
        score: ev.total ?? scoreFallback,
        softScore: ev.softScore,
        violationCount: ev.violationCount,
      });
    };
    if (Array.isArray(result.finalists) && result.finalists.length > 0) {
      for (const f of result.finalists) {
        if (f.violationCount != null && f.softScore != null) {
          runs.push({
            layout: f.layout,
            score: f.score,
            softScore: f.softScore,
            violationCount: f.violationCount,
          });
        } else {
          pushRun(f.layout, f.score);
        }
      }
    } else {
      pushRun(result.best, result.bestScore);
    }
    if (onProgress) {
      const bestSoFar = runs.reduce((m, r) => Math.min(m, r.score), Infinity);
      onProgress({ done: i + 1, total: numRuns, bestSoFar });
    }
  }

  const sorted = runs.slice().sort((a, b) => compareLex(a, b));
  if (sorted.length === 0) return [];
  // Prioritize feasibility: if any run has 0 violations, drop every infeasible run.
  // Among feasibles, apply the score-based threshold on softScore. If no feasible
  // exists, return only the best-by-violationCount candidates (no diversity filter).
  const minViolations = sorted[0].violationCount ?? 0;
  const feasibles = sorted.filter(p => (p.violationCount ?? 0) === minViolations);
  let filtered;
  if (minViolations > 0) {
    filtered = feasibles;
  } else {
    const best = feasibles[0].softScore ?? feasibles[0].score;
    const margin = Math.max(Math.abs(best) * Math.max(scoreFactor - 1, 0), 1);
    const threshold = best + margin;
    filtered = feasibles.filter(p => (p.softScore ?? p.score) <= threshold);
  }

  const picks = [];
  for (const cand of filtered) {
    const diverse = picks.every(p => diversityDistance(cand.layout, p.layout, terrainMeters) >= minDiversity);
    if (picks.length === 0 || diverse) picks.push(cand);
    if (picks.length >= maxPicks) break;
  }
  return picks;
};
