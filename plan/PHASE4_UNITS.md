# Fase 4: Medidas y Relaciones Espaciales — Unidades de Trabajo TDD

Basado en `04_medidas_y_relaciones_espaciales.md`. Cada unidad sigue el ciclo RED → GREEN → REFACTOR.

## Estado

| Unit ID | Descripción | Dependencias | Estado |
|---------|-------------|--------------|--------|
| **F4-U1** | `distanceUtils.js` — distancias entre formas | — | ⬜ Pendiente |
| **F4-U2** | `constraintUtils.js` — validación de restricciones | F4-U1 | ⬜ Pendiente |
| **F4-U3** | `measurementConfig` data model + estado en App | — | ⬜ Pendiente |
| **F4-U4** | `MeasurementToolkit` — panel de herramientas | F4-U3 | ⬜ Pendiente |
| **F4-U5** | `MeasurementOverlay` — herramienta de regla punto-a-punto | F4-U1, F4-U3 | ⬜ Pendiente |
| **F4-U6** | `MeasurementOverlay` — herramienta de área poligonal | F4-U1, F4-U3 | ⬜ Pendiente |
| **F4-U7** | Medidas en tiempo real al seleccionar elemento | F4-U1, F4-U2 | ⬜ Pendiente |
| **F4-U8** | `ConstraintPanel` — CRUD de reglas de distancia | F4-U2, F4-U3 | ⬜ Pendiente |
| **F4-U9** | Indicadores visuales de violación en canvas | F4-U2, F4-U5 | ⬜ Pendiente |
| **F4-U10** | Integración en App + teclas M / shortcuts | F4-U4..F4-U9 | ⬜ Pendiente |

---

## F4-U1: `distanceUtils.js` — distancias entre formas

**Archivos:**
- `src/utils/distanceUtils.js`
- `src/utils/__tests__/distanceUtils.test.js`

**Funciones a implementar:**

```js
distancePointToPoint(p1, p2)
// → number (metros)

distancePointToSegment(point, segA, segB)
// → number — distancia perpendicular mínima del punto al segmento

distancePointToPolygon(point, polygon)
// → number — distancia mínima al borde del polígono (0 si está dentro)

distanceRectToRect(rectA, rectB)
// → number — 0 si se solapan
// rect = { x, y, width, height } — x,y = centro en metros

distanceCircleToCircle(circA, circB)
// → number — 0 si se solapan
// circ = { x, y, radius } — centro en metros

distanceRectToCircle(rect, circle)
// → number — 0 si se solapan

distanceElementToElement(elA, elB)
// → number — despacha al tipo correcto (shape: 'rectangle' | 'circle')

distanceElementToTerrain(element, terrainPoints, baseScale)
// → number — distancia borde-a-borde desde el elemento al límite más cercano del terreno
//   terrainPoints en layer pixels (metros × baseScale)
```

**Tests (RED first):**

```
distancePointToPoint:
- (0,0)→(3,4) = 5
- mismo punto = 0

distancePointToSegment:
- punto sobre el segmento = 0
- punto perpendicular a mitad del segmento = distancia perpendicular exacta
- punto más allá de un extremo = distancia al extremo

distancePointToPolygon:
- punto dentro del polígono = 0
- punto fuera → distancia al borde más cercano

distanceRectToRect:
- rectángulos separados horizontalmente: distancia = separación entre bordes
- rectángulos separados diagonalmente: distancia euclidiana borde-borde
- rectángulos solapados = 0
- rectángulos tocándose = 0

distanceCircleToCircle:
- círculos separados: distancia = dist_centros - r1 - r2
- círculos solapados = 0
- círculos tangentes = 0

distanceRectToCircle:
- círculo fuera del rect: distancia correcta
- círculo tocando borde = 0
- círculo solapando rect = 0

distanceElementToTerrain:
- elemento en el centro de un terreno grande → distancia > 0
- elemento en el borde del terreno → ≈ 0
```

**Notas de implementación:**
- `distanceRectToRect`: calcular por separado en eje X e Y, luego `sqrt(dx² + dy²)` si ambos positivos, o el que sea positivo si solo uno lo es (si uno de los ejes se solapa):
  ```js
  const dx = Math.max(0, Math.abs(ax - bx) - (aw + bw) / 2);
  const dy = Math.max(0, Math.abs(ay - by) - (ah + bh) / 2);
  return Math.sqrt(dx*dx + dy*dy);
  ```
- `distanceRectToCircle`: distancia del centro del círculo al borde del rect, menos el radio
- `distanceElementToTerrain`: convertir elemento a metros, convertir terrain a metros dividiendo por baseScale, luego medir distancia al polígono
- Todos los cálculos en metros (elementos ya en metros; terrain en layer pixels → dividir por baseScale)

---

## F4-U2: `constraintUtils.js` — validación de restricciones

**Archivos:**
- `src/utils/constraintUtils.js`
- `src/utils/__tests__/constraintUtils.test.js`

**Funciones a implementar:**

```js
validateConstraint(constraint, elements, terrainPoints, baseScale)
// → { valid: boolean, actualDistance: number, requiredDistance: number }

validateAllConstraints(constraints, elements, terrainPoints, baseScale)
// → Array<{ constraint, valid, actualDistance, requiredDistance }>

getDefaultConstraints(elementDefinitions)
// → Array<constraint> — reglas predeterminadas según tipo de elemento
//   ej: casa → 3m desde límite del terreno, arbol_frutal → 2m de separación entre árboles
```

**Estructura de una constraint:**
```js
{
  id: string,
  name: string,
  type: 'min-distance',          // fase 4 solo implementa min-distance
  sourceId: string | 'terrain',  // elementId o 'terrain'
  targetId: string | 'terrain',
  value: number,                 // distancia mínima en metros
  enabled: boolean,
}
```

**Tests (RED first):**
- `validateConstraint` con dos elementos a distancia mayor que el mínimo → `valid: true`
- `validateConstraint` con dos elementos muy cerca → `valid: false`
- `validateConstraint` con elemento y terreno → usa distanceElementToTerrain
- `validateConstraint` deshabilitada (`enabled: false`) → siempre `valid: true`
- `validateAllConstraints` retorna un resultado por cada constraint habilitada
- `getDefaultConstraints` retorna constraints para `casa` (setback del terreno ≥ 3m)
- `getDefaultConstraints` retorna constraints para `arbol_frutal` (separación ≥ 2m entre árboles)
- Distancia exactamente igual al mínimo → `valid: true`
- Distancia ligeramente menor → `valid: false`

---

## F4-U3: `measurementConfig` data model + estado en App

**Archivos:**
- `src/utils/measurementConfigUtils.js`
- `src/utils/__tests__/measurementConfigUtils.test.js`
- `src/App.jsx` — nuevo estado `measurementConfig`

**Estructura:**
```js
export const defaultMeasurementConfig = {
  activeTool: 'none',        // 'none' | 'distance' | 'area' | 'angle'
  showMeasurements: true,
  showConstraints: true,
  activeMeasurements: [],    // mediciones dibujadas por el usuario
  constraints: [],           // reglas de distancia activas
};
```

**Funciones:**
```js
addMeasurement(config, measurement)
// → nuevo config con measurement añadido a activeMeasurements

removeMeasurement(config, id)
// → nuevo config sin esa medición

clearMeasurements(config)
// → nuevo config con activeMeasurements = []

setActiveTool(config, tool)
// → nuevo config con activeTool = tool

addConstraint(config, constraint)
// → nuevo config con constraint añadida

removeConstraint(config, id)
// → nuevo config sin esa constraint

toggleConstraint(config, id)
// → nuevo config con enabled alternado en esa constraint
```

**Tests:**
- `addMeasurement` no muta el original
- `removeMeasurement` filtra por id correctamente
- `clearMeasurements` vacía el array
- `setActiveTool` solo cambia activeTool
- `addConstraint` / `removeConstraint` / `toggleConstraint` funcionan correctamente
- Todas las funciones retornan nuevos objetos (inmutabilidad)

---

## F4-U4: `MeasurementToolkit` — panel de herramientas

**Archivos:**
- `src/components/MeasurementToolkit.jsx`
- `src/components/__tests__/MeasurementToolkit.test.jsx`

**Props:** `{ activeTool, onSelectTool, onClearMeasurements, showMeasurements, showConstraints, onToggleMeasurements, onToggleConstraints }`

**Herramientas:**
| Botón | tool value | Descripción |
|-------|-----------|-------------|
| Regla | `'distance'` | Medir distancia punto-a-punto |
| Área | `'area'` | Definir polígono para calcular área |
| Limpiar | — | Borra todas las mediciones activas |

**Tests (RED first):**
- Renderiza botones "Regla", "Área", "Limpiar"
- Click en "Regla" llama `onSelectTool('distance')`
- Click en "Área" llama `onSelectTool('area')`
- Click en "Limpiar" llama `onClearMeasurements()`
- Herramienta activa tiene `aria-pressed="true"`
- Checkbox "Mostrar mediciones" llama `onToggleMeasurements`
- Checkbox "Mostrar restricciones" llama `onToggleConstraints`
- Tiene encabezado "Medidas"

---

## F4-U5: `MeasurementOverlay` — herramienta de regla

**Archivos:**
- `src/components/MeasurementOverlay.jsx`
- `src/components/__tests__/MeasurementOverlay.test.jsx`

**Props:** `{ activeTool, activeMeasurements, scale, position, baseScale, width, height, onAddMeasurement, onCancel }`

Este componente se renderiza dentro del Konva Stage (como un Layer adicional).

**Comportamiento de la herramienta de regla (`activeTool='distance'`)**:
1. Primer click en canvas → registra punto inicial
2. Segundo click → registra punto final, calcula distancia y llama `onAddMeasurement`
3. Mientras se mueve el mouse → muestra línea de preview desde punto inicial al cursor
4. Escape → cancela la medición en curso

**Tests (RED first):**
- Con `activeTool='none'`, no renderiza elementos de medición interactivos
- Con `activeTool='distance'`, renderiza layer de captura de clicks (`data-testid="measurement-layer"`)
- Mediciones guardadas se renderizan como líneas con etiqueta (`data-testid="measurement-line"`, `data-testid="measurement-label"`)
- Etiqueta muestra la distancia en metros con 2 decimales
- Preview line se renderiza mientras hay un primer punto definido (`data-testid="measurement-preview"`)
- Escape cancela y limpia el primer punto

**Mock de Konva para tests:**
```js
vi.mock('react-konva', () => ({
  Layer: ({ children, onClick, onMouseMove }) => (
    <div data-testid="measurement-layer" onClick={onClick} onMouseMove={onMouseMove}>{children}</div>
  ),
  Line: ({ points, ...props }) => <div data-testid={props['data-testid'] || 'konva-line'} {...props} />,
  Circle: (props) => <div data-testid={props['data-testid'] || 'konva-circle'} {...props} />,
  Text: ({ text, ...props }) => <span data-testid={props['data-testid'] || 'konva-text'} {...props}>{text}</span>,
  Group: ({ children, ...props }) => <div {...props}>{children}</div>,
}));
```

**Notas de implementación:**
- Internamente mantiene `firstPoint` (estado local) para la herramienta en progreso
- Al cambiar `activeTool`, resetea `firstPoint`
- La distancia calculada se convierte de píxeles a metros: `dist / baseScale` (los puntos de click son en coordenadas de layer)
- Para capturar el click en canvas, el Layer necesita ser transparente pero capturar eventos

---

## F4-U6: `MeasurementOverlay` — herramienta de área

Extiende `MeasurementOverlay.jsx` con soporte para `activeTool='area'`.

**Comportamiento:**
1. Cada click agrega un vértice al polígono en construcción
2. Doble-click (o click sobre el primer punto) cierra el polígono y calcula el área
3. Se muestra el polígono en construcción con área provisional
4. Al cerrar → llama `onAddMeasurement` con type='area'

**Tests adicionales (RED first):**
- Con `activeTool='area'`, cada click agrega un vértice (internamente)
- Al cerrar polígono, llama `onAddMeasurement` con `{ type: 'area', value: number }`
- Polígono en construcción se renderiza (`data-testid="area-preview"`)
- Área calculada se muestra en la etiqueta
- Polígonos de área guardados se renderizan (`data-testid="area-polygon"`)

---

## F4-U7: Medidas en tiempo real al seleccionar elemento

**Archivos modificados:**
- `src/components/MeasurementOverlay.jsx` — agregar capa de medidas automáticas
- `src/App.jsx` — pasar elemento seleccionado a MeasurementOverlay

**Comportamiento:**
Cuando hay un elemento seleccionado (`selectedElementId != null`) y `showMeasurements=true`:
1. Mostrar la distancia del elemento al límite del terreno más cercano (línea desde borde del elemento hasta el límite del terreno)
2. Para cada par de elementos suficientemente cerca (< 10m), mostrar la distancia entre ellos

**Tests (RED first):**
- Con elemento seleccionado, renderiza `data-testid="auto-distance-line"` hacia el borde del terreno
- Con elemento seleccionado, la etiqueta muestra la distancia al terreno en metros
- Sin elemento seleccionado, no renderiza auto-distance-lines
- Con dos elementos cerca uno del otro (< 10m), renderiza distancia entre ellos
- Las líneas automáticas son de color diferente (azul) a las mediciones manuales

---

## F4-U8: `ConstraintPanel` — CRUD de restricciones

**Archivos:**
- `src/components/ConstraintPanel.jsx`
- `src/components/__tests__/ConstraintPanel.test.jsx`

**Props:** `{ constraints, elements, onAddConstraint, onRemoveConstraint, onToggleConstraint, validationResults }`

**Tests (RED first):**
- Renderiza lista de constraints con nombre y valor
- Constraint inválida se muestra con indicador rojo (`data-testid="constraint-violation"`)
- Constraint válida se muestra con indicador verde
- Click en checkbox habilita/deshabilita la constraint (`onToggleConstraint`)
- Click en botón eliminar llama `onRemoveConstraint(id)`
- Formulario para añadir nueva constraint (nombre, tipo fuente, tipo destino, valor mínimo)
- Submit del formulario llama `onAddConstraint` con la nueva constraint
- Tiene encabezado "Restricciones"
- Botón "Aplicar predeterminadas" llama `onAddConstraint` para cada constraint por defecto

---

## F4-U9: Indicadores visuales de violación en canvas

**Archivos modificados:**
- `src/components/MeasurementOverlay.jsx` — agregar capa de violaciones
- `src/components/PlacedElementsLayer.jsx` — borde rojo en elementos que violan restricciones

**Comportamiento:**
- Elementos que violan una constraint se resaltan con borde rojo
- En el canvas se dibuja una línea roja entre los elementos en conflicto, con etiqueta mostrando la distancia actual y la requerida

**Tests (RED first):**
- Elemento con violación activa tiene stroke rojo en PlacedElementsLayer
- `data-testid="violation-line"` aparece en MeasurementOverlay cuando hay violaciones
- Etiqueta de violación muestra formato "actual: Xm / mínimo: Ym"
- Elemento sin violación no tiene stroke rojo (tiene su stroke normal)
- Con `showConstraints=false` no aparecen indicadores de violación

---

## F4-U10: Integración en App + tecla M

**Archivos modificados:**
- `src/App.jsx` — nuevo estado `measurementConfig`, handlers, paso de props a TerrainCanvas
- `src/components/Toolbar.jsx` — botón "Medidas"
- `src/components/TerrainCanvas.jsx` — renderizar MeasurementOverlay dentro del Stage

**Estado nuevo en App:**
```js
const [measurementConfig, setMeasurementConfig] = useState(defaultMeasurementConfig);
const [measurementPanelOpen, setMeasurementPanelOpen] = useState(false);
```

**Handlers en App:**
```js
handleAddMeasurement(measurement)     // addMeasurement(config, measurement)
handleClearMeasurements()             // clearMeasurements(config)
handleSetActiveTool(tool)             // setActiveTool(config, tool)
handleAddConstraint(constraint)       // addConstraint(config, constraint)
handleRemoveConstraint(id)            // removeConstraint(config, id)
handleToggleConstraint(id)            // toggleConstraint(config, id)
```

**Tests (RED first):**
- Toolbar muestra botón "Medidas" cuando `finished=true`
- Click en "Medidas" abre/cierra panel
- Tecla `M` alterna `activeTool` entre `'distance'` y `'none'`
- MeasurementOverlay se renderiza dentro de TerrainCanvas cuando `measurementConfig.activeTool !== 'none'`
- Con `activeTool='distance'` el cursor en canvas cambia a crosshair (data-cursor prop)

---

## Integración final en TerrainCanvas

```jsx
{/* Dentro del Stage, después de PlacedElementsLayer */}
<MeasurementOverlay
  activeTool={measurementConfig.activeTool}
  activeMeasurements={measurementConfig.activeMeasurements}
  constraints={measurementConfig.constraints}
  validationResults={validationResults}
  selectedElementId={selectedElementId}
  elements={placedElements}
  terrainPoints={points}
  scale={scale}
  position={position}
  baseScale={baseScale}
  width={stageWidth}
  height={stageHeight}
  showMeasurements={measurementConfig.showMeasurements}
  showConstraints={measurementConfig.showConstraints}
  onAddMeasurement={onAddMeasurement}
  onCancel={() => onSetActiveTool('none')}
/>
```

---

## Notas de implementación

### Coordenadas en MeasurementOverlay

Los clicks en el Konva Stage vienen en coordenadas de stage (píxeles con zoom/pan). Para convertir a metros:
```js
// stage px → layer px → metros
const layerX = (stageX - position.x) / scale;
const layerY = (stageY - position.y) / scale;
const meters = { x: layerX / baseScale, y: layerY / baseScale };
```

Para renderizar en stage desde metros:
```js
const stageX = meters.x * baseScale * scale + position.x;
const stageY = meters.y * baseScale * scale + position.y;
```

### Paleta de colores

| Propósito | Color |
|-----------|-------|
| Medición manual | `#2196F3` (azul) |
| Auto-distancia (elemento seleccionado) | `#00BCD4` (cian) |
| Violación de restricción | `#F44336` (rojo) |
| Válida | `#4CAF50` (verde) |
| Preview (en construcción) | `#9E9E9E` (gris) con dash |

### Cálculo de área con shoelace

```js
export const calculatePolygonArea = (points) => {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
  }
  return Math.abs(area / 2);
};
```

### Restricciones predeterminadas por tipo de elemento

| Elemento | Restricción | Valor |
|----------|-------------|-------|
| `casa` | distancia mínima al límite del terreno | 3 m |
| `casa` | separación mínima de otra casa | 5 m |
| `arbol_frutal` | separación entre árboles frutales | 4 m |
| `gallinero` | distancia mínima a la casa | 5 m |
| `compost` | distancia mínima a la casa | 3 m |
| `piscina` | distancia mínima al límite del terreno | 2 m |
| `huerto` | distancia mínima al gallinero | 2 m |

### Mock de react-konva para nuevos tests

El mismo mock de TerrainCanvas.test.jsx es suficiente. Agregar si falta:
```js
Group: ({ children, onClick, onMouseMove, ...props }) => (
  <div onClick={onClick} onMouseMove={onMouseMove} {...props}>{children}</div>
),
```

---

## Consideraciones de diseño TDD

- **F4-U1** y **F4-U3** son puramente funciones puras → tests directos, sin mocks de React.
- **F4-U2** depende de F4-U1 pero también es pura → tests directos.
- **F4-U5** y **F4-U6** tienen estado interno (primer punto, vértices en construcción) → tests con RTL + eventos simulados.
- **F4-U7** y **F4-U9** se pueden implementar como extensiones de `MeasurementOverlay` → mismos tests, nuevos casos.
- **F4-U8** y **F4-U4** son componentes React sin lógica de canvas → tests RTL estándar.
- **F4-U10** integra todo → tests de Toolbar + smoke tests de integración en TerrainCanvas.

---

*Documento generado el 2026-03-29. Actualizar estado de cada unidad al completarla.*
