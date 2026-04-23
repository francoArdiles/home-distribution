# AUTO_02 — Fitness + Operadores de vecindad

**Estado: Pending**
**Depende de: AUTO_01**

## Goal

Implementar utils puros (sin estado global, sin React) que: (a) evalúan la calidad de un layout candidato sumando penalizaciones normalizadas; (b) producen layouts vecinos mediante operadores estocásticos. Base para el SA de AUTO_03.

## Archivos a crear

```
src/utils/layoutFitness.js
src/utils/layoutOperators.js
src/utils/__tests__/layoutFitness.test.js
src/utils/__tests__/layoutOperators.test.js
```

## Tipos

```js
// Layout = snapshot serializable sin referencias DOM
type Layout = {
  elements: Array<{
    id: string,
    definitionId: string,
    x: number,          // metros, centro
    y: number,          // metros, centro
    width: number,      // metros
    height: number,     // metros
    rotation: 0 | 90,   // grados, solo 2 valores
    shape: 'rectangle' | 'circle' | 'polygon',
    radius?: number,
    properties?: { sunNeeds, waterNeeds, minSpacing, ... }
  }>
};

type Context = {
  terrainMeters: Array<{x, y}>,   // polígono del terreno convertido a metros
  constraints: Array<Constraint>, // min-distance y max-distance
  weights: Weights,               // ver abajo, overrideable
};

type Weights = {
  violations: number,    // default 1000 (hard)
  overlap: number,       // default 1000 (hard)
  outOfTerrain: number,  // default 1000 (hard)
  pathLength: number,    // default 5
  deadSpace: number,     // default 3
  orientation: number,   // default 2
  imbalance: number,     // default 1
};
```

## API — `layoutFitness.js`

```js
export const DEFAULT_WEIGHTS = { violations: 1000, overlap: 1000, outOfTerrain: 1000, pathLength: 5, deadSpace: 3, orientation: 2, imbalance: 1 };

// Retorna { total, breakdown: { violations, overlap, outOfTerrain, pathLength, deadSpace, orientation, imbalance } }
// Cada componente en [0, 1] antes de ponderar. total = sum(w_i * breakdown_i).
export function evaluateLayout(layout, context): FitnessResult;

// Helpers expuestos para tests:
export function penaltyMinMax(layout, constraints): number;   // suma de metros fuera del rango, normalizada
export function penaltyOverlap(layout): number;               // area de interseccion total / area total de elementos
export function penaltyOutOfTerrain(layout, terrainMeters): number; // area fuera / area total elementos
export function penaltyPathLength(layout): number;            // MST heuristico entre centroides / diagonal terreno
export function penaltyDeadSpace(layout, terrainMeters): number;    // 1 - (area_util / area_terreno), con area_util = terreno menos huecos < 1m2
export function penaltyOrientation(layout): number;           // suma de mismatches sunNeeds vs cuadrante (0..1)
export function penaltyImbalance(layout, terrainMeters): number; // |centroide_ponderado - centroide_terreno| / diagonal
```

### Detalle de cada penalización

**violations**: iterar constraints. Para cada uno, calcular `actualDistance` usando `distanceElementToElement`/`distanceElementToTerrain`. Si `min-distance`, violación = `max(0, value - actual)`. Si `max-distance`, violación = `max(0, actual - value)`. Normalizar: `sum(violaciones) / (constraints.length * diagonal_terreno)`.

**overlap**: sumar area de intersección entre pares de elementos (aabb expandido por rotación para rectángulos; dos círculos: usar formula analitica). Normalizar: `overlap_total / sum(area_elementos)`. Si ==0 retornar 0.

**outOfTerrain**: aproximar con muestreo de grilla 0.25m sobre bbox del elemento; contar celdas fuera del polígono de terreno. Normalizar: `area_fuera / area_elementos`.

**pathLength**: construir MST greedy (Prim) entre centros de elementos. Retornar `longitud_MST / diagonal_terreno`.

**deadSpace**: rasterizar terreno en celdas 1m; marcar ocupadas las celdas dentro de elementos. De las no ocupadas, contar las que tienen < 4 vecinos libres (islas de <4m²). Normalizar: `celdas_aisladas / celdas_totales_libres`.

**orientation**: para cada elemento con `properties.sunNeeds`:
  - `'full'` -> debería estar en mitad norte del terreno (o sur, según hemisferio). Proyecto ya tiene `solarConfigUtils`; usar su `hemisphere` si existe, fallback sur.
  - `'partial'` -> centro del terreno (dentro del 50% central).
  - `'low'` / `'shade'` -> mitad opuesta al sol.
  
  Mismatch = distancia entre centroide del elemento y el "sweet spot" ideal / diagonal. Promediar sobre elementos con sunNeeds definido.

**imbalance**: `||centroide_ponderado_por_area - centroide_terreno|| / diagonal_terreno`.

### Helpers internos

- `diagonalTerreno(terrainMeters)`: bbox diagonal.
- `elementArea(el)`: circle -> πr², rect -> w*h.
- `elementCorners(el)`: 4 esquinas considerando rotación (para shape=rectangle). Rotación 0 o 90.
- `rectRectOverlapArea(a, b)`: intersection area aabb (rotación 90 = intercambiar w/h).

## API — `layoutOperators.js`

```js
// Todos los operadores devuelven un NUEVO layout (inmutables). No mutan el original.
// rng: función () => [0, 1), inyectable para tests deterministas.

export function jitter(layout, { temperature, terrainMeters, rng }): Layout;
// Mueve UN elemento aleatorio por (dx, dy) ~ N(0, sigma), sigma = temperature * diagonal / 4.
// Clampea al bbox del terreno.

export function swap(layout, { rng }): Layout;
// Intercambia las posiciones (x, y) de dos elementos aleatorios distintos.

export function rotate(layout, { rng }): Layout;
// Selecciona un elemento rectangular aleatorio y togglea rotation 0 <-> 90. Circulos no afectados.

export function reseed(layout, { terrainMeters, rng }): Layout;
// Selecciona un elemento aleatorio y lo reubica en (x, y) aleatorio dentro del terreno.

export function randomOperator(layout, ctx): Layout;
// Pesos: jitter 50%, swap 20%, rotate 15%, reseed 15%.
```

### Box-Muller para rng gaussiano

```js
function gaussian(rng) {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
```

## Tests — `layoutFitness.test.js`

RED primero. Casos mínimos:

```js
describe('evaluateLayout', () => {
  test('layout vacío -> total 0', ...);
  test('dos rectangulos separados sin constraints -> penalizaciones bajas', ...);
  test('layout con violación min-distance -> violations > 0', ...);
  test('layout con violación max-distance -> violations > 0', ...);
  test('dos rects solapados -> overlap > 0', ...);
  test('elemento fuera del terreno -> outOfTerrain > 0', ...);
  test('total es suma ponderada del breakdown', ...);
  test('pesos custom aplicados correctamente', ...);
});

describe('penaltyMinMax', () => {
  test('constraint disabled ignorada', ...);
  test('min-distance cumplida -> 0', ...);
  test('min-distance violada por 2m -> valor proporcional', ...);
  test('max-distance: elementos muy lejos -> valor proporcional', ...);
});

describe('penaltyOverlap', () => {
  test('rects disjuntos -> 0', ...);
  test('rect contenido en otro -> overlap = area menor / sum', ...);
  test('rotation=90 considerada (dimensiones intercambiadas)', ...);
});

describe('penaltyOutOfTerrain', ...);
describe('penaltyPathLength', ...);
describe('penaltyOrientation', ...);
describe('penaltyImbalance', ...);
```

## Tests — `layoutOperators.test.js`

```js
describe('jitter', () => {
  test('modifica exactamente un elemento', ...);
  test('no sale del terreno (clamp)', ...);
  test('sigma escala con temperature', ...);  // usar rng=() => 0.9 y medir diff
});

describe('swap', () => {
  test('layouts con 1 elemento -> identidad', ...);
  test('con 2 elementos intercambia sus x,y', ...);
  test('width/height/rotation no cambian en swap', ...);
});

describe('rotate', () => {
  test('elemento rectangular togglea 0 <-> 90', ...);
  test('elemento circle no rota', ...);
});

describe('reseed', () => {
  test('nueva posicion dentro del bbox del terreno', ...);
});

describe('randomOperator', () => {
  test('determinista con rng fijo', ...);  // rng=() => 0.1 siempre devuelve jitter
});
```

## Criterios de completitud

- 100% tests verdes.
- `evaluateLayout` retorna número finito para cualquier input válido (no NaN, no Infinity).
- Operadores no mutan entrada (chequeo por identidad de referencias de objetos).
- Sin dependencias a React o a stores globales.

## Notas de implementación

- Reusar `distanceElementToElement`, `distanceElementToTerrain` de `src/utils/distanceUtils.js`.
- Reusar `isPointInPolygon` de `src/utils/collisionUtils.js`.
- El parámetro `rng` default a `Math.random` en producción pero inyectable para tests.
- Documentar en `AUTO_DISTRIBUTION.md` los pesos finales tras tuning si difieren de los defaults.
