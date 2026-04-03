# Home Distribution — Guía para Desarrolladores

> Documentación técnica completa del proyecto. Orientada a desarrolladores y LLMs que necesiten entender, modificar o extender el sistema.

---

## Tabla de Contenidos

1. [Visión general](#1-visión-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura de directorios](#3-estructura-de-directorios)
4. [Sistema de coordenadas](#4-sistema-de-coordenadas)
5. [Estado global (App.jsx)](#5-estado-global-appjsx)
6. [Flujo de datos](#6-flujo-de-datos)
7. [Componentes](#7-componentes)
8. [Utilidades](#8-utilidades)
9. [Datos y esquemas](#9-datos-y-esquemas)
10. [Sistema de deshacer/rehacer](#10-sistema-de-deshacerrehacer)
11. [Guardado y carga de proyectos](#11-guardado-y-carga-de-proyectos)
12. [Sistema solar y sombras](#12-sistema-solar-y-sombras)
13. [Restricciones y mediciones](#13-restricciones-y-mediciones)
14. [Caminos (Paths)](#14-caminos-paths)
15. [Elementos personalizados](#15-elementos-personalizados)
16. [Sistema de detalles por tipo (Fase 6)](#16-sistema-de-detalles-por-tipo-fase-6)
17. [Exportación a PDF](#17-exportación-a-pdf)
18. [Atajos de teclado](#18-atajos-de-teclado)
19. [Tests](#19-tests)
20. [Build y herramientas de desarrollo](#20-build-y-herramientas-de-desarrollo)
21. [Algoritmos clave](#21-algoritmos-clave)
22. [Limitaciones conocidas](#22-limitaciones-conocidas)
23. [Guía de extensión](#23-guía-de-extensión)

---

## 1. Visión general

**Home Distribution** es una aplicación web de planificación de terrenos en 2D, orientada al diseño de viviendas autosustentables y permacultura. Permite:

- Dibujar el polígono de un terreno irregular.
- Colocar y gestionar elementos predefinidos o personalizados (casa, piscina, huerto, árboles, etc.).
- Visualizar la orientación solar, el arco del sol y las sombras proyectadas en tiempo real.
- Trazar caminos con ancho variable.
- Definir restricciones de distancia mínima entre elementos y validarlas visualmente.
- Añadir metadatos detallados a elementos específicos (profundidad de piscina, habitaciones de casa, etc.).
- Guardar/cargar proyectos como archivos `.hdist.json`.
- Exportar el plano a PDF en formato A4 apaisado.

---

## 2. Stack tecnológico

| Herramienta | Versión | Uso |
|---|---|---|
| React | 18.2.0 | UI y estado |
| react-konva / Konva | 18.2.5 / 9.2.2 | Renderizado 2D en canvas |
| Vite | 4.2.0 | Build y dev server |
| Vitest | 0.29.0 | Tests unitarios |
| @testing-library/react | 16.3.2 | Tests de componentes |
| Tailwind CSS | 3.4.19 | Estilos utilitarios |
| jsPDF | 4.2.1 | Exportación a PDF |
| SunCalc | 1.9.0 | Cálculos de posición solar |

---

## 3. Estructura de directorios

```
home-distribution/
├── index.html
├── vite.config.js
├── vitest.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
│
└── src/
    ├── main.jsx                     # Punto de entrada React
    ├── App.jsx                      # Estado global, orquestación
    ├── index.css                    # Estilos base + Tailwind
    │
    ├── components/
    │   ├── TerrainCanvas.jsx        # Stage Konva + interacción principal
    │   ├── Toolbar.jsx              # Barra de botones superior
    │   ├── InfoPanel.jsx            # Panel derecho (stats terreno, rename elemento)
    │   ├── ElementLibraryPanel.jsx  # Panel izquierdo (biblioteca de elementos)
    │   ├── PlacedElementsLayer.jsx  # Layer Konva: elementos colocados
    │   ├── PathsLayer.jsx           # Layer Konva: caminos
    │   ├── ShadowLayer.jsx          # Layer Konva: sombras
    │   ├── SolarPathLayer.jsx       # Layer Konva: arco solar
    │   ├── CardinalLayer.jsx        # Layer Konva: puntos cardinales
    │   ├── MeasurementOverlay.jsx   # Layer Konva: mediciones y restricciones
    │   ├── SolarPanel.jsx           # Panel config solar (flotante)
    │   ├── LocationSelector.jsx     # Subcomponente: lat/long
    │   ├── TimeSelector.jsx         # Subcomponente: fecha/hora
    │   ├── ConstraintPanel.jsx      # Panel restricciones (flotante)
    │   ├── MeasurementToolkit.jsx   # Selector de herramienta de medición
    │   ├── PathEditPanel.jsx        # Panel edición de camino (flotante)
    │   ├── DetailPanel.jsx          # Panel detalles elemento (flotante)
    │   ├── CustomElementModal.jsx   # Modal: creación de elemento personalizado
    │   ├── FloatingPanel.jsx        # Wrapper: panel arrastrable
    │   └── __tests__/
    │
    ├── utils/
    │   ├── projectIO.js             # Serialización, guardado y carga
    │   ├── useUndoHistory.js        # Hook: pila de deshacer
    │   ├── elementUtils.js          # Manipulación de elementos (mover, resize, rotar)
    │   ├── geometryUtils.js         # Área, perímetro, auto-intersección
    │   ├── collisionUtils.js        # Punto en polígono, colisión elementos
    │   ├── distanceUtils.js         # Distancias entre elementos y terreno
    │   ├── constraintUtils.js       # Validación de restricciones
    │   ├── measurementConfigUtils.js# Estado de mediciones
    │   ├── pathUtils.js             # Creación y manipulación de caminos
    │   ├── solarUtils.js            # Posición solar (wrapper SunCalc)
    │   ├── shadowUtils.js           # Generación de polígonos de sombra
    │   ├── solarConfigUtils.js      # Config solar: defaults y merge
    │   ├── entranceUtils.js         # Cálculo de entrada/portón en el terreno
    │   ├── detailUtils.js           # Lookup de esquemas de detalle
    │   ├── pdfExport.js             # Generación de PDF
    │   └── __tests__/
    │
    └── data/
        ├── elementDefinitions.js    # Biblioteca predefinida de elementos
        ├── categories.js            # Categorías de elementos
        └── detailSchemas/
            ├── index.js             # Registro de esquemas
            ├── casa.js              # Esquema: Casa
            ├── piscina.js           # Esquema: Piscina
            └── huerto.js            # Esquema: Huerto
```

---

## 4. Sistema de coordenadas

Este es el concepto más importante para entender el código.

### Tres espacios de coordenadas

| Espacio | Unidad | Dónde se usa |
|---|---|---|
| **Metros** | m | Lógica de negocio, distancias, dimensiones |
| **Píxeles de capa (layer)** | px | Posiciones internas del terreno y Konva Layer |
| **Píxeles de stage** | px | Coordenadas de pantalla tras pan/zoom |

### Factor base de escala

```js
const BASE_SCALE = 10; // 1 metro = 10 píxeles en espacio de capa
```

### Conversiones

```js
// Metros → Píxeles de capa
const px = metros * BASE_SCALE;

// Píxeles de capa → Metros
const m = px / BASE_SCALE;

// Píxeles de capa → Píxeles de stage (con pan/zoom)
const stageX = layerX * scale + position.x;
const stageY = layerY * scale + position.y;

// Píxeles de stage → Píxeles de capa
const layerX = (stageX - position.x) / scale;
const layerY = (stageY - position.y) / scale;
```

### Posición de elementos

Los elementos se almacenan con su **centro** en metros:

```js
{
  x: 5.0,     // Centro X en metros
  y: 8.0,     // Centro Y en metros
  width: 10,  // Ancho en metros
  height: 8,  // Alto en metros
}
```

### Vértices del terreno

Los vértices del polígono de terreno se almacenan en **píxeles de capa**, NO en metros. La conversión se hace al mostrar en InfoPanel:

```js
// InfoPanel.jsx
<li>({(p.x / baseScale).toFixed(1)}, {(p.y / baseScale).toFixed(1)})</li>
```

---

## 5. Estado global (App.jsx)

`App.jsx` es la única fuente de verdad. Todo el estado relevante vive aquí y se pasa hacia abajo vía props.

### Estado del terreno

```js
points: Array<{x, y}>      // Vértices del polígono en píxeles de capa
finished: boolean           // Polígono cerrado y válido
entrance: {                 // Portón/entrada
  edgeIndex: number,        // Índice del segmento del terreno
  position: number,         // Posición relativa en el segmento [0,1]
  width: number             // Ancho en metros
} | null
area: number                // Área en m² (calculada, no persistida)
perimeter: number           // Perímetro en m (calculado, no persistido)
gridVisible: boolean
terrainEditMode: boolean    // Habilita arrastre de vértices
entranceMode: boolean       // Modo de colocación de portón
```

### Estado de elementos

```js
placedElements: Array<Element>       // Elementos colocados
customDefinitions: Array<Definition> // Definiciones personalizadas creadas por usuario
selectedElementId: string | null
selectedElementType: string | null   // Tipo siendo colocado
detailPanelOpen: boolean
showCustomModal: boolean
```

### Estado de caminos

```js
paths: Array<Path>          // Caminos terminados
draftPath: Path | null      // Camino siendo dibujado
pathWidth: number           // Grosor del próximo camino (metros)
pathToolActive: boolean
selectedPathId: string | null
```

### Estado solar

```js
solarVisible: boolean
solarPanelOpen: boolean
solarConfig: SolarConfig    // Ver sección 12
```

### Estado de mediciones

```js
measurementConfig: MeasurementConfig  // Ver sección 13
measurementPanelOpen: boolean
```

### Referencias de archivo y stage

```js
fileHandleRef: Ref<FileSystemFileHandle>  // Para Ctrl+S (sobreescritura)
currentFilename: string                   // Nombre actual del proyecto
stageRef: Ref<KonvaStage>                 // Para exportación a PDF
canvasKey: number                         // Fuerza remount de TerrainCanvas
```

---

## 6. Flujo de datos

### Colocar un elemento

```
Clic en ElementLibraryPanel
  → setSelectedElementType(id)

Clic en canvas (TerrainCanvas)
  → handleClick → onPlaceElement(x, y) [en píxeles de capa]

App.handlePlaceElement(x, y)
  → Convierte coordenadas a metros
  → Verifica colisión: isRectangleInPolygon / isCircleInPolygon
  → pushUndo(snapshot actual)
  → setPlacedElements([...prev, nuevoElemento])

PlacedElementsLayer se re-renderiza con el nuevo elemento
```

### Deshacer (Ctrl+Z)

```
Teclado: Ctrl+Z
  → undo() de useUndoHistory
  → Extrae último snapshot de la pila
  → setPlacedElements / setPaths / setEntrance con valores anteriores
  → Limpia selección
```

### Validación de restricción

```
Cambio en elementos o restricciones
  → InfoPanel llama validateAllConstraints(constraints, elements, terrain, baseScale)
  → Para cada restricción: distanceUtils calcula distancia real
  → Retorna {valid, actualDistance, requiredDistance}

InfoPanel → muestra lista con ✓/✗
PlacedElementsLayer → borde rojo en elementos violadores
```

---

## 7. Componentes

### TerrainCanvas.jsx

**Responsabilidad**: Stage Konva principal. Maneja todo el input del usuario sobre el canvas.

**Props clave**:
- `initialPoints`, `initialFinished` — estado inicial (para remount tras carga de proyecto)
- `onPointsChange`, `onFinish` — callbacks al completar el polígono
- `placedElements`, `paths`, `draftPath` — datos a renderizar
- `activeElementType`, `onPlaceElement` — modo colocación
- `terrainEditMode`, `entrance`, `entranceMode` — edición del terreno
- `solarVisible`, `solarConfig` — overlay solar
- `measurementConfig`, `onAddMeasurement`, etc. — herramientas de medición
- `externalStageRef` — ref externa para acceder al stage (PDF export)

**Funcionalidad interna**:
- Inicialización del stage con ResizeObserver (responsivo)
- Pan con arrastre del botón derecho o espacio+clic
- Zoom con rueda del ratón (zoom centrado en cursor)
- Dibujo del polígono de terreno (clic para vértice, Space para cerrar)
- Modo edición: arrastre de vértices existentes
- Preview de elemento a colocar (con snap a grid)
- Delegación de interacción a PlacedElementsLayer y PathsLayer
- Renderiza todos los layers: Cardinal, SolarPath, Shadow, Measurement, Paths, Elements

**Conversión de coordenadas**: Internamente usa `stageRef.current.getPointerPosition()` y convierte a layer coords mediante la transformación inversa del stage.

---

### PlacedElementsLayer.jsx

**Responsabilidad**: Renderizar y gestionar la interacción con elementos colocados.

**Shapes soportadas**: `rectangle` → `Rect`, `circle` → `Circle`, `polygon` → `Line` con `closed=true`.

**Handles de interacción**:
- **Arrastre**: Mover elemento por el canvas. Verifica colisión con terreno en `onDragEnd`.
- **Esquinas** (4 handles): Resize. Calcula nueva posición y dimensiones respetando el ángulo de rotación.
- **Handle superior**: Rotación. El ángulo se calcula con `atan2` desde el centro del elemento.
- **Doble clic**: Abre DetailPanel.

**Indicadores visuales**:
- Borde azul: elemento seleccionado
- Borde rojo: elemento violando restricción
- Etiqueta de dimensión en hover/resize (ej. `10.0 × 8.0 m`)
- Etiqueta de ángulo durante rotación

---

### InfoPanel.jsx

**Responsabilidad**: Sidebar derecho. Muestra estadísticas del terreno, información del elemento seleccionado y estado de restricciones.

**Props**:
- `points`, `finished`, `area`, `perimeter`, `baseScale`
- `selectedElement`, `selectedPath`, `onRenameElement`
- `constraints`, `validationResults`, `elements`

**Edición de nombre**: Clic en el nombre del elemento activa un `<input>`. Enter o blur confirma. Escape cancela. El handler de Backspace del canvas queda inactivo mientras el input está activo (comprueba `document.activeElement.tagName`).

---

### ElementLibraryPanel.jsx

**Responsabilidad**: Panel izquierdo. Selección de elemento a colocar y control de la herramienta de caminos.

**Organización**: Agrupa elementos por categoría (hogar, jardín, animales, sostenibilidad). Elementos personalizados se muestran al final con `✦` como sufijo.

---

### FloatingPanel.jsx

**Responsabilidad**: Wrapper para paneles arrastrables. Proporciona barra de título arrastrable y botón de cierre.

**Uso**:
```jsx
<FloatingPanel title="Config Solar" onClose={() => setSolarPanelOpen(false)}>
  <SolarPanel ... />
</FloatingPanel>
```

---

### CustomElementModal.jsx

**Responsabilidad**: Modal para diseñar un elemento de forma poligonal personalizada.

**Canvas SVG interno**:
- Zoom con rueda del ratón (rango 5–100 px/m, factor 1.15)
- Pan arrastrando el canvas
- Clic para añadir vértice (snap a grid de 0.5m)
- Cerrar polígono: clic cerca del primer vértice (< 8px)
- Regla de escala en la esquina inferior derecha

**Salida**: Un objeto `Definition` con `shape: 'polygon'`, `points: [{x,y}]` relativos al centro del bounding box, y los campos de color/nombre/categoría.

---

### DetailPanel.jsx

**Responsabilidad**: Editor de metadatos de un elemento, basado en su esquema de tipo.

**Tipos de campo soportados**:
- `number` — `<input type=number>` con min, max, unidad
- `text` — `<input type=text>`
- `select` — `<select>` con opciones del esquema
- `boolean` — `<input type=checkbox>`
- `list` — Array de sub-objetos. Cada ítem renderiza sub-campos según `itemSchema`. Botones añadir/eliminar.

---

## 8. Utilidades

### elementUtils.js

| Función | Descripción |
|---|---|
| `removeElement(elements, id)` | Filtra elemento por id |
| `baseLabel(label)` | Extrae nombre base: `"Casa (2)"` → `"Casa"` |
| `uniqueLabel(base, existingLabels)` | Genera nombre único: `"Casa"` → `"Casa (1)"` si ya existe |
| `duplicateElement(el, offsetX, offsetY, existingLabels)` | Clona con nuevo id, posición desplazada y etiqueta única |
| `rotatePoint(px, py, cx, cy, angleDeg)` | Rota punto alrededor de centro |
| `calculateRectResize(cornerKey, dragX, dragY, el, scale, position, baseScale)` | Calcula nueva pos/dims al arrastrar esquina, respetando rotación |
| `calculateCircleResize(dragX, dragY, el, scale, position, baseScale)` | Nuevo radio al arrastrar handle de círculo |
| `calculateRotation(handleX, handleY, centerX, centerY)` | Ángulo en grados desde handle de rotación |

---

### geometryUtils.js

| Función | Descripción |
|---|---|
| `calculateArea(points)` | Área del polígono (fórmula del lazador/shoelace), en unidades² de los puntos |
| `calculatePerimeter(points)` | Suma de longitudes de segmentos |
| `wouldCauseSelfIntersection(existingPoints, newPoint)` | Detecta si añadir `newPoint` crearía un cruce con segmentos existentes |
| `segmentsIntersect(seg1, seg2)` | Intersección de dos segmentos 2D |

---

### collisionUtils.js

| Función | Descripción |
|---|---|
| `isPointInPolygon(point, polygon)` | Ray casting para punto en polígono |
| `isRectangleInPolygon(el, polygon, baseScale)` | Verifica que todas las esquinas del rectángulo (con rotación) estén dentro |
| `isCircleInPolygon(el, polygon, baseScale)` | Verifica que el centro y borde del círculo estén dentro |
| `isPolygonElementInPolygon(el, terrain, baseScale)` | Para elementos tipo polígono personalizado |

---

### distanceUtils.js

Calcula distancias para validar restricciones.

| Función | Descripción |
|---|---|
| `distancePointToPoint(a, b)` | Distancia euclidiana |
| `distancePointToSegment(point, segA, segB)` | Distancia de punto a segmento |
| `distancePointToPolygon(point, polygon)` | Distancia mínima de punto a cualquier lado del polígono |
| `distanceElementToElement(el1, el2)` | Distancia borde a borde entre dos elementos (cajas axiales) |
| `distanceElementToTerrain(el, terrainPoints, baseScale)` | Distancia mínima de elemento al perímetro del terreno |

---

### constraintUtils.js

| Función | Descripción |
|---|---|
| `validateConstraint(c, elements, terrain, baseScale)` | Valida una restricción, retorna `{valid, actualDistance, requiredDistance}` |
| `validateAllConstraints(constraints, elements, terrain, baseScale)` | Valida todas, retorna array de resultados |
| `getConstraintDisplayName(constraint, elements)` | Nombre legible: `"Casa → Terreno ≥ 3 m"` |
| `getDefaultConstraints(elements)` | Restricciones preconfiguradas por tipo de elemento |

---

### pathUtils.js

| Función | Descripción |
|---|---|
| `createPath(point, width, label)` | Crea un Path nuevo con un punto inicial |
| `addPointToPath(path, point)` | Retorna nuevo path con punto añadido |
| `finishPath(path)` | Marca el path como terminado |
| `pathTotalLength(path)` | Suma de longitudes de segmentos en metros |
| `pathSegmentLengths(path)` | Array de longitudes por segmento |
| `isPathValid(path)` | `finished && points.length >= 2` |

---

### solarUtils.js

| Función | Descripción |
|---|---|
| `getSolarPosition(date, lat, lon)` | Retorna `{azimuth, elevation}` en grados. Azimuth: N=0, E=90, S=180, W=270 |
| `getSolarPathForDay(date, lat, lon, intervalHours, utcOffset)` | Array de posiciones solares a lo largo del día |
| `getSunrise(date, lat, lon, utcOffset)` | `{hour, minute}` o null si no hay amanecer |
| `getSunset(date, lat, lon, utcOffset)` | `{hour, minute}` o null si no hay atardecer |
| `azimuthToVector(azimuthDeg)` | Vector unitario 2D en convención de canvas (N=arriba, E=derecha) |

**Nota**: SunCalc usa `azimuth` con referencia Sur=0, positivo hacia Oeste. `getSolarPosition` convierte al sistema N=0 geográfico.

---

### shadowUtils.js

| Función | Descripción |
|---|---|
| `getShadowLength(elementHeight, elevation)` | `height / tan(elevation)`. Retorna `Infinity` si elevación ≤ 0 |
| `getShadowDirection(azimuth)` | Dirección opuesta al sol: `(azimuth + 180) % 360` |
| `getShadowPolygon(element, elevation, azimuth)` | Array de puntos `{x,y}` en metros. `[]` si el sol está bajo el horizonte o `elementHeight <= 0` |

**Elementos sin sombra** (elementHeight = 0): piscina, pozo, estanque, compost, recreación, sendero, estacionamiento.

---

### entranceUtils.js

Gestiona el portón/entrada del terreno.

| Función | Descripción |
|---|---|
| `entranceToT(entrance, points)` | Convierte entrance a parámetro t en el polígono total |
| `getEntranceGapPoints(entrance, points, baseScale)` | Retorna los dos puntos del hueco en el borde del terreno |
| `clampEntrancePosition(entrance, points, baseScale)` | Asegura que el portón quepa en el segmento |
| `projectPointOnEdge(point, segA, segB)` | Proyección ortogonal de punto sobre segmento, retorna t ∈ [0,1] |

---

### detailUtils.js

| Función | Descripción |
|---|---|
| `getDetailSchema(definitionId)` | Retorna el esquema del tipo, o `null` si no existe |
| `createDefaultDetail(definitionId)` | Crea objeto de detalle con valores por defecto y tag `_schema` |
| `validateDetail(detail, schema)` | Array de errores. Comprueba rangos numéricos y opciones de select |
| `migrateDetail(detail, from, to)` | **Placeholder** — sin implementar aún |

---

### pdfExport.js

`exportToPdf({ stage, filename, area, perimeter, elements, paths })`

**Proceso**:
1. Captura el canvas Konva con `stage.toDataURL({ pixelRatio: 2 })`
2. Compone sobre un canvas 2D con fondo blanco (evita fondo negro en JPEG)
3. Crea PDF A4 apaisado con jsPDF
4. Añade cabecera (título, fecha, nombre de archivo)
5. Columna izquierda: resumen (área, perímetro, conteo de elementos)
6. Cuerpo: imagen del canvas con relación de aspecto preservada
7. Lista de elementos con dimensiones
8. Descarga automática como `{filename}.pdf`

---

## 9. Datos y esquemas

### elementDefinitions.js

Array de objetos `ElementDefinition`:

```js
{
  id: 'casa',
  name: 'Casa',
  shape: 'rectangle',        // 'rectangle' | 'circle' | 'polygon'
  defaultWidth: 10,          // Metros
  defaultHeight: 8,          // Metros
  defaultRadius: undefined,  // Solo para círculos
  color: '#E8D5B7',
  borderColor: '#8B6914',
  borderWidth: 2,
  category: 'hogar',         // 'hogar' | 'jardin' | 'animales' | 'sostenibilidad'
  elementHeight: 4,          // Altura para cálculo de sombras (metros). 0 = sin sombra
  properties: {
    sunNeeds: 'partial',     // 'full' | 'partial' | 'low'
    waterNeeds: 'low',       // 'high' | 'medium' | 'low'
    minSpacing: 2            // Metros de separación recomendada
  }
}
```

**Alturas de elementos** (`elementHeight`):
- 4m: casa, árbol frutal
- 3m: bodega, taller
- 2m: gallinero
- 0.3m: huerto
- 0m (sin sombra): piscina, pozo, estanque, compost, recreación, sendero, estacionamiento

---

### detailSchemas/

Cada esquema define los campos editables de un tipo de elemento.

**Estructura de esquema**:

```js
export const piscinaSchema = {
  _schema: 'piscina',
  version: 1,
  fields: [
    {
      key: 'depth',
      label: 'Profundidad',
      type: 'number',
      unit: 'm',
      min: 0.5,
      max: 5,
    },
    {
      key: 'lining',
      label: 'Revestimiento',
      type: 'select',
      options: ['hormigón', 'liner', 'gresite', 'fibra de vidrio'],
    },
    {
      key: 'heated',
      label: 'Climatizada',
      type: 'boolean',
    },
    {
      key: 'steps',
      label: 'Escalones',
      type: 'list',
      itemSchema: [
        { key: 'width', label: 'Ancho', type: 'number', unit: 'm' },
        { key: 'depth', label: 'Profundidad', type: 'number', unit: 'm' },
      ],
    },
  ],
  defaults: {
    depth: 1.5,
    lining: 'hormigón',
    heated: false,
    steps: [],
  },
};
```

**Esquemas disponibles**: `piscina`, `casa`, `huerto`.

**Registro** (`detailSchemas/index.js`):

```js
import { piscinaSchema } from './piscina.js';
import { casaSchema } from './casa.js';
import { huertoSchema } from './huerto.js';

export const detailSchemas = {
  piscina: piscinaSchema,
  casa: casaSchema,
  huerto: huertoSchema,
};
```

**Elemento con detalle** (`element.detail`):

```js
{
  _schema: 'piscina@1',   // Versión del esquema al momento de creación
  depth: 2.0,
  lining: 'gresite',
  heated: true,
  steps: [{ width: 0.9, depth: 0.3 }]
}
```

---

## 10. Sistema de deshacer/rehacer

**Hook**: `useUndoHistory(maxSize = 50)`

El hook usa `useRef` para la pila (evita re-renders innecesarios) y `useState` solo para forzar re-render cuando cambia `canUndo`.

**API**:

```js
const { pushUndo, undo, canUndo, clear } = useUndoHistory();

// Antes de cualquier acción destructiva:
pushUndo({ placedElements, paths, entrance });

// Al recibir Ctrl+Z:
const snapshot = undo();
if (snapshot) {
  setPlacedElements(snapshot.placedElements);
  setPaths(snapshot.paths);
  setEntrance(snapshot.entrance);
}
```

**Lo que se incluye en el snapshot**:
- `placedElements` — incluyendo `detail` de cada elemento
- `paths` — caminos y sus puntos
- `entrance` — portón del terreno

**Lo que NO está en el snapshot** (no tiene undo):
- Polígono del terreno
- Config solar
- Config de mediciones y restricciones

---

## 11. Guardado y carga de proyectos

### Formato de archivo `.hdist.json`

```json
{
  "version": "2.0.0",
  "exportedAt": "2026-04-03T...",
  "terrain": {
    "points": [{"x": 100, "y": 50}, ...],
    "finished": true,
    "entrance": { "edgeIndex": 2, "position": 0.5, "width": 3 }
  },
  "elements": [
    {
      "id": "abc123",
      "definitionId": "casa",
      "label": "Casa",
      "x": 15.0,
      "y": 12.0,
      "width": 10,
      "height": 8,
      "rotation": 0,
      "shape": "rectangle",
      "color": "#E8D5B7",
      "detail": { "_schema": "casa@1", "floors": 1, "bedrooms": 3 }
    }
  ],
  "paths": [...],
  "solar": { ... },
  "measurements": { ... },
  "customDefinitions": [...]
}
```

### Compatibilidad con versiones anteriores

- v1 tenía `points`, `finished` en el nivel raíz (sin sección `terrain`). El importador lo detecta y normaliza.
- Claves desconocidas se preservan en `_extra` (forward compatibility).
- Si el major de la versión del archivo > CURRENT_MAJOR, se lanza `ProjectImportError`.

### Guardado con File System Access API

En navegadores compatibles (Chrome, Edge):
1. **Primera vez**: `showSaveFilePicker()` abre el diálogo del sistema operativo.
2. El `FileSystemFileHandle` se guarda en `fileHandleRef`.
3. Ctrl+S o clic en "Guardar" llama `handle.createWritable()` y escribe directamente, sin diálogo.
4. "Guardar como..." siempre llama `showSaveFilePicker()` independientemente de si hay handle.

En navegadores sin soporte (Firefox, Safari): descarga del navegador como fallback.

---

## 12. Sistema solar y sombras

### Configuración solar

```js
solarConfig = {
  location: {
    latitude: -33.4,
    longitude: -70.6,
    cityName: 'Santiago',
    utcOffset: -4
  },
  dateTime: {
    year: 2025,
    month: 6,
    day: 21,
    hour: 12,
    minute: 0
  },
  displayOptions: {
    showCardinals: true,
    showSolarPath: true,
    showCurrentSun: true,
    showShadows: true,
    northAtTop: true     // Si false, N apunta hacia abajo en pantalla
  }
}
```

### Arco solar (SolarPathLayer)

- Calcula el radio del arco como `max(distancia centroide → vértice más lejano * 1.3, 25m)`.
- Mapea posiciones solares (azimuth, elevation) a puntos en el arco alrededor del terreno.
- Puntos con elevación > 0 aparecen visibles; < 0 se ocultan.
- El sol actual se muestra como círculo amarillo más grande.

### Sombras (ShadowLayer)

- Para cada elemento: llama `getShadowPolygon(element, elevation, azimuth)`.
- Las coordenadas del polígono de sombra están en metros relativos al terreno.
- Se convierten a píxeles de capa multiplicando por `baseScale * scale` y añadiendo `position`.
- Se renderizan como polígonos semitransparentes (40% negro).

---

## 13. Restricciones y mediciones

### Estructura de restricción

```js
{
  id: 'c1',
  name: 'Casa a terreno',
  type: 'min-distance',
  sourceId: 'element-id-1',   // ID de elemento, o 'any' para cualquiera
  targetId: 'terrain',        // ID de elemento, 'terrain', o 'any'
  value: 3,                   // Distancia mínima en metros
  enabled: true
}
```

### Tipos de target en validación

| targetId | Comportamiento |
|---|---|
| ID de elemento | Distancia entre los dos elementos específicos |
| `'terrain'` | Distancia del elemento al perímetro del terreno |
| `'any'` | Distancia al elemento más cercano del tipo indicado |

### MeasurementConfig

```js
{
  activeTool: 'none' | 'distance' | 'area' | 'eraser',
  showMeasurements: true,
  showConstraints: true,
  activeMeasurements: [
    { id: 'm1', type: 'distance', value: 5.2, vertices: [{x,y},{x,y}] }
  ],
  constraints: [...]
}
```

---

## 14. Caminos (Paths)

### Estructura de un Path

```js
{
  id: 'path-abc',
  points: [{x: 5, y: 3}, {x: 12, y: 8}, ...],  // En metros
  width: 2,              // En metros
  label: 'Camino 1',
  finished: true,
  color: '#D4A96A',
  borderColor: '#8B6914'
}
```

### Flujo de creación

1. Usuario activa herramienta de caminos → `setPathToolActive(true)`.
2. Cada clic en canvas → `handlePathClick(point)`:
   - Si no hay `draftPath`: `createPath(point, pathWidth, label)` → sets `draftPath`.
   - Si hay `draftPath`: `addPointToPath(draftPath, point)`.
3. Space → `handlePathFinish()` → mueve `draftPath` a `paths`.
4. Escape → `handleCancelPath()` → descarta `draftPath`.

### Renderizado

Cada camino se dibuja como dos líneas paralelas en Konva:
- Exterior: `borderColor`, `width * baseScale * scale`
- Interior: `color`, `(width - borderWidth) * baseScale * scale`

---

## 15. Elementos personalizados

### Definición personalizada

Tiene la misma estructura que `elementDefinitions.js` pero con:

```js
{
  isCustom: true,
  shape: 'polygon',
  points: [{x, y}, ...],  // Relativo al centro, en metros
  // + campos estándar: id, name, color, borderColor, category, etc.
}
```

### Colisión de polígonos personalizados

`isPolygonElementInPolygon(el, terrain, baseScale)`:
- Transforma los puntos del polígono del elemento (rotación + traslación).
- Verifica que todos los vértices transformados estén dentro del terreno.

---

## 16. Sistema de detalles por tipo (Fase 6)

### Objetivo

Permitir que cada tipo de elemento tenga atributos específicos de dominio (ej: la piscina tiene profundidad, la casa tiene habitaciones). Estos datos no afectan la vista 2D pero están disponibles para vistas detalladas futuras o reportes.

### Ciclo de vida del detalle

```
Doble clic en elemento
  → App.handleOpenDetailPanel(id)
  → getDetailSchema(element.definitionId) → schema o null
  → createDefaultDetail(definitionId) si element.detail es null
  → Abre DetailPanel con schema + detail actuales

Usuario edita campos en DetailPanel
  → onChange(updatedDetail)
  → App.handleUpdateElementDetail(id, updatedDetail)
  → pushUndo (para poder deshacer)
  → setPlacedElements con el nuevo detail
```

### Añadir esquema para un nuevo tipo

1. Crear `src/data/detailSchemas/nuevo.js` con la estructura de esquema.
2. Registrar en `src/data/detailSchemas/index.js`:
   ```js
   import { nuevoSchema } from './nuevo.js';
   export const detailSchemas = {
     ...existentes,
     nuevo: nuevoSchema,
   };
   ```
3. El `DetailPanel` renderizará automáticamente los campos del nuevo esquema.

---

## 17. Exportación a PDF

**Función**: `exportToPdf(options)` en `src/utils/pdfExport.js`

**Proceso técnico**:
1. `stage.toDataURL({ pixelRatio: 2 })` — captura PNG del canvas Konva.
2. Se crea un canvas 2D con fondo blanco y se compone la imagen encima (sin esto JPEG renderiza fondo negro).
3. `offscreen.toDataURL('image/jpeg', 0.92)` — convierte a JPEG.
4. jsPDF crea A4 apaisado (297 × 210 mm).
5. Layout:
   - Cabecera: título + fecha (MARGIN=15mm desde el borde)
   - Columna izquierda (60mm): resumen de stats
   - Cuerpo: imagen del canvas ajustada con relación de aspecto
   - Borde gris claro alrededor de la imagen
   - Lista de elementos bajo el resumen

---

## 18. Atajos de teclado

| Atajo | Acción | Condición |
|---|---|---|
| `Ctrl+Z` | Deshacer | Siempre |
| `Ctrl+S` | Guardar (sobreescribir) | Siempre |
| `Shift+S` | Toggle solar overlay | Terreno terminado |
| `M` | Toggle herramienta distancia | Terreno terminado |
| `Space` | Cerrar polígono de terreno / finalizar camino | Modo dibujo activo |
| `Escape` | Cancelar operación en curso | Modo dibujo activo |
| `Delete` / `Backspace` | Eliminar elemento seleccionado | Terreno terminado, foco fuera de input |
| `Ctrl+D` | Duplicar elemento seleccionado | Terreno terminado |

**Nota importante**: `Delete`/`Backspace` comprueban `document.activeElement.tagName !== 'INPUT'` para no interferir con la edición de nombres en InfoPanel.

---

## 19. Tests

### Configuración

- **Framework**: Vitest con entorno jsdom
- **Setup**: `src/test/setup.js` importa `@testing-library/jest-dom`
- **Comando**: `npm run test` (modo run, sin watch)

### Estructura

Los tests están co-localizados con el código:

```
src/utils/__tests__/geometryUtils.test.js
src/utils/__tests__/distanceUtils.test.js
src/utils/__tests__/constraintUtils.test.js
src/utils/__tests__/pathUtils.test.js
src/utils/__tests__/shadowUtils.test.js
src/utils/__tests__/solarUtils.test.js
src/utils/__tests__/entranceUtils.test.js
src/utils/__tests__/solarConfigUtils.test.js
src/utils/__tests__/projectIO.test.js
src/data/__tests__/detailSchemas.test.js
src/components/__tests__/DetailPanel.test.jsx
src/components/__tests__/DetailPanelIntegration.test.jsx
```

### Total: 512 tests pasando

### Convenciones

- Utilidades: testear con datos puros (sin DOM)
- Componentes: `render()` + `screen.getBy*` + `userEvent`
- Sin mocks de módulos externos salvo lo estrictamente necesario

### Mocking en tests de componentes

Konva no funciona en jsdom. Los componentes que usan `react-konva` directamente no tienen tests unitarios. En su lugar, la lógica de cálculo (geometría, colisiones, distancias) está en utilidades puras que sí se testean.

---

## 20. Build y herramientas de desarrollo

### Iniciar desarrollo

```bash
npm install
npm run dev        # Dev server en http://localhost:3000
```

### Build para producción

```bash
npm run build      # Output en dist/
npm run preview    # Preview del build
```

### Tests

```bash
npm run test            # Ejecutar todos los tests una vez
npx vitest             # Modo watch interactivo
npx vitest run --reporter=verbose  # Con detalle de cada test
```

### Configuración de Vite (`vite.config.js`)

```js
{
  plugins: [react()],
  server: { port: 3000 }
}
```

### Configuración de Vitest (`vitest.config.js`)

```js
{
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  }
}
```

---

## 21. Algoritmos clave

### Área de polígono (Shoelace)

```js
export const calculateArea = (points) => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};
```

Para obtener área en m²: `calculateArea(points) / (baseScale ** 2)`.

### Punto en polígono (Ray Casting)

```js
export const isPointInPolygon = (point, polygon) => {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};
```

### Resize con rotación

Cuando un elemento está rotado y se arrastra una esquina, el cálculo de resize proyecta el punto arrastrado y el vértice opuesto al eje local del elemento (sin rotar) para obtener el nuevo ancho, alto y centro:

```js
// elementUtils.js: calculateRectResize
const dragLocal  = rotatePoint(dragX, dragY, sx, sy, -rot);
const oppLocal   = rotatePoint(opp.x, opp.y, sx, sy, -rot);
const newCenterX = (dragLocal.x + oppLocal.x) / 2;
const newW       = Math.abs(dragLocal.x - oppLocal.x) / bs;
```

### Longitud de sombra

```js
shadowLength = elementHeight / Math.tan(elevationRadians)
// Si elevation → 0, shadowLength → Infinity (excluido del renderizado)
```

---

## 22. Limitaciones conocidas

### Técnicas

| Limitación | Detalle |
|---|---|
| **Sin undo para terreno** | Editar vértices del terreno o definir la entrada no captura snapshots |
| **Pila de undo única** | No es por acción granular; máximo 50 snapshots totales |
| **PDF raster** | La imagen del canvas se exporta como JPEG; no es vectorial |
| **Sin constraint auto-solver** | El usuario debe reubicar manualmente elementos en violación |
| **Colisión simplificada** | Rectángulos y círculos usan bounding box axis-aligned; la rotación no afecta la colisión con el terreno |
| **Solar simplificado** | SunCalc no incluye refracción atmosférica; las sombras son proyecciones planas |
| **Polígono convexo preferido** | Elementos poligonales personalizados muy cóncavos pueden tener comportamiento de colisión inesperado |
| **File System API** | Solo Chrome/Edge. Firefox y Safari siempre descargan el archivo |

### De UX

| Limitación | Detalle |
|---|---|
| Sin snapshots de terreno | Ctrl+Z no recupera cambios en el polígono del terreno |
| Sin zoom en plano con trackpad en algunos OS | El evento wheel puede no propagarse en ciertas configuraciones |
| El portón requiere terreno terminado | No se puede definir antes de cerrar el polígono |

---

## 23. Guía de extensión

### Añadir un nuevo tipo de elemento predefinido

1. Agregar entrada en `src/data/elementDefinitions.js`:
   ```js
   {
     id: 'invernadero',
     name: 'Invernadero',
     shape: 'rectangle',
     defaultWidth: 6,
     defaultHeight: 4,
     color: '#C8E6C9',
     borderColor: '#388E3C',
     borderWidth: 1,
     category: 'jardin',
     elementHeight: 2.5,
     properties: { sunNeeds: 'full', waterNeeds: 'medium', minSpacing: 1 }
   }
   ```
2. (Opcional) Crear esquema de detalle en `src/data/detailSchemas/invernadero.js` y registrarlo.

---

### Añadir un nuevo esquema de detalle

1. Crear `src/data/detailSchemas/invernadero.js` con la estructura de esquema (ver sección 16).
2. Registrar en `src/data/detailSchemas/index.js`.
3. Los tests existentes en `detailSchemas.test.js` validan la estructura; añadir casos del nuevo esquema.

---

### Añadir un nuevo tipo de restricción

1. Añadir el nuevo `type` en el validador en `constraintUtils.js`:
   ```js
   export const validateConstraint = (c, elements, terrain, baseScale) => {
     if (c.type === 'min-distance') { ... }
     if (c.type === 'max-distance') { ... }  // nuevo
   };
   ```
2. Actualizar `ConstraintPanel.jsx` para mostrar la nueva opción en el formulario.
3. Actualizar `getConstraintDisplayName` si el formato del label difiere.

---

### Añadir un nuevo layer Konva

1. Crear `src/components/NuevoLayer.jsx`:
   ```jsx
   import { Layer } from 'react-konva';
   const NuevoLayer = ({ ...props }) => {
     return <Layer>{/* shapes */}</Layer>;
   };
   export default NuevoLayer;
   ```
2. Importar y renderizar en `TerrainCanvas.jsx` dentro del `<Stage>`.
3. Pasar los datos necesarios desde `App.jsx` vía props de TerrainCanvas.

---

### Extender el formato de proyecto (nueva versión)

1. Incrementar `CURRENT_VERSION` en `projectIO.js` (ej. `'3.0.0'` si hay cambio breaking, `'2.1.0'` si no).
2. Actualizar `exportProject` para incluir el nuevo campo.
3. Actualizar `importProject` con default seguro para archivos v2 que no tengan el campo.
4. Si es cambio breaking: incrementar `CURRENT_MAJOR` y añadir lógica de migración.

---

### Añadir un nuevo atajo de teclado

Los atajos están en los `useEffect` de teclado en `App.jsx`:

```js
useEffect(() => {
  const handler = (e) => {
    if (!finished) return;
    // Añadir aquí el nuevo shortcut
    if (e.key === 'F' && !e.ctrlKey) handleNuevaAccion();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [finished, handleNuevaAccion]);
```

**Precaución**: si el shortcut usa Backspace o Delete, añadir la guardia de input activo:
```js
const tag = document.activeElement?.tagName;
if (tag === 'INPUT' || tag === 'TEXTAREA') return;
```

---

*Documentación generada el 2026-04-03. Versión del proyecto: 2.0.0.*
