# AUTO_07 — Más metaheurísticas (revisado 2026-04-22)

Feature: ampliar el selector de algoritmo (`ProposalsPanel.jsx`) con nuevas opciones, aprovechando `runMultiRun(payload.algorithm)`. El usuario avanzado elige la metaheurística; se incluye un preset **Auto** que decide según tamaño del problema.

## Revisión tras el fracaso de GA

Ver `plan/AUTO_FINDINGS_GA.md`. Conclusiones que cambian este plan:

1. **El piso de violación dura (`>=1000`) rompe la presión selectiva** de cualquier método basado en población. Ranking por score puro no distingue "casi factible" de "desastre".
2. **Crossover geométrico ciego destruye factibilidad**: mezclar coordenadas de padres feasibles produce hijos con violaciones en >95% de casos cuando hay restricciones de distancia.
3. **Multi-run desde starts random no ayuda**: 200 generaciones no alcanzan para escapar de la región infactible.
4. **SA gana porque parte factible y nunca sale** de la región factible si arranca ahí (la temperatura solo permite empeorar en el margen).

**Implicación**: cualquier nuevo algoritmo evolutivo que no resuelva (1) y (2) fracasará igual que GA. Por lo tanto, **antes de implementar Memético, DE o CMA-ES se debe construir infraestructura de factibilidad**.

## Subunidades (reordenadas)

| ID | Descripción | Estado | Prioridad |
|----|-------------|--------|-----------|
| AUTO_07_0 | **Infraestructura de factibilidad**: ranking multicriterio + operador de reparación | Done (2026-04-23) | Bloqueante |
| AUTO_07_1 | Memético (GA + mini-SA como búsqueda local / reparación) | Pending (opcional, GA ya funciona con repair) | Baja |
| AUTO_07_4 | Preset "Auto" + heurística de selección | Done (2026-04-23) | Media |
| AUTO_07_2 | Differential Evolution | Pending | Baja |
| AUTO_07_3 | CMA-ES | Pending | Baja (evaluar si vale la pena) |

## AUTO_07_0 — Infraestructura de factibilidad (nuevo, bloqueante)

### Objetivo
Sin esto ningún evolutivo funcionará. Dos piezas:

**A. Ranking multicriterio.** En lugar de `sort(scores)`, ordenar por tupla `(violationCount, softScore)`:
- `violationCount`: número de restricciones hard violadas.
- `softScore`: suma de penalizaciones suaves (lo que hoy da valores 0 - 1).

De esta forma todo individuo con 0 violaciones domina a cualquiera con 1+, y entre iguales se compara por calidad.

### Diseño
- Modificar `src/utils/layoutFitness.js` para devolver `{ total, softScore, violationCount, violations }` (hoy ya tiene `violations`, solo exponer el contador).
- Nuevo helper `src/utils/layoutRanking.js`:
  - `compareLex(a, b)`: retorna -1/0/1 comparando por `(violationCount, softScore)`.
  - `rankLex(evaluations)`: retorna array de rangos.
- `layoutGA.js` y futuros: sustituir `computeRanks(scores)` por `rankLex(evaluations)`. SA mantiene acepción Metropolis sobre `total` (no necesita cambio).
- `layoutMultiRun.js`: el filtrado por `scoreFactor` se hace solo entre individuos con 0 violaciones; si no hay ninguno con 0, devolver solo el best por violationCount (sin diversidad forzada, porque la prioridad es factibilidad).

**B. Operador de reparación.** Tras crossover o mutación que rompa restricciones, proyectar el hijo a factibilidad:
- Identificar pares que violan `min-distance`: para cada par, mover el elemento no-locked (o ambos si ninguno lo está) en la dirección opuesta hasta satisfacer la distancia.
- Iterar hasta convergencia o N intentos (≤10).
- Si no converge, descartar el hijo (devolver padre).

### Diseño
- Nuevo módulo `src/utils/layoutRepair.js` con `repair(layout, context, maxIters=10) -> { layout, converged }`.
- Cuello de botella: evaluar solo las restricciones activas en el layout, no todas.
- Locked elements nunca se mueven; si un par locked-locked viola, no hay reparación posible (devolver `converged: false`).

### Tests
- `layoutRanking.test.js`: 2-factibles vs 1-factible → el factible gana aunque tenga peor softScore.
- `layoutRepair.test.js`:
  - Dos elementos a 1m con constraint min-distance=3 → tras reparación están a ≥3m.
  - Uno locked, otro no → el locked no se mueve, el otro sí.
  - Locked-locked violando → `converged: false`, layout sin cambios.
  - 5 elementos en grid apretado con constraints encadenadas → converge en ≤10 iteraciones o descarta.

### Integración
- GA pre-existente: activar en `mutateLayout` (repair post-mutación) y en offspring antes de `evaluateLayout`. Validar que el test real del usuario (16 elementos) produce ≥2 picks diversos. Si lo consigue, re-promover GA a "estable".
- SA no necesita este operador (ya parte factible).

### Riesgo
- `repair` puede crear ciclos (A empuja B, B empuja A). Mitigación: orden determinista + límite de iteraciones.
- Coste por evaluación: reparar 40 individuos × 10 iters cada uno puede dominar el tiempo. Medir.

## AUTO_07_1 — Memético (revisado)

### Cambio principal
Con `AUTO_07_0` en pie, el memético cambia de "GA + mini-SA" a **"GA + reparación + mini-SA como intensificación"**. La mini-SA ya no tiene que salvar factibilidad (lo hace el repair), solo pulir calidad.

### Diseño
- Igual que el plan original pero:
  - Crossover + mutación → `repair` → mini-SA (150 iters a T fija baja) → evaluar.
  - `localSearchProb: 0.2` (baja porque repair ya absorbe parte del coste).
- Si `repair` descarta el hijo, saltar mini-SA y copiar padre.

### Meta de validación
- En el caso real del usuario (16 elementos, varias min-distance), debe producir ≥3 picks diversos con `violationCount == 0` en ≤20 s. Si no lo logra, el memético tampoco sirve y vamos directo a descartar evolutivos.

## AUTO_07_2 — Differential Evolution (re-evaluado)

### Posición
DE sufre el MISMO problema que GA: su operador `v = x_r1 + F*(x_r2 - x_r3)` es ciego a la geometría. La diferencia entre dos layouts factibles rara vez produce un vector de cambio que mantenga factibilidad.

**Condicional**: implementar DE solo si el memético demuestra que la combinación `repair + LS` resuelve el problema de factibilidad. Entonces DE con el mismo `repair` post-trial vale la pena como benchmark rápido.

Sin AUTO_07_0 funcionando, **no implementar DE**.

## AUTO_07_3 — CMA-ES (re-evaluado)

### Posición
CMA-ES asume terreno continuo sin restricciones duras. La proyección naive al polígono y el descarte de inviables hacen colapsar `sigma` (toda la población cae fuera → se achica sigma → cae en el mismo punto).

**Condicional**: implementar solo si:
1. AUTO_07_0 funciona.
2. Se identifica un problema real donde SA + Memético se estancan y CMA-ES aporta valor medible.

Más realista: **descartar CMA-ES para este proyecto** y sustituirlo por una variante de SA paralela (multiple chains con exchange) si hace falta más exploración.

## AUTO_07_4 — Preset "Auto" (ajustado)

### Heurística revisada
```
N = #elementos movibles
H = #restricciones hard enabled

si H == 0:                 SA        (sin constraints el espacio es trivial)
si H >= 1 y N <= 30:       SA        (default seguro)
si H >= 1 y N > 30 y memetic_disponible: Memetic
otro caso:                 SA
```

GA/DE/CMA-ES no entran en la heurística hasta demostrar valor con el test real.

### Diseño
Igual al plan original (módulo `algorithmSelector.js`), pero con la heurística de arriba. Mientras solo exista SA estable, "Auto" es equivalente a SA; el campo se mantiene como punto de extensión.

## Métricas para mergear

Antes de promover cualquier algoritmo a "estable" (quitar el flag experimental de la UI), debe cumplir en el caso real del usuario (16 elementos, varias constraints):

1. **Factibilidad**: ≥80% de los picks tienen `violationCount == 0`.
2. **Diversidad**: ≥3 picks distintos (distancia ≥3m entre cualquier par).
3. **Calidad**: mejor softScore dentro del 50% del mejor de SA.
4. **Tiempo**: ≤1.5× el tiempo de SA sobre el mismo input.

Si falla cualquiera, se mantiene como experimental o se descarta.

## Orden sugerido

1. **AUTO_07_0** (bloqueante): ranking + repair. Validar con los tests ya escritos de GA.
2. **Re-evaluar GA** con AUTO_07_0 activo. Si funciona, promover a estable y cerrar el findings doc.
3. **AUTO_07_1 Memético** si GA sigue insuficiente.
4. **AUTO_07_4 Auto** cuando haya >1 algoritmo estable.
5. DE y CMA-ES solo si 1-4 agotaron valor.
