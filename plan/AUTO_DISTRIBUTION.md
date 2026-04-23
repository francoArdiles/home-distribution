# Auto-Distribution — Plan Maestro

Feature: dado un conjunto de elementos que el usuario quiere en su terreno y sus restricciones, generar automáticamente hasta 5 propuestas de distribución que maximicen eficiencia de espacio y cumplan restricciones, con caminos auto-generados que comuniquen elementos. Las propuestas son temporales; el usuario elige aceptar/descartar/iterar.

## Heurísticas de diseño

Función de fitness (menor es mejor), suma ponderada de penalizaciones normalizadas a [0,1]:

```
f(L) =  w1 * violacionesMinMax(L)       // hard,  w1=1000
      + w2 * solapamientos(L)           // hard,  w2=1000
      + w3 * fueraDeTerreno(L)          // hard,  w3=1000
      + w4 * largoTotalCaminos(L)       // soft,  w4=5
      + w5 * espacioMuerto(L)           // soft,  w5=3
      + w6 * malaOrientacion(L)         // soft,  w6=2
      + w7 * desbalance(L)              // soft,  w7=1
```

Metaheurística: Simulated Annealing sobre genoma `{ elementId: (x, y, rotacion) }`. Operadores de vecindad: jitter, swap, rotate, reseed. Corrida múltiple (5 seeds) + penalización de diversidad L1 para propuestas distintas.

Generación de caminos: fase posterior al placement. A* sobre grilla de 0.5m con celdas ocupadas (elementos expandidos por minSpacing/2). Árbol Steiner aproximado: A* desde cada entrada hacia hub (casa), fusión de segmentos compartidos. Grosores: 1.2m (principal), 0.8m (ramal compartido), 0.5m (ramal simple).

## Estado de las unidades

| ID | Descripción | Estado |
|----|-------------|--------|
| [AUTO_01](AUTO_01_max_distance.md) | Tipo max-distance en restricciones | DONE |
| [AUTO_02](AUTO_02_fitness_operators.md) | Fitness + operadores de vecindad | Pending |
| [AUTO_03](AUTO_03_simulated_annealing.md) | Motor SA | Pending |
| [AUTO_04](AUTO_04_path_generation.md) | Generador auto de caminos | Pending |
| [AUTO_05](AUTO_05_proposals_ui.md) | Store + UI de propuestas | Pending |
| [AUTO_06](AUTO_06_diversification_worker.md) | Diversificación multi-run + Web Worker | Pending |

## Convenciones

- TDD estricto (RED-GREEN-REFACTOR). Tests en `src/utils/__tests__/` o `src/components/__tests__/`.
- Vitest + jsdom.
- Modelo de elemento existente: `{ id, definitionId, label, x, y, width, height, rotation, shape, radius?, properties }` con x,y en **metros** (centro) y shape en `'rectangle' | 'circle' | 'polygon'`.
- Terreno: polígono en pixeles de capa (`terrainPoints[].x/y`), baseScale = px por metro.
- Restricciones: `{ id, type: 'min-distance' | 'max-distance', sourceId, targetId: 'terrain' | 'any' | elementId, value (m), enabled }`.

## Dependencias entre unidades

```
01 ── 02 ─── 03 ─── 04 ─── 05 ─── 06
                           ^           (05 puede integrarse con stub de 04 mientras 04 se termina)
```
