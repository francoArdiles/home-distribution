# AUTO_07 — Más metaheurísticas (Memético, DE, CMA-ES)

Feature: ampliar el selector de algoritmo (`ProposalsPanel.jsx`) con tres nuevas opciones, aprovechando la abstracción `runMultiRun(payload.algorithm)` ya creada. El usuario avanzado elige la metaheurística; se incluye un preset **Auto** que decide según tamaño del problema.

## Contexto

Estado actual: `solveSA` y `solveGA` conviven tras `solverFor(algorithm)` en `src/utils/layoutMultiRun.js`. Ambos exponen la misma firma: `solve(initialLayout, context, config) -> { best, bestScore, ... }`. Cualquier algoritmo nuevo debe respetar esa firma y no mutar `initialLayout`.

Invariantes obligatorios (ya garantizados por `layoutOperators.js` y los samplers de `layoutSolver.js`):
- Elementos `locked: true` nunca cambian `x`, `y`, `rotation`.
- Muestras nuevas caen dentro del polígono del terreno (rejection sampling con caída al centro del bbox).

## Subunidades

| ID | Descripción | Estado |
|----|-------------|--------|
| AUTO_07_1 | Memético (GA + mini-SA como búsqueda local) | Pending |
| AUTO_07_2 | Differential Evolution | Pending |
| AUTO_07_3 | CMA-ES | Pending |
| AUTO_07_4 | Preset "Auto" + heurística de selección | Pending |

## AUTO_07_1 — Memético (GA + local search)

### Objetivo
Cada hijo tras crossover/mutación se refina con una mini-SA de pocas iteraciones antes de reinsertarse en la población. Debe ganarle a GA puro cuando el espacio tiene muchos óptimos locales cercanos.

### Diseño
- Nuevo archivo `src/utils/layoutMemetic.js` con `solveMemetic(initial, context, config)`.
- Reutiliza `lineSplitCrossover`, `tournamentSelect`, `initialPopulation` de `layoutGA.js` (exportarlos).
- Config:
  - `populationSize: 20` (menor que GA porque cada eval es más cara)
  - `generations: 40`
  - `localSearchIters: 150` (iteraciones de mini-SA por hijo)
  - `localSearchT: 5` (temperatura fija, baja)
  - `localSearchProb: 0.3` (no refinar todos los hijos; ahorra presupuesto)
- Mini-SA helper local: 150 iteraciones con `randomOperator`, aceptación Metropolis a temperatura fija. No reusar `solveSA` directamente (inicializa loops completos y es caro por el trace).
- Respetar `maxTimeMs` como corte duro igual que GA.

### Tests (`src/utils/__tests__/layoutMemetic.test.js`)
- Mejora (o iguala) score inicial en caso con 3 elementos y 2 restricciones min-distance.
- Locked element nunca se mueve.
- Stops by time con `maxTimeMs: 50`, `generations: 100000`.
- Determinista con seed fija.

### Integración
- `layoutMultiRun.js`: `SUPPORTED_ALGORITHMS` añade `'memetic'`, `solverFor` lo enruta.
- `ProposalsPanel.jsx`: nueva `<option value="memetic">Memético (GA + LS)</option>`.
- `App.jsx`: bloque en `handleGenerateProposals` que pasa defaults memetic cuando `solverAlgorithm === 'memetic'`.

### Riesgos
- Presupuesto de tiempo: la mini-SA multiplica evaluaciones. Medir con el test de performance (10 elementos, 50×50m, < 5s) antes de mergear.
- Regresión de GA: exportar símbolos internos rompe encapsulación; alternativa es duplicar helpers.

## AUTO_07_2 — Differential Evolution

### Objetivo
Algoritmo evolutivo sin crossover espacial: cada vector objetivo se combina con `target + F * (a - b)`, donde `a` y `b` son dos individuos al azar. Converge más rápido que GA en problemas continuos y tiene menos hiperparámetros.

### Diseño
- Archivo `src/utils/layoutDE.js` con `solveDE(initial, context, config)`.
- Genoma: por elemento no-locked, vector `[x, y, rotationFlag]` donde `rotationFlag` es continuo `[0, 1]` y se redondea para decidir rotación 0°/90°.
- Config:
  - `populationSize: 30`
  - `generations: 80`
  - `F: 0.5` (factor de mutación diferencial)
  - `CR: 0.9` (crossover rate, binomial)
  - `maxTimeMs: 5000`
- Estrategia clásica `DE/rand/1/bin`:
  1. Para cada individuo `i`: elegir `r1, r2, r3` distintos de `i`.
  2. `v = x_r1 + F * (x_r2 - x_r3)` por coordenada continua.
  3. Cada coordenada del hijo: con prob `CR` toma de `v`, si no de `x_i`.
  4. Clamp cada `(x, y)` al bbox y, si cae fuera del polígono, rechazo + re-sampleo.
  5. Reemplazo greedy: hijo entra si `score(hijo) <= score(padre)`.
- Locked elements: clonados tal cual del padre; nunca se combinan.

### Tests (`src/utils/__tests__/layoutDE.test.js`)
- Mejora score inicial con 3 elementos + restricciones.
- Locked element nunca se mueve.
- Clamp: con terreno triangular, ningún elemento final queda fuera.
- Stops by time.
- Determinista con seed.

### Integración
- Igual que memético: `SUPPORTED_ALGORITHMS`, `solverFor`, opción en UI, defaults en `App.jsx`.

### Riesgos
- El operador continuo no produce cambios de rotación naturalmente (el `rotationFlag` se mueve poco cerca de 0.5 → pocas mutaciones de rotación). Mitigación: aplicar `rotate` operator con prob 0.1 post-mutación como "mutation restart".

## AUTO_07_3 — CMA-ES

### Objetivo
Algoritmo estado-del-arte para optimización continua. Aprende la matriz de covarianza de las direcciones que mejoran fitness, adaptándose al paisaje. Gana en terrenos estrechos e irregulares donde SA/GA/DE se estancan.

### Diseño
- Dependencia: evaluar librerías viables (`cma-es`, `fmin`, escribirlo propio). Preferir implementación propia compacta (≈150 líneas) que no añada peso al bundle.
- Archivo `src/utils/layoutCMAES.js` con `solveCMAES(initial, context, config)`.
- Genoma aplanado: `[x0, y0, x1, y1, ...]` solo elementos no-locked (rotación se maneja aparte con mutación discreta, o se cuantiza como DE).
- Config:
  - `populationSize (λ)`: `4 + floor(3 * ln(N))` donde N = 2 * #movable elements.
  - `sigma0`: 0.3 * diagonal del terreno.
  - `generations`: 50.
  - `maxTimeMs: 5000`.
- Algoritmo base (`(μ, λ)-CMA-ES`):
  1. Muestrear λ hijos `~ N(mean, sigma² * C)`.
  2. Evaluar, seleccionar μ mejores.
  3. Actualizar `mean`, `sigma`, `C` con las ecuaciones estándar (path evolution + rank-μ update).
- Helpers: necesitamos `eigen-decomposition` 2D/pequeña. Para ≤30 elementos (N ≤ 60), Jacobi converge rápido.
- Proyección al polígono: post-muestra, rechazar hijos con algún elemento fuera; si más del 50% de una generación se rechaza, reducir `sigma` y reintentar.

### Tests (`src/utils/__tests__/layoutCMAES.test.js`)
- Mejora score inicial con 3 elementos + restricciones (tolerancia mayor: CMA-ES necesita más generaciones).
- Locked element nunca se mueve.
- Terreno triangular: todos los elementos finales están dentro.
- Sigma decrece cuando la población converge (trace incluye `sigma` por generación).
- Stops by time con budget corto.

### Integración
- Limitar en UI a problemas con ≤30 elementos; mostrar warning si se excede.
- `SUPPORTED_ALGORITHMS` + opción + defaults.

### Riesgos
- Complejidad de implementación: CMA-ES tiene matemática pesada (eigendecomp estable, path evolution, cumulative step-size). Una prueba de concepto simplificada (`(1+1)-CMA-ES` sin covarianza completa, solo `sigma` adaptativo) es un fallback razonable si el full-blown cuesta demasiado.
- Performance: O(N²) por generación. No viable para N > 60 (30 elementos). Hacer early-return con fallback a DE/GA si el payload excede el límite.

## AUTO_07_4 — Preset "Auto"

### Objetivo
Opción por defecto que elige el algoritmo según tamaño del problema y naturaleza de las restricciones.

### Heurística inicial
```
N = #elementos movibles
H = #restricciones hard enabled
si N <= 8 y H >= N:       SA        (pocos, muy restringido → recocido fino)
si N <= 20 y H < N:       DE        (rápido, mediano, baja restricción)
si N <= 30:               CMA-ES    (mediano, alta calidad)
si N > 30:                GA        (único que escala barato)
```
Caso especial: si hay ≥2 clusters grandes (≥4 miembros cada uno), forzar **Memético** — el crossover espacial + pulido local aprovecha la estructura.

### Diseño
- Nuevo módulo `src/utils/algorithmSelector.js` con `chooseAlgorithm(elements, constraints) -> string`.
- En `App.jsx`: cuando `solverAlgorithm === 'auto'`, calcular el algoritmo real al hacer click en Generar y pasarlo al worker.
- UI: `ProposalsPanel` muestra "Auto (usará: XYZ)" como pista.

### Tests (`src/utils/__tests__/algorithmSelector.test.js`)
- Pocos elementos + muchas restricciones → 'sa'.
- 25 elementos, pocas restricciones → 'cmaes'.
- 60 elementos → 'ga'.
- Con clusters grandes → 'memetic'.

## Orden sugerido

1. **AUTO_07_1 Memético** — máxima ganancia/esfuerzo, reusa GA.
2. **AUTO_07_2 DE** — fácil de escribir, buen benchmark contra GA.
3. **AUTO_07_4 Auto** — con 4 algoritmos (SA, GA, Memético, DE) el selector ya aporta valor.
4. **AUTO_07_3 CMA-ES** — último, por complejidad matemática. Si el esfuerzo es prohibitivo, cerrar con `(1+1)-CMA-ES` simplificado.

Cada subunidad commit independiente. Meta: cada unidad con su propio archivo de tests pasando en verde antes del commit.

## Métricas para elegir ganador

Tras implementar todas, correr benchmark sobre el `test.json` del usuario (17 elementos, 16 restricciones, terreno triangular):
- Best score alcanzado en 3s.
- Varianza entre 8 runs (mismo problema, seeds distintas).
- % de propuestas que respetan todas las restricciones hard.

Incluir tabla de resultados en el commit final. Si CMA-ES o Memético dominan claramente, mover el default de SA a ese algoritmo.
