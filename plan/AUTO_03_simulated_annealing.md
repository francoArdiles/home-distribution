# AUTO_03 — Motor Simulated Annealing

**Estado: Pending**
**Depende de: AUTO_02**

## Goal

Implementar un optimizador SA que, dado un layout inicial y un contexto (terreno + constraints), produzca un layout optimizado minimizando `evaluateLayout`.

## Archivo a crear

```
src/utils/layoutSolver.js
src/utils/__tests__/layoutSolver.test.js
```

## API

```js
export const DEFAULT_SA_CONFIG = {
  T0: 50,          // temperatura inicial
  alpha: 0.95,     // factor de enfriamiento por época
  itersPerT: 200,  // iteraciones por temperatura
  Tmin: 0.1,       // criterio de parada
  maxTimeMs: 5000, // corte por tiempo (default 5s)
  seed: 42,        // para rng determinista
};

export function solveSA(initialLayout, context, config = DEFAULT_SA_CONFIG): SolveResult;

type SolveResult = {
  best: Layout,
  bestScore: number,
  finalTemperature: number,
  iterations: number,
  trace: Array<{ iter: number, T: number, current: number, best: number }>,  // muestreado c/100 iter
  stoppedBy: 'Tmin' | 'time' | 'converged',
};
```

## Algoritmo

```
current = initialLayout
currentScore = evaluateLayout(current, context).total
best = current; bestScore = currentScore
T = T0
startTime = now()
iter = 0

while T > Tmin:
  for k in 0..itersPerT:
    candidate = randomOperator(current, { temperature: T / T0, terrainMeters, rng })
    candidateScore = evaluateLayout(candidate, context).total
    delta = candidateScore - currentScore
    if delta < 0 or rng() < exp(-delta / T):
      current = candidate
      currentScore = candidateScore
      if currentScore < bestScore:
        best = current
        bestScore = currentScore
    iter++
    if (iter % 100 == 0) push trace
    if (now() - startTime > maxTimeMs) return with stoppedBy='time'
  T = T * alpha

return with stoppedBy='Tmin'
```

## RNG determinista

`Math.random` no es seedable. Implementar Mulberry32 inline:

```js
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`config.seed` crea el rng pasado a operadores.

## Layout inicial

Helper separado para crear layout semilla desde un set de elementos:

```js
export function randomInitialLayout(elements, terrainMeters, rng): Layout;
// Ubica cada elemento en posición aleatoria dentro del bbox del terreno.
// rotation 0 por defecto. No resuelve conflictos (SA lo hará).
```

## Tests

```js
describe('solveSA', () => {
  test('retorna bestScore <= initialScore', ...);
  test('trace tiene entradas crecientes en iter', ...);
  test('determinista con mismo seed', ...);   // correr 2 veces, comparar best
  test('corta por maxTimeMs si T no llega a Tmin', () => {
    const result = solveSA(layout, ctx, { ...DEFAULT_SA_CONFIG, maxTimeMs: 50 });
    expect(result.stoppedBy).toBe('time');
  });
  test('layout inválido inicial (solapamientos) converge a uno mejor', ...);
  test('respeta maxTimeMs con 10ms (smoke)', ...);
});

describe('randomInitialLayout', () => {
  test('cada elemento dentro del bbox del terreno', ...);
  test('n elementos -> layout.elements.length === n', ...);
  test('con mismo rng produce mismo layout', ...);
});
```

## Notas

- `now()` = `performance.now()` si existe, fallback `Date.now()`.
- No usar setTimeout ni async: SA es sincrono. El worker de AUTO_06 lo ejecutará.
- Keep hot loop tight: nada de logs, nada de clonar objetos grandes.
- Para la clonación en operadores, structuredClone es caro; preferir spread manual.

## Criterio de completitud

- Mismo seed -> mismo resultado (reproducibilidad).
- Para un layout con violaciones hard, el score final < score inicial en >80% de runs.
- Tests verdes.
