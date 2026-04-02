# Phase 6 — Modelo extendido de elementos

## Motivación

Actualmente cada elemento colocado es un objeto plano con propiedades visuales
(forma, tamaño, color) y unas pocas propiedades semánticas genéricas (`sunNeeds`,
`waterNeeds`, `minSpacing`). Esto basta para la vista 2D superior, pero limita la
evolución del producto:

- Una piscina necesita profundidad, escalones, tipo de revestimiento.
- Una casa necesita distribución de habitaciones, pisos, instalaciones.
- Un huerto necesita tipo de cultivo, sistema de riego, estaciones.

El objetivo de esta fase es **extender el modelo de datos sin alterar la vista 2D
existente**, de forma que la información adicional quede almacenada y lista para
futuras vistas de detalle.

## Principios de diseño

1. **Aditivo, no disruptivo** — la vista 2D sigue funcionando igual; los atributos
   extendidos son opcionales y no afectan el renderizado actual.
2. **Schema por tipo** — cada tipo de elemento (`piscina`, `casa`, etc.) define su
   propio schema de detalle. No existe un mega-schema universal.
3. **Progresivo** — un elemento puede existir sin detalle alguno; el usuario lo
   enriquece cuando lo necesita.
4. **Serializable** — todo detalle se guarda y carga con `projectIO` sin romper
   compatibilidad con archivos existentes.

## Modelo de datos

### Estructura actual de un elemento colocado

```js
{
  id, definitionId, shape, x, y, width, height, radius,
  rotation, label, isSelected, color, borderColor, borderWidth
}
```

### Estructura extendida propuesta

```js
{
  // --- campos actuales (sin cambios) ---
  id, definitionId, shape, x, y, width, height, radius,
  rotation, label, isSelected, color, borderColor, borderWidth,

  // --- nuevo ---
  detail: {
    _schema: 'piscina@1',   // tipo + versión del schema
    depth: 1.8,              // metros
    steps: [ { width: 0.8, depth: 0.3 } ],
    lining: 'fibra de vidrio',
    // ...campos propios del tipo
  }
}
```

- `detail` es `null | undefined` por defecto → elemento sin detalle, compatibilidad
  total con archivos previos.
- `_schema` identifica el tipo y versión para migración futura.

### Definiciones de schema por tipo

```
src/data/detailSchemas/
  piscina.js      → { fields, defaults, version }
  casa.js         → { fields, defaults, version }
  huerto.js       → { fields, defaults, version }
  index.js        → registry: definitionId → schema
```

Cada schema declara:
- `version: number` — para migraciones.
- `fields: Array<FieldDef>` — nombre, tipo (`number`, `text`, `select`, `list`),
  unidad, rango, opciones.
- `defaults: object` — valores iniciales al crear detalle.

Ejemplo:

```js
// src/data/detailSchemas/piscina.js
export default {
  version: 1,
  fields: [
    { key: 'depth',   label: 'Profundidad', type: 'number', unit: 'm', min: 0.5, max: 5 },
    { key: 'steps',   label: 'Escalones',   type: 'list', itemSchema: [
        { key: 'width', label: 'Ancho', type: 'number', unit: 'm' },
        { key: 'depth', label: 'Alto',  type: 'number', unit: 'm' },
    ]},
    { key: 'lining',  label: 'Revestimiento', type: 'select', options: [
        'hormigón', 'fibra de vidrio', 'liner', 'azulejo'
    ]},
  ],
  defaults: { depth: 1.5, steps: [], lining: 'hormigón' },
};
```

## Unidades de trabajo

### Unit 1 — Schema registry y modelo de datos (TDD)

**Archivos**: `src/data/detailSchemas/`, `src/utils/detailUtils.js`

- Definir estructura `FieldDef` y `DetailSchema`.
- Crear schemas iniciales: `piscina`, `casa`, `huerto`.
- `getDetailSchema(definitionId)` → schema o null.
- `createDefaultDetail(definitionId)` → detail object con defaults.
- `validateDetail(detail, schema)` → errores.
- `migrateDetail(detail, fromVersion, toVersion)` — placeholder.

**Tests**:
- Schema lookup por definitionId.
- Crear defaults devuelve objeto con `_schema` correcto.
- Validar campo fuera de rango devuelve error.
- Elemento sin schema registrado devuelve null.

### Unit 2 — Persistencia y compatibilidad (TDD)

**Archivos**: `src/utils/projectIO.js`

- `exportProject` serializa `detail` cuando existe.
- `importProject` restaura `detail`, ignora si ausente.
- Archivos v1 (sin detail) siguen cargando sin errores.

**Tests**:
- Round-trip de elemento con detail.
- Archivo sin detail → `detail` queda undefined/null.
- Archivo con schema desconocido se preserva (no se descarta).

### Unit 3 — Panel de detalle genérico (TDD)

**Archivos**: `src/components/DetailPanel.jsx`

- Componente que recibe `element`, `schema` y `onChange`.
- Renderiza campos dinámicamente según `schema.fields`:
  - `number` → input numérico con unidad.
  - `text` → input de texto.
  - `select` → dropdown.
  - `list` → sub-formulario añadir/eliminar items.
- Se muestra como FloatingPanel cuando el usuario hace doble-clic en un elemento
  seleccionado (o botón "Detalle" en la interfaz).

**Tests**:
- Renderiza campos según schema.
- Cambiar input llama onChange con detail actualizado.
- Lista: agregar y eliminar items.
- Elemento sin schema → panel muestra "Sin detalle disponible".

### Unit 4 — Integración con App (TDD)

**Archivos**: `src/App.jsx`, `src/components/TerrainCanvas.jsx`

- Doble-clic en elemento seleccionado abre DetailPanel.
- Cambios en detail se guardan en `placedElements[i].detail`.
- Undo (Ctrl+Z) incluye cambios de detalle.
- Crear elemento nuevo: `detail` inicia como null (se crea al abrir panel).

**Tests**:
- Doble-clic abre panel de detalle.
- Modificar detalle actualiza el elemento.
- Guardar y cargar preserva detalle.
- Undo revierte cambio de detalle.

## Fuera de alcance (futuro)

- Vista 3D o corte lateral de elementos.
- Distribución interna de casa (habitaciones como sub-canvas).
- Cálculos derivados (volumen de piscina, carga eléctrica).
- Conexión entre elementos (tuberías, cableado como grafos).

Estas funcionalidades consumirán el modelo extendido cuando se implementen;
esta fase solo construye los cimientos de datos.

## Diagrama de dependencias

```
elementDefinitions.js  ──►  detailSchemas/index.js
                                    │
                                    ▼
                            detailUtils.js
                             │          │
                             ▼          ▼
                      projectIO.js   DetailPanel.jsx
                                        │
                                        ▼
                                     App.jsx
```

## Criterio de completitud

- Todos los tests pasan (≥ 20 nuevos).
- Elementos existentes sin detail siguen funcionando.
- Archivos de proyecto antiguos cargan sin error.
- Al menos 3 schemas definidos (piscina, casa, huerto).
- Panel de detalle accesible desde la interfaz.
