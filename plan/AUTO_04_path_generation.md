# AUTO_04 — Generador automático de caminos

**Estado: Pending**
**Depende de: AUTO_03 (o se puede desarrollar en paralelo con un layout fijo de prueba)**

## Goal

Dada una distribución ya resuelta, generar caminos que conecten todos los elementos al elemento "hub" (casa, si existe; si no, el más grande) usando A*, fusionando segmentos compartidos y asignando grosores según tráfico.

## Archivo a crear

```
src/utils/pathGenerator.js
src/utils/__tests__/pathGenerator.test.js
```

## API

```js
export function generatePaths(layout, terrainMeters, options = {}): Array<Path>;

type Options = {
  gridStep?: number,          // default 0.5 (m)
  hubId?: string,             // default: casa o elemento mayor area
  widths?: {                  // default { main: 1.2, shared: 0.8, branch: 0.5 }
    main: number,
    shared: number,
    branch: number,
  },
  entrancePadding?: number,   // default 0.3 (m adentro del borde libre)
};

type Path = {
  id: string,
  points: Array<{x, y}>,  // metros
  width: number,          // metros
  label: 'Camino auto',
  source: 'auto',
  finished: true,
  color: '#D4A96A',
  borderColor: '#8B6914',
};
```

## Algoritmo

### 1. Rasterizar terreno

Grilla axis-aligned sobre bbox del terreno. Celdas de `gridStep` (default 0.5m). `cells[i][j]` es walkable si:
  - Centro de celda está dentro del polígono del terreno.
  - No cae dentro de ningún elemento expandido por `(minSpacing / 2)` de sus properties (default 0.5m si falta).

### 2. Identificar hub y entradas

Hub: elemento con `definitionId === 'casa'`. Si hay varias, la de mayor área. Si no hay, elemento con mayor área. Si `options.hubId`, usarlo.

Entrada de un elemento: punto en el borde del elemento que da a una celda walkable. Buscar el borde medio de cada lado; elegir el que tenga walkable más cerca. Un elemento tiene exactamente 1 entrada.

### 3. A* por elemento

Para cada elemento != hub:
  - A* desde su celda de entrada hasta la celda de entrada del hub.
  - Heurística: distancia Manhattan.
  - Costo de moverse: 1 por celda ortogonal, √2 por diagonal.
  - Si no hay ruta, loggear warning y skip (no romper).

Resultado: `Map<elementId, Array<celda>>`.

### 4. Fusión de segmentos compartidos

Convertir rutas a set de aristas (pares de celdas consecutivas). Contar cuántas rutas pasan por cada arista. Crear:
  - `edges`: `Map<edgeKey, { traffic: number, a: celda, b: celda }>`.

### 5. Construir paths finales

Recorrer aristas por componente conectado. Cada componente se convierte en un path lineal simplificado:
  - Collapse de aristas colineales consecutivas (Douglas-Peucker con epsilon = 0.25m).
  - Width según tráfico max del componente:
    - `traffic >= N_elementos - 1` o contiene hub -> main (1.2m)
    - `traffic >= 2` -> shared (0.8m)
    - else -> branch (0.5m)

Emitir `{ id: 'autopath_<idx>', points, width, ... }`.

## Estructura de celda

```js
{ i, j, x, y, walkable }
// x, y = centro en metros
// key = `${i},${j}` para map lookups
```

## Tests

```js
describe('generatePaths', () => {
  test('terreno vacío sin elementos -> []', ...);
  test('1 elemento sin hub distinto -> []', ...);
  test('2 elementos sin obstáculos -> 1 path rectilíneo', ...);
  test('3 elementos en línea con casa en el medio -> 2 paths o fusionados', ...);
  test('path respeta el buffer de minSpacing de cada elemento', ...);
  test('ruta sin solución -> path de ese elemento skipped (warning)', ...);
  test('tráfico compartido recibe width=0.8', ...);
  test('ramal a 1 solo elemento recibe width=0.5', ...);
  test('tramo al hub recibe width=1.2', ...);
  test('options.hubId override fuerza ese elemento como hub', ...);
});

describe('generatePaths — performance', () => {
  test('10 elementos en terreno 50x50m -> ejecuta < 2s', ...);  // usando performance.now()
});
```

## Performance

- Celdas totales = `area_bbox / gridStep²`. Para 50x50m con step=0.5 -> 10000 celdas. Aceptable.
- A* con priority queue (min-heap) binario; ya existen implementaciones compactas (~50 líneas). No usar librería externa.
- Cachear `walkable` al construir la grilla; no recalcular por iteración.

## Notas

- Los paths generados deben ser compatibles con `PathsLayer.jsx` existente. Verificar que render funcione con `source: 'auto'` sin cambios extra (en principio el campo se ignora en render pero permite filtrar para el toggle "mostrar caminos autogenerados" en AUTO_05).
- No modificar `pathUtils.js` a menos que falte algo crítico. Este generador es un nuevo módulo.
- Las entradas al hub se unifican a una sola si están a <1m (evita ramas extrañas en la puerta).

## Criterio de completitud

- Tests verdes.
- En un layout de 5 elementos, visualmente razonable al cargar el primer prototipo (manual smoke test).
- Execution time < 2s para 10 elementos en terreno 50x50m.
