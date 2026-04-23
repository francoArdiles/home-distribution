import { evaluateLayout } from './layoutFitness.js';
import { randomOperator } from './layoutOperators.js';
import {
  mulberry32,
  randomInitialLayout,
  perturbedLayout,
} from './layoutSolver.js';

export const DEFAULT_GA_CONFIG = {
  populationSize: 24,
  generations: 60,
  tournamentSize: 3,
  eliteCount: 2,
  mutationRate: 0.3,
  crossoverRate: 0.9,
  maxTimeMs: 5000,
  seed: 42,
  traceEvery: 5,
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Spatial line-split crossover: pick a random direction and threshold,
// elements on one side come from parent A, the rest from B. Preserves
// locked positions (they are identical across all individuals).
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

const tournamentSelect = (pop, scores, k, rng) => {
  let bestIdx = Math.floor(rng() * pop.length);
  for (let i = 1; i < k; i++) {
    const idx = Math.floor(rng() * pop.length);
    if (scores[idx] < scores[bestIdx]) bestIdx = idx;
  }
  return pop[bestIdx];
};

const initialPopulation = (elements, terrainMeters, rng, size) => {
  const pop = [];
  pop.push({ elements: elements.map(el => ({ ...el })) });
  const perturbedCount = Math.max(0, Math.floor((size - 1) * 0.6));
  for (let i = 0; i < perturbedCount; i++) {
    const sigma = 0.05 + 0.03 * i;
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
  // Ensure the user's verbatim layout is index 0 (initialPopulation already does this,
  // but if caller provided a different initialLayout use that).
  population[0] = { elements: initialLayout.elements.map(el => ({ ...el })) };

  let scores = population.map(ind => evaluateLayout(ind, context).total);
  let best = population[0];
  let bestScore = scores[0];
  for (let i = 1; i < population.length; i++) {
    if (scores[i] < bestScore) { best = population[i]; bestScore = scores[i]; }
  }

  const trace = [];
  let gen = 0;
  let stoppedBy = 'generations';

  for (gen = 0; gen < cfg.generations; gen++) {
    const order = scores
      .map((s, i) => [s, i])
      .sort((a, b) => a[0] - b[0]);
    const elites = [];
    for (let i = 0; i < cfg.eliteCount && i < order.length; i++) {
      elites.push({ elements: population[order[i][1]].elements.map(e => ({ ...e })) });
    }

    const nextPop = elites.slice();
    while (nextPop.length < cfg.populationSize) {
      const parentA = tournamentSelect(population, scores, cfg.tournamentSize, rng);
      const parentB = tournamentSelect(population, scores, cfg.tournamentSize, rng);
      let child = rng() < cfg.crossoverRate
        ? lineSplitCrossover(parentA, parentB, rng)
        : { elements: parentA.elements.map(e => ({ ...e })) };
      if (rng() < cfg.mutationRate) {
        child = randomOperator(child, { temperature: 0.5, terrainMeters, rng });
      }
      nextPop.push(child);
    }

    population = nextPop;
    scores = population.map(ind => evaluateLayout(ind, context).total);

    for (let i = 0; i < population.length; i++) {
      if (scores[i] < bestScore) { best = population[i]; bestScore = scores[i]; }
    }

    if (gen % cfg.traceEvery === 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      trace.push({ gen, best: bestScore, avg });
    }

    if (nowMs() - startTime > cfg.maxTimeMs) {
      stoppedBy = 'time';
      break;
    }
  }

  return { best, bestScore, generations: gen, trace, stoppedBy };
};
