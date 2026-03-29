# Fase 2: Elementos Arrastrables — Unidades de Trabajo TDD

Basado en `02_elementos_arrastrables.md`. Cada unidad sigue el ciclo RED → GREEN → REFACTOR.

## Estado

| Unit ID | Descripción | Dependencias | Estado |
|---------|-------------|--------------|--------|
| **F2-U1** | Definiciones de elementos (data model) | — | ✅ Completo |
| **F2-U2** | ElementLibraryPanel component | F2-U1 | ✅ Completo |
| **F2-U3** | Colocar elementos en canvas (click to place) | F2-U1, F2-U2 | ✅ Completo |
| **F2-U4** | PlacedElementsLayer — render + drag para mover | F2-U1, F2-U3 | ✅ Completo |
| **F2-U5** | Seleccionar + Delete para eliminar | F2-U4 | ✅ Completo |
| **F2-U6** | Colisión: elementos quedan dentro del terreno | F2-U3, F2-U4 | ✅ Completo |
| **F2-U7** | Handles de redimensionamiento | F2-U4, F2-U5 | ✅ Completo |
| **F2-U8** | Handle de rotación | F2-U4, F2-U5 | ✅ Completo |
| **F2-U9** | Duplicar elemento (Ctrl+D) | F2-U5 | ✅ Completo |
| **F2-U10** | Snap a cuadrícula + alineación | F2-U4 | ✅ Completo |

---

## F2-U1: Definiciones de elementos

**Archivos:**
- `src/data/elementDefinitions.js`
- `src/data/__tests__/elementDefinitions.test.js`

**Tests a escribir (RED):**
- Existen exactamente 8 tipos de elementos
- Cada elemento tiene: `id`, `name`, `shape`, `defaultWidth`, `defaultHeight`, `color`, `borderColor`, `borderWidth`, `properties`
- El tipo círculo (`arbol_frutal`) tiene campo `defaultRadius`
- `properties` contiene: `sunNeeds`, `waterNeeds`, `minSpacing`
- `getElementDefinition(id)` retorna la definición correcta
- `getElementDefinition('nonexistent')` retorna `undefined`

**Tipos a implementar:**
| id | name | shape | defaultWidth | defaultHeight | defaultRadius |
|----|------|-------|-------------|--------------|---------------|
| casa | Casa | rectangle | 10 | 8 | — |
| piscina | Piscina | rectangle | 8 | 4 | — |
| huerto | Huerto | rectangle | 4 | 2 | — |
| gallinero | Gallinero | rectangle | 3 | 2 | — |
| arbol_frutal | Árbol Frutal | circle | 4 | 4 | 2 |
| compost | Área de Compost | rectangle | 1 | 1 | — |
| recreacion | Área de Recreación | rectangle | 6 | 6 | — |
| sendero | Sendero | rectangle | 5 | 1 | — |

---

## F2-U2: ElementLibraryPanel

**Archivos:**
- `src/components/ElementLibraryPanel.jsx`
- `src/components/__tests__/ElementLibraryPanel.test.jsx`

**Props:** `{ onSelectElement, selectedElementType }`

**Tests a escribir (RED):**
- Renderiza los 8 nombres de elementos
- Cada elemento tiene botón clickeable
- Click llama `onSelectElement(definitionId)`
- Elemento activo (selectedElementType === id) tiene `aria-pressed="true"`
- Tiene encabezado "Elementos"

---

## F2-U3: Colocar elementos en canvas

**Archivos modificados:**
- `src/components/TerrainCanvas.jsx` — nuevos props: `activeElementType`, `onPlaceElement(x, y)`
- `src/App.jsx` — nuevo estado: `placedElements`, `selectedElementType`
- `src/components/__tests__/TerrainCanvas.test.jsx` — nuevos tests

**Tests a escribir (RED):**
- Con `activeElementType` != null y terreno finalizado: click llama `onPlaceElement` con posición en metros
- Con `activeElementType` == null: click NO llama `onPlaceElement`
- Con `finished=false`: click NO llama `onPlaceElement` (terreno no finalizado)

**Lógica en App:**
```js
const handlePlaceElement = (x, y) => {
  const def = getElementDefinition(selectedElementType);
  const newElement = {
    id: Date.now().toString(36) + Math.random().toString(36),
    definitionId: def.id,
    x, y,
    width: def.defaultWidth,
    height: def.defaultHeight,
    radius: def.defaultRadius ?? def.defaultWidth / 2,
    rotation: 0,
    label: def.name,
    isSelected: false,
  };
  setPlacedElements(prev => [...prev, newElement]);
  setSelectedElementType(null); // deselect after placing
};
```

---

## F2-U4: PlacedElementsLayer

**Archivos:**
- `src/components/PlacedElementsLayer.jsx`
- `src/components/__tests__/PlacedElementsLayer.test.jsx`

**Props:** `{ elements, scale, position, baseScale, onSelectElement, onMoveElement }`

**Notas de implementación:**
- Se renderiza **dentro** del Stage de TerrainCanvas (como un segundo Layer)
- TerrainCanvas recibe `placedElements`, `onSelectElement`, `onMoveElement` y los pasa al layer
- Coordenadas: los elementos se almacenan en metros; multiplicar por `baseScale * scale` para píxeles en canvas
- Conversión: `stageX = element.x * baseScale * scale + position.x`

**Tests (mock react-konva igual que TerrainCanvas.test.jsx — agregar `Rect` al mock):**
- Renderiza número correcto de elementos
- Elemento rectangle → `data-testid="konva-rect"`
- Elemento circle → `data-testid="konva-circle-element"` (distinto del de vértices del terreno)
- Elemento seleccionado tiene stroke diferente (borde de selección)
- Drag llama `onMoveElement(id, newX, newY)` con coordenadas en metros
- Click llama `onSelectElement(id)`

---

## F2-U5: Selección + Delete

**Archivos modificados:**
- `src/App.jsx` — estado `selectedElementId`, handler delete en `window.addEventListener`

**Lógica:**
- `selectedElementId` se sincroniza con `isSelected` en `placedElements`
- Delete key: si `finished === true` Y `selectedElementId != null` → eliminar elemento
- La lógica de Delete existente en TerrainCanvas (borrar último punto) solo actúa cuando `!finished`
- No hay conflicto: cuando `finished=true`, TerrainCanvas ignora Delete; App lo maneja

**Tests:**
- Unidad testeable vía utilidad pura: `removeElement(elements, id)` → retorna array sin ese id
- Tests de integración en PlacedElementsLayer: elemento desaparece al ser removido del array

---

## F2-U6: Detección de colisión

**Archivos:**
- `src/utils/collisionUtils.js`
- `src/utils/__tests__/collisionUtils.test.js`

**Funciones a implementar y testear:**

```js
isPointInPolygon(point, polygonPoints)   // ray casting
isRectangleInPolygon(rect, polygonPoints, baseScale)  // verifica 4 esquinas
isCircleInPolygon(circle, polygonPoints, baseScale)   // verifica centro + 8 puntos en circunferencia
snapToGrid(value, gridSize)              // snap al múltiplo más cercano
```

**Tests (RED first):**
- `isPointInPolygon({x:5,y:5}, square)` → true
- `isPointInPolygon({x:15,y:5}, square)` → false
- `isRectangleInPolygon` rect dentro → true; rect parcialmente fuera → false
- `isCircleInPolygon` círculo dentro → true; círculo fuera → false
- `snapToGrid(13, 10)` → 10
- `snapToGrid(17, 10)` → 20
- `snapToGrid(25, 10)` → 30 (o 20, depende del criterio — usar Math.round)

---

## F2-U7: Handles de redimensionamiento

**Archivos modificados:**
- `src/components/PlacedElementsLayer.jsx` — agregar handles cuando `isSelected`
- `src/components/__tests__/PlacedElementsLayer.test.jsx` — nuevos tests

**Lógica:**
- Rectángulo seleccionado: 4 círculos pequeños en las esquinas
- Círculo seleccionado: 1 círculo en el borde derecho (para cambiar radio)
- Dragging esquina → llama `onResizeElement(id, newWidth, newHeight)`
- Coordenadas del handle calculadas en píxeles; convertir delta a metros al llamar callback

**Tests:**
- Rectángulo seleccionado → 4 elementos `data-testid="resize-handle"`
- Círculo seleccionado → 1 elemento `data-testid="resize-handle"`
- Drag en handle → llama `onResizeElement`

---

## F2-U8: Handle de rotación

**Archivos modificados:**
- `src/components/PlacedElementsLayer.jsx`
- Tests correspondientes

**Lógica:**
- Elemento seleccionado → círculo handle encima del elemento
- Drag → calcular ángulo respecto al centro → llamar `onRotateElement(id, angleDeg)`

**Tests:**
- Elemento seleccionado → `data-testid="rotation-handle"` presente
- Drag → llama `onRotateElement`

---

## F2-U9: Duplicar (Ctrl+D)

**Archivos modificados:**
- `src/App.jsx` — listener `window` para Ctrl+D

**Lógica:**
```js
// Ctrl+D: duplicar elemento seleccionado con offset de 1 metro
if (e.ctrlKey && e.key === 'd' && selectedElementId) {
  const original = placedElements.find(el => el.id === selectedElementId);
  const duplicate = { ...original, id: newId(), x: original.x + 1, y: original.y + 1, isSelected: false };
  setPlacedElements(prev => [...prev, duplicate]);
}
```

**Tests:**
- Función pura `duplicateElement(element, offsetX, offsetY)` → retorna nuevo objeto con id diferente y posición offset
- `duplicateElement` preserva todos los campos excepto `id`, `x`, `y`

---

## F2-U10: Snap a cuadrícula

**Archivos modificados:**
- `src/components/PlacedElementsLayer.jsx` — aplicar snap al soltar drag si `gridVisible=true`
- Nueva prop: `snapToGridEnabled` (booleano)

**Lógica:**
- Al terminar drag (`onDragEnd`): si `snapToGridEnabled`, redondear `x` e `y` del elemento al múltiplo más cercano del `gridSize`
- Usar `snapToGrid(value, gridSize)` de `collisionUtils.js`

**Tests:**
- Con `snapToGridEnabled=true`: posición final es múltiplo del grid
- Con `snapToGridEnabled=false`: posición final es exacta del drag

---

## Integración final en App.jsx

```jsx
// Render layout
<div style={{display:'flex', height:'100vh'}}>
  <ElementLibraryPanel
    onSelectElement={setSelectedElementType}
    selectedElementType={selectedElementType}
  />
  <div style={{flex:1, display:'flex', flexDirection:'column'}}>
    <Toolbar ... />
    <TerrainCanvas
      ...existingProps...
      activeElementType={selectedElementType}
      onPlaceElement={handlePlaceElement}
      placedElements={placedElements}
      selectedElementId={selectedElementId}
      onSelectElement={handleSelectElement}
      onMoveElement={handleMoveElement}
      onResizeElement={handleResizeElement}
      onRotateElement={handleRotateElement}
      snapToGridEnabled={gridVisible}
    />
  </div>
  <InfoPanel ... />
</div>
```

---

## Notas de implementación

### Mock de react-konva para tests de PlacedElementsLayer
Agregar `Rect` al mock existente en los tests:
```js
Rect: ({ x, y, width, height, fill, stroke, strokeWidth, draggable, onClick, onDragEnd, ...props }) => (
  <div
    data-testid="konva-rect"
    data-x={x} data-y={y}
    data-width={width} data-height={height}
    data-fill={fill} data-stroke={stroke}
    data-draggable={String(draggable)}
    onClick={onClick}
    {...props}
  />
),
```

### Generación de IDs sin crypto.randomUUID
```js
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);
```

### Coordenadas: metros ↔ píxeles
- Almacenado: metros
- Canvas: `stageX = element.x * baseScale * scale + position.x`
- `baseScale = 10` (10px = 1m a escala 1:1)

---

*Documento generado el 2026-03-29. Actualizar estado de cada unidad al completarla.*
