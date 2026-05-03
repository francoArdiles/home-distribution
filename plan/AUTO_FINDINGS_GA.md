# Hallazgo: GA no es adecuado para este caso de uso

Estado: **Resuelto** el 2026-04-23 tras implementar AUTO_07_0 (ranking lexicográfico + operador de reparación). GA genera alternativas diversas y factibles en el caso real; se retira el flag experimental de la UI.

Fecha: 2026-04-22
Contexto: Intento de usar un algoritmo genético (`src/utils/layoutGA.js`) como alternativa a Simulated Annealing para generar propuestas de distribución.

## Resumen

El Genetic Algorithm implementado no produce propuestas utiles en este problema. En la practica siempre devuelve una unica propuesta practicamente identica al layout de entrada, o layouts con violaciones duras inaceptables. Se prefiere mantener SA como algoritmo principal.

## Evidencia observada

Caso real (16 elementos, 13 movibles, varias restricciones de distancia):

- SA (8 runs, 3 s/run): devuelve 5 picks distintos con scores en 0.319 - 0.412, todos factibles.
- GA (6 runs, populationSize=40, generations=200, 4 s/run):
  - Run 0 (verbatim): score 0.319 (el layout aceptado intacto).
  - Runs 1-5 (random starts): mejores scores en 938 - 1688 (region de violacion dura, piso ~1000).
  - Tras filtro de diversidad: 1 sola propuesta, identica al layout aceptado.

## Causas raiz

1. **Random starts caen en region infactible**: Con 13 elementos a ubicar y restricciones de distancia, un layout aleatorio genera multiples violaciones duras cuyo score (>=1000) oculta el gradiente de penalizaciones suaves. El GA no logra escapar de esa region en 200 generaciones con poblacion 40.
2. **Perturbed starts colapsan al mismo optimo**: Cuando se parte del layout del usuario con pequenas perturbaciones, la seleccion por torneo + elitismo convergen de vuelta al mismo layout. Los finalists de un run terminan siendo copias casi identicas entre si.
3. **Crossover no aporta en problemas geometricos**: Uniform y line-split crossover mezclan posiciones de padres feasibles y el hijo casi siempre viola restricciones (posiciones descoordinadas de elementos que deben guardar distancias minimas). La seleccion descarta al hijo y el progreso se estanca.
4. **Asimetria con SA**: SA mantiene una sola solucion y la mueve con la temperatura, nunca sale de la region factible si arranca factible. GA mantiene una poblacion y el ruido de random immigrants + crossover destructivo la arrastra a infactibilidad.

## Intentos de mitigacion que no resolvieron el problema

- Aumentar `populationSize` (30 a 40) y `generations` (70 a 200).
- Subir `teleportRate`, `immigrantRate`, agregar hipermutacion ante estancamiento.
- Rank-based tournament para aplanar el gradiente de violaciones duras.
- Mezcla uniform + line-split crossover.
- Sembrar population inicial con 80% perturbadas del layout del usuario.
- Cambiar `seedingFor` en multi-run entre perturbed y random.

Ninguno produjo mas de 1 pick diverso en el caso real.

## Decision (original, 2026-04-22)

- Se mantiene el codigo de GA (`src/utils/layoutGA.js`, `layoutGA.test.js`) y la opcion en la UI para poder experimentar, pero **no es el algoritmo recomendado**.
- La UI debe dejar claro que el algoritmo por defecto es SA.
- Antes de intentar implementar otro evolutivo (DE, CMA-ES, Memetico), hay que decidir si el problema real requiere un operador especifico de dominio (por ejemplo, mutacion que respete restricciones de distancia por construccion, o reparacion post-crossover).

## Resolucion (2026-04-23)

Se implemento AUTO_07_0:
- Ranking lexicografico `(violationCount, softScore)` en `src/utils/layoutRanking.js` reemplaza el orden por `total` en GA y en el filtrado de multi-run. Un individuo factible siempre domina a uno infactible, resolviendo la perdida de presion selectiva por el piso de violacion dura.
- Operador de reparacion en `src/utils/layoutRepair.js` proyecta pares que violan min/max-distance (incluye `any` y `entrance`). Se aplica a la poblacion inicial, hijos post-crossover+mutacion e inmigrantes random.

Resultado confirmado por el usuario: GA produce ahora multiples picks diversos y factibles en el caso real. Se retira el warning "experimental" de la UI. La opcion SA sigue siendo la default por rendimiento, pero GA es utilizable.

## Lecciones para algoritmos futuros

1. **Para problemas con restricciones duras y una region factible estrecha**, los metodos basados en poblacion con operadores geometricos "ciegos" (crossover de coordenadas) son mala eleccion. Hay que darles un operador de reparacion.
2. **Los scores con piso de violacion dura (>=1000) rompen la presion selectiva**: cualquier ranking basado en score puro no distingue entre "casi factible" y "desastre". O se reemplaza por ranking multicriterio (violaciones primero, score despues) o se usa un algoritmo que no dependa de la presion selectiva global (SA, tabu search).
3. **La diversidad entre propuestas se consigue mejor con multiples runs de SA que con una poblacion de GA**. La temperatura da exploracion local; el multi-run da exploracion global.

## Referencias al codigo

- Implementacion GA: `src/utils/layoutGA.js`
- Multi-run wrapper: `src/utils/layoutMultiRun.js`
- Tests GA: `src/utils/__tests__/layoutGA.test.js`
- Plan original de alternativas: `plan/AUTO_07_algorithms.md`
