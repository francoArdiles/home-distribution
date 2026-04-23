# AUTO_06 — Diversificación multi-run + Web Worker

**Estado: Pending**
**Depende de: AUTO_03, AUTO_04, AUTO_05**

## Goal

(a) Generar múltiples propuestas diversas (hasta 5), (b) ejecutar el cómputo en un Web Worker para no bloquear la UI.

## Diversificación

### Estrategia

Correr N=8 SA con seeds distintas. De los 8 resultados:
1. Descartar los con `score > 2 * mejorScore`.
2. Ordenar por score ascendente.
3. Greedy pick: primer layout (mejor). Para cada siguiente candidato, aceptar solo si `diversityDistance(candidate, allPicked) >= 3m` (RMS).
4. Cortar a 5.

### Métrica de diversidad

```js
export function diversityDistance(layoutA, layoutB): number {
  // RMS de distancias entre elementos con mismo id
  // Elementos no pareados penalizan con diagonal_terreno.
  const pairs = layoutA.elements.map(a => {
    const b = layoutB.elements.find(e => e.id === a.id);
    return b ? ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) : diagonal² ;
  });
  return Math.sqrt(pairs.reduce((s, d) => s + d, 0) / pairs.length);
}
```

Nuevo archivo: `src/utils/layoutDiversity.js` + test.

## Web Worker

### Archivo: `src/workers/layoutWorker.js`

```js
import { solveSA, randomInitialLayout } from '../utils/layoutSolver.js';
import { generatePaths } from '../utils/pathGenerator.js';
import { diversityDistance } from '../utils/layoutDiversity.js';
import { validateAllConstraints } from '../utils/constraintUtils.js';

self.onmessage = (e) => {
  const { elements, terrainMeters, constraints, weights, numRuns = 8, maxPicks = 5, config } = e.data;
  const proposals = [];
  for (let i = 0; i < numRuns; i++) {
    const seed = 1000 + i;
    const rng = mulberry32(seed);  // o pasar seed a solveSA
    const initial = randomInitialLayout(elements, terrainMeters, rng);
    const result = solveSA(initial, { terrainMeters, constraints, weights }, { ...config, seed });
    proposals.push({ layout: result.best, score: result.bestScore });
    self.postMessage({ type: 'progress', done: i + 1, total: numRuns, bestSoFar: Math.min(...proposals.map(p => p.score)) });
  }
  // Diversificación
  const sorted = proposals.sort((a, b) => a.score - b.score);
  const best = sorted[0].score;
  const filtered = sorted.filter(p => p.score <= 2 * best);
  const picks = [];
  for (const candidate of filtered) {
    const isDiverse = picks.every(p => diversityDistance(candidate.layout, p.layout) >= 3);
    if (picks.length === 0 || isDiverse) picks.push(candidate);
    if (picks.length >= maxPicks) break;
  }
  const final = picks.map(p => ({
    layout: p.layout,
    score: p.score,
    paths: generatePaths(p.layout, terrainMeters),
  }));
  self.postMessage({ type: 'done', proposals: final });
};
```

Vite soporta Web Workers nativos con sintaxis `new Worker(new URL('./layoutWorker.js', import.meta.url), { type: 'module' })`.

### Hook: `src/hooks/useLayoutSolver.js`

```js
export function useLayoutSolver() {
  const workerRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const solve = useCallback((payload) => new Promise((resolve, reject) => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/layoutWorker.js', import.meta.url), { type: 'module' });
    }
    const w = workerRef.current;
    setIsRunning(true);
    setProgress({ done: 0, total: payload.numRuns ?? 8 });
    const onMsg = (e) => {
      if (e.data.type === 'progress') setProgress({ done: e.data.done, total: e.data.total });
      if (e.data.type === 'done') {
        w.removeEventListener('message', onMsg);
        setIsRunning(false);
        setProgress(null);
        resolve(e.data.proposals);
      }
    };
    w.addEventListener('message', onMsg);
    w.addEventListener('error', reject, { once: true });
    w.postMessage(payload);
  }), []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsRunning(false);
      setProgress(null);
    }
  }, []);

  useEffect(() => () => cancel(), [cancel]);
  return { solve, cancel, progress, isRunning };
}
```

## Integración con App.jsx

Reemplazar el SA sincrono de AUTO_05:

```js
const { solve, progress, isRunning, cancel } = useLayoutSolver();

const handleGenerateProposals = async () => {
  const context = { /* ... */ };
  const results = await solve({
    elements: placedElements,
    terrainMeters: context.terrainMeters,
    constraints: context.constraints,
    weights: DEFAULT_WEIGHTS,
    numRuns: 8,
    maxPicks: 5,
    config: { T0: 50, alpha: 0.95, itersPerT: 200, Tmin: 0.1, maxTimeMs: 5000 },
  });
  const proposals = results.map(r => ({
    id: generateId(),
    createdAt: Date.now(),
    score: r.score,
    elements: r.layout.elements,
    paths: r.paths,
    constraintReport: validateAllConstraints(context.constraints, r.layout.elements, points, baseScale),
  }));
  setProposals(proposals);
};
```

`ProposalsPanel` recibe `progress` y muestra barra (`done/total`).

## Tests

### `src/utils/__tests__/layoutDiversity.test.js`

```js
describe('diversityDistance', () => {
  test('layouts idénticos -> 0', ...);
  test('layouts con 1 elemento separado por 10m -> 10', ...);
  test('elementos no pareados usan diagonal como penalty', ...);
  test('simétrica: d(a,b) = d(b,a)', ...);
});
```

### Worker tests

Los Web Workers son difíciles de testear en jsdom. Dos opciones:
- Extraer la lógica del worker a `src/utils/layoutMultiRun.js` como función pura y testearla ahí. El worker es solo un wrapper.
- Smoke test del worker con `happy-dom` o mocking de `self.postMessage`.

**Preferencia: la primera.** Crear:

```js
// src/utils/layoutMultiRun.js
export function runMultiRun(payload, onProgress): Array<{ layout, score, paths }>;
```

Tests completos de diversificación ahí. Worker es `runMultiRun + postMessage`.

### `src/hooks/__tests__/useLayoutSolver.test.js`

Mockear Worker:

```js
global.Worker = class {
  constructor() { this.listeners = {}; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  postMessage(payload) {
    queueMicrotask(() => {
      this.listeners.message?.forEach(fn => fn({ data: { type: 'done', proposals: [] } }));
    });
  }
  terminate() {}
};

test('solve retorna la promesa con proposals del worker', ...);
test('cancel termina el worker', ...);
test('isRunning es true durante la ejecución', ...);
```

## Criterio de completitud

- 3+ propuestas distintas para un layout típico de 5 elementos.
- UI responsive durante generación (clicks, drags no bloqueados).
- Worker se termina al desmontar el componente.
- Cancel button funciona.
- Tests verdes.

## Notas de performance

- 8 runs x 5s = 40s total si secuencial. En worker es secuencial pero no bloquea UI; aceptable.
- Si se vuelve lento: considerar `itersPerT: 100` y `maxTimeMs: 2500` por run.
- Worker pool (múltiples workers paralelos) es overkill para esta app; descartado.
