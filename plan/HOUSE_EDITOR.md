# HOUSE_EDITOR — Plan: Vista de edición de planta de casa

Fecha: 2026-04-23
Estado: Planificación. Implementación pendiente.

---

## Contexto del proyecto

`home-distribution` es una aplicación web (React + SVG, Vite, Tailwind, sin backend) para diseñar terrenos de vivienda autosustentable. El stack completo es:

- **React 18** con hooks. Sin Redux; estado local por componente + `useState`/`useCallback`.
- **SVG nativo** para todo el canvas (no Konva, no canvas 2D). Las vistas de sección de elementos usan SVG incrustado.
- **Vitest** para tests unitarios. Cada módulo de lógica pura tiene su archivo de test en `src/utils/__tests__/`.
- **Tailwind CSS** para estilos. Sin CSS-in-JS.
- **Proyecto guardado** como JSON (`projectIO.js`). El objeto raíz tiene: `elements`, `paths`, `constraints`, `measurementConfig`, `solarConfig`, y otros campos por elemento.

### Cómo funciona el editor de elementos

Cada elemento colocado en el terreno (ej. `casa`) puede tener una "section view": un editor específico que se abre en un panel flotante. El registro está en `src/components/sectionViewRegistry.js`. El componente `CasaSectionView.jsx` es el editor de la casa.

### Estado actual de `CasaSectionView.jsx`

`src/components/CasaSectionView.jsx` ya implementa (al 2026-04-23):

- Vista superior SVG con dibujo de paredes internas (clic-a-clic).
- Snap a endpoints de paredes y a cuadrícula (0.5 m / 1 m).
- Drag de paredes completas y de sus endpoints.
- Etiquetas de texto arrastrables (clic + Shift en el canvas).
- Preview con línea punteada y ángulo mientras se dibuja.
- Toggle de cuadrícula y cotas.
- Vista de fachada (elevación frontal) generada automáticamente.
- Multi-piso (selector de piso, aunque el plan solo requiere piso 1 por ahora).

El modelo de datos persistido es `{ walls: Wall[], labels: Label[] }` guardado en `detail` del elemento.

```ts
Wall  = { id, x1, y1, x2, y2, thickness, floor }
Label = { id, x, y, text, floor }
```

Todo lo descrito a continuación **extiende** este componente y modelo existente.

---

## Visión general de lo que se construirá

El editor de casa se convierte en una herramienta de diseño de planta con:
1. Tipos de cuarto asignados a zonas cerradas.
2. Puertas y ventanas sobre paredes.
3. Paleta de elementos de red (eléctrica, agua, desagüe) colocables en la planta.
4. Dibujo manual de tuberías y conductos por capa.
5. Visibilidad de capas independiente.
6. Validación en tiempo real de restricciones de red.
7. Auto-generación de las tres redes mediante algoritmos.
8. Exportación por capa.
9. Importación de fondo DXF/SVG como referencia.

---

## Módulos

| ID | Descripción | Depende de | Prioridad |
|----|-------------|------------|-----------|
| HOUSE_01 | Puertas, ventanas y tipos de cuarto | existente | Bloqueante |
| HOUSE_02 | Paleta de elementos de red + colocación | HOUSE_01 | Alta |
| HOUSE_03 | Dibujo manual de tuberías/conductos + capas | HOUSE_02 | Alta |
| HOUSE_04 | Validación en tiempo real | HOUSE_03 | Alta |
| HOUSE_05 | Algoritmo red eléctrica | HOUSE_03 | Media |
| HOUSE_06 | Algoritmo red de agua | HOUSE_03 | Media |
| HOUSE_07 | Algoritmo red de desagüe | HOUSE_03 | Media |
| HOUSE_08 | Importar fondo DXF/SVG | ninguno | Baja |
| HOUSE_09 | Exportación por capa a PDF/SVG | HOUSE_03 | Baja |

---

## HOUSE_01 — Puertas, ventanas y tipos de cuarto

### 1a. Puertas y ventanas

Añadir al modelo:

```js
Door   = { id, wallId, t, width, swing: 'left'|'right'|'double', floor }
Window = { id, wallId, t, width, floor }
```

`t` es la posición paramétrica sobre la pared (0 = inicio, 1 = fin).

**Herramientas** (añadir al toolbar existente):
- `wall` (existente)
- `door`: clic sobre una pared existente → inserta puerta en ese punto. Drag para reposicionar.
- `window`: igual que puerta.
- `select`: selecciona elemento para editar o borrar.

**Render SVG**:
- Puerta: hueco en la pared + arco de barrido (línea curva de 90°).
- Ventana: hueco en la pared con dos líneas paralelas.

**Validaciones**:
- No se puede colocar puerta/ventana si `width > wallLength`.
- No se superponen dos aperturas en la misma pared.

### 1b. Detección de cuartos

Las paredes forman un grafo planar. Se detectan caras cerradas (ciclos mínimos) para identificar cuartos.

**Algoritmo de detección** (`src/utils/roomDetection.js`):
1. Construir grafo: nodos = endpoints de paredes (fusionados si están a < 0.05 m entre sí), aristas = paredes.
2. Para cada arista, calcular el ángulo de salida desde cada extremo.
3. Recorrer ciclos mínimos ("half-edge traversal"): desde cada arista dirigida, girar siempre a la derecha → obtener polígonos de cuartos.
4. Filtrar el polígono exterior (el más grande / que contiene a todos los demás).
5. Calcular centroide de cada polígono para posicionar la etiqueta.

> Nota de implementación: el algoritmo de half-edge para grafos planares requiere ordenar las aristas salientes de cada nodo por ángulo. Referencia: "Planar graph face traversal" (O'Rourke, Computational Geometry in C, cap. 2).

### 1c. Tipos de cuarto

```js
RoomType = 'bedroom' | 'bathroom' | 'laundry' | 'common' | 'exterior' | undefined
```

- `common`: cocina, living, comedor (un solo espacio o varios conectados).
- `exterior`: zona dentro del perímetro de la propiedad que no pertenece a la casa (terraza descubierta, pasaje lateral).
- Subetiqueta libre: campo `label: string` adicional para texto como "Cocina", "Dormitorio principal", etc.

**UI**: clic dentro de un cuarto detectado → menú contextual con el selector de tipo + campo de subetiqueta.

**Visualización**:
| Tipo | Relleno | Borde |
|------|---------|-------|
| `bedroom` | lavanda 30% | lavanda |
| `bathroom` | azul claro 30% | azul |
| `laundry` | cyan 30% | cyan |
| `common` | verde claro 30% | verde |
| `exterior` | hachure gris | gris |
| `undefined` | sin relleno | — |

**Modelo extendido**:

```js
Room = { id, polygon: Point[], type: RoomType, label: string, floor }
```

Persiste en `detail.rooms[]`.

### 1d. Guías arrastrables

Añadir guías horizontales y verticales (como Figma):
- Drag desde la regla lateral/superior → crea una guía.
- Las guías actúan como candidatos de snap (igual prioridad que endpoints de paredes).
- Toggle "Guías" en el toolbar.

---

## HOUSE_02 — Paleta de elementos de red

### Modelo

```js
NetworkElement = {
  id,
  type: NetworkElementType,   // ver tabla abajo
  x, y,                       // metros en la planta
  rotation: 0|90|180|270,
  network: 'electrical'|'water'|'drainage'|'combined',
  floor,
  properties: {}              // específico por tipo
}
```

Persiste en `detail.networkElements[]`.

### Tabla de tipos

#### Red eléctrica

| type | label UI | network | properties |
|------|----------|---------|------------|
| `main-panel` | Tablero principal | electrical | `{ amperes: 63 }` |
| `junction-box` | Caja de conexión | electrical | `{ maxOutputs: 3 }` |
| `outlet` | Enchufe | electrical | `{ amperes: 15 }` |
| `outlet-special` | Enchufe especial | electrical | `{ amperes: 20, label: '' }` |
| `switch` | Interruptor | electrical | `{ poles: 1 }` |
| `light-point` | Punto de luz | electrical | `{ type: 'ceiling'|'wall' }` |

#### Red de agua

| type | label UI | network | properties |
|------|----------|---------|------------|
| `water-entry` | Entrada de agua | water | `{ pressure: null }` |
| `water-tap` | Llave de agua | water | `{ tempType: 'cold'|'hot'|'both' }` |
| `shower-head` | Ducha | combined | `{ tempType: 'both' }` |
| `sink` | Lavamanos / lavaplatos | combined | `{ tempType: 'both' }` |
| `washing-machine` | Lavadora | combined | `{}` |
| `wc` | WC | combined | `{}` |
| `boiler` | Calefón / caldera | water | `{}` |

#### Red de desagüe

| type | label UI | network | properties |
|------|----------|---------|------------|
| `drain-exit` | Salida de desagüe | drainage | `{}` |
| `wc-drain` | Desagüe WC | drainage | `{ diameter: 100 }` |
| `shower-drain` | Sifón de ducha | drainage | `{ diameter: 50 }` |
| `sink-drain` | Sifón de lavamanos | drainage | `{ diameter: 50 }` |
| `floor-drain` | Sumidero | drainage | `{ diameter: 50 }` |
| `washing-drain` | Desagüe lavadora | drainage | `{ diameter: 50 }` |
| `cleanout` | Tapón de inspección | drainage | `{}` |
| `inspection-chamber` | Cámara domiciliaria | drainage | `{}` |

Los elementos `combined` (WC, ducha, lavamanos, lavadora) generan nodos en **ambas** redes (agua y desagüe) cuando se ejecutan los algoritmos.

### UI

Panel lateral colapsable con tres secciones (Electricidad / Agua / Desagüe). Cada elemento tiene un icono SVG simple + label. Clic para seleccionar → clic en el canvas para colocar. El elemento se puede rotar con `R` y borrar con `Delete`.

---

## HOUSE_03 — Dibujo manual de tuberías/conductos + sistema de capas

### Modelo de segmentos

```js
NetworkSegment = {
  id,
  network: 'electrical'|'water'|'drainage',
  points: Point[],           // polilínea, mínimo 2 puntos
  subtype: 'cold'|'hot'|null, // solo para water
  diameter: number|null,     // mm, para agua y desagüe
  isExternal: boolean,       // pasa fuera del polígono de la casa
  floor,
}
```

Persiste en `detail.networkSegments[]`.

### Herramienta de dibujo por red

Toolbar secundario (aparece cuando la capa está activa):
- `pipe-electrical`: conduit eléctrico. Snap a 0°/45°/90°.
- `pipe-water`: tubería de agua. Snap preferente a 0°/90°. Si el usuario dibuja en diagonal, mostrar advertencia: "Evitar diagonales en tuberías de agua (dificulta reparaciones)".
- `pipe-drainage`: tubería de desagüe. **Prohibir ángulos de 90°**. Si el usuario intenta un codo de 90°, reemplazar automáticamente con dos segmentos de 45° con un tramo corto intermedio de 5 cm. Los segmentos exteriores se marcan `isExternal: true` y se renderizan con línea discontinua de color diferente.

### Sistema de capas y visibilidad

```js
layers = {
  architectural: { visible: true, color: '#555555' },
  electrical:    { visible: true, color: '#F59E0B' },
  water:         { visible: true, color: '#3B82F6' },
  drainage:      { visible: true, color: '#16A34A' },
}
```

Toolbar de capas: fila de toggles con icono + label. Al ocultar una capa, se ocultan sus `NetworkElement` y `NetworkSegment` correspondientes.

Convención de color de agua:
- Agua fría: azul (`#3B82F6`)
- Agua caliente: rojo (`#EF4444`)

---

## HOUSE_04 — Validación en tiempo real

Validaciones que se evalúan en cada cambio y se muestran como marcadores rojos en el canvas:

| Red | Restricción | Indicador |
|-----|-------------|-----------|
| Eléctrica | Caja con > 3 salidas | caja roja + tooltip "Máx 3 salidas (norma SEC)" |
| Eléctrica | Elemento sin conexión al tablero | punto rojo sobre el elemento |
| Eléctrica | Circuito especial comparte caja | advertencia amarilla |
| Agua | Fixture sin conexión al punto de entrada | punto rojo |
| Agua | Segmento diagonal (ángulo > 5° de ortogonal) | segmento naranja + tooltip |
| Desagüe | Codo de 90° detectado | codo rojo + tooltip "Usar 45° (ver NCh 1360)" |
| Desagüe | Fixture sin conexión a la salida | punto rojo |
| Desagüe | Pendiente insuficiente si se conocen alturas | advertencia |

Implementar en `src/utils/houseValidation.js`:
```js
validateHouse(detail) -> ValidationResult[]
ValidationResult = { elementId|segmentId, severity: 'error'|'warning', message }
```

---

## HOUSE_05 — Algoritmo red eléctrica

### Referencia normativa
- NCh Elec. 4/2003 (Ministerio de Vivienda, Chile): instalaciones interiores.
- SEC: cada circuito de iluminación máx 15 A; cada circuito de enchufes máx 20 A.
- Los enchufes especiales (lavadora, horno, AC, calefón eléctrico) van en circuito dedicado directo al tablero, sin compartir caja.
- Cada caja de conexión (junction box): máx 1 entrada, máx 3 salidas.

### Algoritmo

Entrada: `{ mainPanel, elements[], rooms[] }`.
Salida: `{ segments: NetworkSegment[], autoBoxes: NetworkElement[], warnings: string[] }`.

**Paso 1 — Clasificación de circuitos**:
- `lighting`: todos los `light-point` y `switch`.
- `outlets`: todos los `outlet` (15 A / 20 A no especial).
- `special`: `outlet-special` (lavadora, horno, etc.). Cada uno va directo al tablero.

**Paso 2 — Clustering por cuarto**:
- Agrupar `lighting` y `outlets` por el cuarto en que están ubicados.
- Por cuarto: insertar una caja de distribución (`junction-box`) en el centroide del cuarto.

**Paso 3 — Árbol de distribución desde el tablero**:
- Construir MST (Prim) desde el tablero a todas las cajas de cuarto.
- Verificar que cada caja tiene ≤ 3 salidas. Si no, insertar caja intermediaria entre el tablero y el grupo.
- Los circuitos especiales se conectan directamente al tablero (aristas directas).

**Paso 4 — Routing ortogonal**:
- Los conductos siguen paredes interiores. Para cada arista del árbol, encontrar la ruta Manhattan (horizontal + vertical) que minimice cruces de cuartos.
- Si la ruta debe cruzar una pared, registrar el punto de penetración.

**Paso 5 — Distribución intra-cuarto**:
- Desde la caja del cuarto, árbol a cada elemento, respetando la regla 1+3. Insertar cajas adicionales si es necesario.
- Routing ortogonal dentro del cuarto.

**Implementar en**: `src/utils/electricalAlgorithm.js`.

---

## HOUSE_06 — Algoritmo red de agua

### Referencia normativa
- NCh 2485 (Instalaciones domiciliarias de agua potable, Chile).
- Reglas prácticas: tuberías en paredes o cielo, nunca diagonales enterradas. Preferir trunk principal largo con ramificaciones cortas.
- Pérdida de presión: aumenta con longitud y número de codos. Minimizar tramos largos a fixtures de alta demanda (ducha, lavadora).

### Variantes de distribución

**Árbol clásico** (default): tronco principal desde la entrada, ramificaciones a cada cuarto, sub-ramificaciones a cada fixture.

**Manifold** (variante): un colector central cerca de la entrada distribuye una tubería individual a cada fixture. Mayor material pero totalmente independiente por fixture, fácil de aislar. Ofrecer como opción.

### Algoritmo (árbol clásico)

Entrada: `{ waterEntry, boiler?, elements[], walls[], rooms[] }`.
Salida: `{ coldSegments: NetworkSegment[], hotSegments: NetworkSegment[], warnings[] }`.

**Paso 1 — Separar fixtures**:
- Fixtures de agua fría: `wc`, `water-tap(cold)`.
- Fixtures de agua caliente: `water-tap(hot)`.
- Fixtures de ambas: `shower-head`, `sink`, `washing-machine`, `water-tap(both)`.

**Paso 2 — Red de agua fría**:
- Steiner tree aproximado (Prim MST sobre los fixtures fríos + entrada).
- Routing ortogonal siguiendo paredes.
- Resultado: `NetworkSegment[]` con `subtype: 'cold'`.

**Paso 3 — Red de agua caliente** (si hay calefón):
- Desde la entrada hasta el calefón: tramo frío.
- Desde el calefón: Steiner tree hacia fixtures calientes.
- Resultado: `NetworkSegment[]` con `subtype: 'hot'`.

**Paso 4 — Optimización**:
- Combinar tramos compartidos en un tronco común antes de bifurcar.
- Asegurar que no hay segmentos diagonales (ángulo > 5° de ortogonal).
- Calcular longitud total y distancia máxima a fixture (métricas, no restricciones duras).

**Implementar en**: `src/utils/waterAlgorithm.js`.

---

## HOUSE_07 — Algoritmo red de desagüe

### Referencia normativa
- NCh 1360 (Instalaciones de alcantarillado domiciliario, Chile).
- Reglas críticas:
  - Nunca ángulos de 90°. Los cambios de dirección deben hacerse con dos codos de 45° separados por un tramo corto (mínimo 5 cm).
  - Pendiente mínima 1%, recomendada 2% (2 cm de bajada por metro de tubería).
  - WC: diámetro mínimo 100 mm (4").
  - Resto de fixtures: diámetro mínimo 50 mm (2").
  - Cleanout cada 15 m de tramo recto y en cada cambio de dirección mayor.
  - Los sifones requieren ventilación (vent stack) para evitar sifonamiento; modelar como pendiente para implementación futura.

### Preferencia exterior

Los segmentos de desagüe que pueden ir por fuera del polígono de la casa deben hacerlo. Esto facilita reparaciones sin picar losas.

**Definición de "exterior viable"**: un segmento es exterior si su trayectoria no pasa por el interior del polígono de la casa (paredes exteriores). El algoritmo debe verificar esto con un test punto-en-polígono.

### Algoritmo

Entrada: `{ drainExit, elements[], housePolygon, walls[] }`.
Salida: `{ segments: NetworkSegment[], autoCleanouts: NetworkElement[], warnings[] }`.

**Paso 1 — Clasificar fixtures**:
- Grupo A (WC): diámetro 100 mm. Conectar lo más directo posible a la salida.
- Grupo B (resto): diámetro 50 mm. Colectores por zona.

**Paso 2 — Colectores por zona**:
- Agrupar fixtures por cuarto. Cada cuarto genera un colector que converge hacia la salida.
- Intentar enrutar el colector por el exterior del cuarto cuando sea posible.

**Paso 3 — Routing exterior preferido**:
- Para cada arista del árbol, evaluar si puede ir por fuera de `housePolygon`.
  - Si sí: enrutar por exterior (marcado `isExternal: true`).
  - Si no (ej. cuartos centrales): enrutar por el interior, cerca de paredes.

**Paso 4 — Eliminar ángulos de 90°**:
- Recorrer el árbol. En cada nodo donde dos segmentos se unen con ángulo ≈ 90°:
  - Insertar un tramo intermedio de 5 cm a 45° entre ambos segmentos.
  - El resultado es una secuencia: `segmento A → codo 45° → tramo corto → codo 45° → segmento B`.

**Paso 5 — Pendientes**:
- Asignar alturas relativas: el punto de salida es z = 0. Cada nodo aguas arriba recibe z = distancia_al_nodo_siguiente * pendiente.
- Pendiente default: 2%. Ajustable.
- Si la pendiente no se puede mantener (fixture demasiado cerca de la salida), emitir advertencia.

**Paso 6 — Cleanouts**:
- Insertar `cleanout` en cada cambio de dirección y cada 15 m de tramo recto.

**Implementar en**: `src/utils/drainageAlgorithm.js`.

---

## HOUSE_08 — Importar fondo DXF/SVG

Permitir al usuario importar un archivo DXF o SVG como imagen de fondo en el canvas de la planta.

- DXF: leer con librería `dxf-parser` (npm). Extraer entidades `LINE` y `LWPOLYLINE` como fondo de referencia (no editables).
- SVG: incrustado directamente como `<image>` en el SVG del canvas.
- El fondo es solo visual; no se convierte automáticamente en paredes. El usuario redibuja encima.
- Toggle "Mostrar fondo" en el toolbar.
- Almacenado en `detail.backgroundImage: { type: 'svg'|'dxf', dataUrl, opacity }`.

---

## HOUSE_09 — Exportación por capa

Generar PDF o SVG de la planta con selección de capas a incluir.

- Reutilizar `pdfExport.js` existente.
- Añadir modal de exportación: checkboxes por capa + resolución.
- Cada capa exportada incluye leyenda de colores/diámetros/calibres.

---

## Modelo de datos completo

Extensión del objeto `detail` del elemento `casa`:

```js
{
  // Existentes
  walls:   Wall[],
  labels:  Label[],
  floors:  number,
  roofType: string,

  // HOUSE_01
  doors:   Door[],
  windows: Window[],
  rooms:   Room[],
  guides:  Guide[],     // { id, axis: 'h'|'v', position }

  // HOUSE_02
  networkElements: NetworkElement[],

  // HOUSE_03
  networkSegments: NetworkSegment[],
  layers: LayerConfig,  // visibilidad por capa

  // HOUSE_08
  backgroundImage: { type, dataUrl, opacity } | null,
}
```

---

## Consideraciones de implementación

### Tests

Cada módulo de algoritmo (`roomDetection.js`, `electricalAlgorithm.js`, `waterAlgorithm.js`, `drainageAlgorithm.js`, `houseValidation.js`) debe tener su archivo de test en `src/utils/__tests__/`. Los tests deben cubrir:
- Caso base (planta rectangular simple).
- Restricciones violadas (caja con 4 salidas, codo de 90° en desagüe, etc.).
- Sin fixtures (no crash).

### Historial de deshacer

`CasaSectionView` debe tener su propia instancia de `useUndoHistory` (ya existe en `src/utils/useUndoHistory.js`), independiente del historial del editor de terreno.

### Integración con el editor de terreno

- El editor de casa se abre desde el panel de detalle de un elemento `casa`.
- La planta comparte el sistema de coordenadas del elemento (metros, origen en la esquina superior izquierda del bounding box del elemento).
- El perímetro exterior de la casa es el rectángulo `element.width × element.height` (o el polígono de la forma del elemento si aplica).

### Rendimiento

- La detección de cuartos se ejecuta solo cuando cambian las paredes (no en cada render).
- La validación en tiempo real usa debounce de 300 ms.
- Los algoritmos de red se ejecutan bajo demanda (botón "Generar red"), no automáticamente.

### Normas de referencia para implementadores

- **Eléctrica**: NCh Elec. 4/2003, reglamento SEC Chile. Una caja de conexión: máx 1 entrada + 3 salidas.
- **Agua potable**: NCh 2485. Tuberías en paredes o cielo. Sin diagonales. Pendiente hacia abajo para facilitar vaciado.
- **Alcantarillado**: NCh 1360. Sin codos de 90° (usar 45°). Pendiente mínima 1%. WC: 100 mm. Resto: 50 mm. Preferir exterior. Cleanouts cada 15 m.

---

## Persistencia y exportación

### Dónde vive el dato

Todo el contenido del editor de casa se guarda dentro de `element.detail` del elemento `casa` en el array `elements` del proyecto. El archivo `.hdist.json` ya serializa `elements` completo (incluyendo `detail`), por lo que **no se requiere ningún cambio a `projectIO.js`**.

La arquitectura de export/import se describe en detalle en `plan/SCHEMA_COMPAT.md`.

### Versión de schema

El schema de `casa` pasa de `casa@2` a `casa@3` al implementar HOUSE_EDITOR. Los campos nuevos tienen array vacío o `null` como valor por defecto, lo que garantiza que archivos con `casa@2` abran sin error.

**Archivos a modificar**:

1. `src/data/detailSchemas/casa.js` — incrementar `version` a 3, añadir nuevos campos a `defaults`:
   ```js
   defaults: {
     // existentes
     floors: 1, bedrooms: 3, bathrooms: 1, roofType: 'a dos aguas',
     construction: 'hormigón', notes: '', walls: [], labels: [],
     // nuevos en v3
     doors: [], windows: [], rooms: [], guides: [],
     networkElements: [], networkSegments: [],
     layers: { architectural: { visible: true }, electrical: { visible: true },
               water: { visible: true }, drainage: { visible: true } },
     backgroundImage: null,
   }
   ```

2. `src/utils/detailUtils.js` — añadir migración `v2 → v3` en `migrateDetail`:
   ```js
   if (schema === 'casa' && fromVersion < 3) {
     detail.doors           ??= [];
     detail.windows         ??= [];
     detail.rooms           ??= [];
     detail.guides          ??= [];
     detail.networkElements ??= [];
     detail.networkSegments ??= [];
     detail.layers          ??= DEFAULT_LAYERS;
     detail.backgroundImage ??= null;
     detail._schema = 'casa@3';
   }
   ```

3. Tests en `src/utils/__tests__/detailSchemas.test.js`: verificar que un `detail` con `_schema: 'casa@2'` migra a v3 con todos los campos nuevos presentes y vacíos.

### Checklist de schema (obligatorio antes de merge)

- [ ] `casa.js` versión = 3.
- [ ] `defaults` incluye todos los campos nuevos.
- [ ] `migrateDetail` cubre `v2 → v3`.
- [ ] Test de migración pasa.
- [ ] Tabla en `SCHEMA_COMPAT.md` actualizada con `casa@3`.
- [ ] Archivo guardado con v2 abre sin error en la nueva versión.

---

## Orden de implementación sugerido

1. **HOUSE_01a**: puertas y ventanas (modelo + render SVG).
2. **HOUSE_01b**: detección de cuartos (algoritmo de grafo planar).
3. **HOUSE_01c**: tipos de cuarto + visualización por color.
4. **HOUSE_01d**: guías arrastrables.
5. **HOUSE_02**: paleta de elementos de red.
6. **HOUSE_03**: dibujo de tuberías + capas + restricción 45° en desagüe.
7. **HOUSE_04**: validación en tiempo real.
8. **HOUSE_05**: algoritmo eléctrico.
9. **HOUSE_06**: algoritmo de agua.
10. **HOUSE_07**: algoritmo de desagüe.
11. **HOUSE_08** y **HOUSE_09**: importación y exportación (opcionales, bajo demanda).
