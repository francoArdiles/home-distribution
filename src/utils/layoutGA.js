import { evaluateLayout } from './layoutFitness.js';
import { getTerrainBbox } from './layoutGeometry.js';
import { isPointInPolygon } from './collisionUtils.js';
import {
  mulberry32,
  randomInitialLayout,
  perturbedLayout,
} from './layoutSolver.js';
import { diversityDistance } from './layoutDiversity.js';

export const DEFAULT_GA_CONFIG = {
  populationSize: 32,
  generations: 80,
  tournamentSize: 2,
  eliteCount: 1,
  perGeneMutationRate: 0.25,
  teleportRate: 0.05,
  rotateRate: 0.05,
  swapRate: 0.08,
  immigrantRate: 0.15,
  crossoverRate: 0.9,
  stagnationLimit: 8,
  hypermutationBoost: 3,
  maxTimeMs: 5000,
  seed: 42,
  traceEvery: 5,
  finalistCount: 6,
  finalistMinDiversity: 2,
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const gauss = (rng) => {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const samplePointInPolygon = (terrainMeters, rng, maxTries = 40) => {
  const bbox = getTerrainBbox(terrainMeters);
  for (let i = 0; i < maxTries; i++) {
    const x = bbox.minX + rng() * bbox.w;
    const y = bbox.minY + rng() * bbox.h;
    if (isPointInPolygon({ x, y }, terrainMeters)) return { x, y };
  }
  return { x: bbox.minX + bbox.w * 0.5, y: bbox.minY + bbox.h * 0.5 };
};

// Uniform crossover: for each non-locked element, pick coords from A or B at 50/50.
const uniformCrossover = (parentA, parentB, rng) => {
  const elements = parentA.elements.map((elA, i) => {
    const elB = parentB.elements[i];
    if (elA.locked) return { ...elA };
    return rng() < 0.5 ? { ...elA } : { ...elB };
  });
  return { elements };
};

// Spatial line-split crossover: pick a direction and threshold,
// elements on one side come from parent A, the rest from B.
const lineSplitCrossover = (parentA, parentB, rng) => {
  const angle = rng() * Math.PI;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const projections = parentA.elements.map(el => cos * el.x + sin * el.y);
  const sorted = projections.slice().sort((a, b) => a - b);
  const lo = sorted[0] ?? 0;
  const hi = sorted[sorted.length - 1] ?? 0;
  const threshold = lo + rng() * (hi - lo);
  const elements = parentA.elements.map((elA, i) => {
    const elB = parentB.elements[i];
    if (elA.locked) return { ...elA };
    const side = projections[i] < threshold;
    return { ...(side ? elA : elB) };
  });
  return { elements };
};

// Multi-gene mutation: each non-locked element mutates independently.
// Mixes gaussian jitter, polygon-bounded teleport, and rotation flips.
const mutateLayout = (layout, terrainMeters, rng, cfg, strength = 1) => {
  const bbox = getTerrainBbox(terrainMeters);
  const diag = Math.sqrt(bbox.w * bbox.w + bbox.h * bbox.h);
  const sigma = diag * 0.12 * strength;
  const elements = layout.elements.map(el => {
    if (el.locked) return el;
    const r = rng();
    if (r < cfg.teleportRate * strength) {
      const p = samplePointInPolygon(terrainMeters, rng);
      return { ...el, x: p.x, y: p.y };
    }
    if (r < cfg.perGeneMutationRate * strength) {
      let nx = el.x + gauss(rng) * sigma;
      let ny = el.y + gauss(rng) * sigma;
      nx = clamp(nx, bbox.minX, bbox.maxX);
      ny = clamp(ny, bbox.minY, bbox.maxY);
      if (!isPointInPolygon({ x: nx, y: ny }, terrainMeters)) {
        const p = samplePointInPolygon(terrainMeters, rng);
        nx = p.x; ny = p.y;
      }
      let rotation = el.rotation;
      if (el.shape !== 'circle' && rng() < cfg.rotateRate) {
        rotation = rotation === 90 ? 0 : 90;
      }
      return { ...el, x: nx, y: ny, rotation };
    }
    return el;
  });

  // Occasional swap of two non-locked elements (swaps their positions).
  if (rng() < cfg.swapRate * strength) {
    const movable = [];
    for (let i = 0; i < elements.length; i++) if (!elements[i].locked) movable.push(i);
    if (movable.length >= 2) {
      const i = movable[Math.floor(rng() * movable.length)];
      let j = movable[Math.floor(rng() * movable.length)];
      if (j === i) j = movable[(movable.indexOf(i) + 1) % movable.length];
      const a = elements[i], b = elements[j];
      elements[i] = { ...a, x: b.x, y: b.y };
      elements[j] = { ...b, x: a.x, y: a.y };
    }
  }

  return { elements };
};

// Rank-based tournament: each individual compared by its fitness rank
// (0 = best, N-1 = worst) rather than raw score. Flattens the gradient
// when hard-constraint violations dominate the score.
const rankTournament = (ranks, rng, k) => {
  let bestIdx = Math.floor(rng() * ranks.length);
  for (let i = 1; i < k; i++) {
    const idx = Math.floor(rng() * ranks.length);
    if (ranks[idx] < ranks[bestIdx]) bestIdx = idx;
  }
  return bestIdx;
};

const computeRanks = (scores) => {
  const order = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(scores.length);
  for (let r = 0; r < order.length; r++) ranks[order[r][1]] = r;
  return ranks;
};

const initialPopulation = (elements, terrainMeters, rng, size) => {
  const pop = [];
  pop.push({ elements: elements.map(el => ({ ...el })) });
  const perturbedCount = Math.max(0, Math.floor((size - 1) * 0.3));
  for (let i = 0; i < perturbedCount; i++) {
    const sigma = 0.1 + 0.05 * i;
    pop.push(perturbedLayout(elements, terrainMeters, rng, sigma));
  }
  while (pop.length < size) {
    pop.push(randomInitialLayout(elements, terrainMeters, rng));
  }
  return pop;
};

export const solveGA = (initialLayout, context, config = DEFAULT_GA_CONFIG) => {
  const cfg = { ...DEFAULT_GA_CONFIG, ...config };
  const rng = mulberry32(cfg.seed);
  const { terrainMeters } = context;
  const startTime = nowMs();

  let population = initialPopulation(
    initialLayout.elements,
    terrainMeters,
    rng,
    cfg.populationSize,
  );
  let scores = population.map(ind => evaluateLayout(ind, context).total);

  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] < scores[bestIdx]) bestIdx = i;
  let best = population[bestIdx];
  let bestScore = scores[bestIdx];

  const trace = [];
  let gen = 0;
  let stoppedBy = 'generations';
  let stagnant = 0;
  let prevBest = bestScore;

  for (gen = 0; gen < cfg.generations; gen++) {
    if (bestScore < prevBest - 1e-9) {
      stagnant = 0;
      prevBest = bestScore;
    } else {
      stagnant++;
    }
    const hyper = stagnant >= cfg.stagnationLimit;
    const strength = hyper ? cfg.hypermutationBoost : 1;

    const ranks = computeRanks(scores);
    const order = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);

    // Rotating elite: keep top-eliteCount of THIS generation; no permanent hall of fame.
    const elites = [];
    for (let i = 0; i < cfg.eliteCount && i < order.length; i++) {
      elites.push({ elements: population[order[i][1]].elements.map(e => ({ ...e })) });
    }

    const nextPop = elites.slice();
    const immigrantCount = hyper
      ? Math.floor(cfg.populationSize * 0.5)
      : Math.floor(cfg.populationSize * cfg.immigrantRate);
    const offspringTarget = cfg.populationSize - immigrantCount;

    while (nextPop.length < offspringTarget) {
      const pa = rankTournament(ranks, rng, cfg.tournamentSize);
      const pb = rankTournament(ranks, rng, cfg.tournamentSize);
      const parentA = population[pa];
      const parentB = population[pb];
      let child;
      if (rng() < cfg.crossoverRate) {
        child = rng() < 0.5
          ? uniformCrossover(parentA, parentB, rng)
          : lineSplitCrossover(parentA, parentB, rng);
      } else {
        child = { elements: parentA.elements.map(e => ({ ...e })) };
      }
      child = mutateLayout(child, terrainMeters, rng, cfg, strength);
      nextPop.push(child);
    }
    while (nextPop.length < cfg.populationSize) {
      nextPop.push(randomInitialLayout(initialLayout.elements, terrainMeters, rng));
    }

    if (hyper) stagnant = 0;

    population = nextPop;
    scores = population.map(ind => evaluateLayout(ind, context).total);

    for (let i = 0; i < population.length; i++) {
      if (scores[i] < bestScore) { best = population[i]; bestScore = scores[i]; }
    }

    if (gen % cfg.traceEvery === 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      trace.push({ gen, best: bestScore, avg, hyper });
    }

    if (nowMs() - startTime > cfg.maxTimeMs) {
      stoppedBy = 'time';
      break;
    }
  }

  const ranked = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
  const finalists = [];
  for (const [s, idx] of ranked) {
    const cand = population[idx];
    const distinct = finalists.every(
      f => diversityDistance(cand, f.layout, terrainMeters) >= cfg.finalistMinDiversity,
    );
    if (finalists.length === 0 || distinct) {
      finalists.push({ layout: cand, score: s });
    }
    if (finalists.length >= cfg.finalistCount) break;
  }

  return { best, bestScore, generations: gen, trace, stoppedBy, finalists };
};
