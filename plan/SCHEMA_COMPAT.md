# SCHEMA_COMPAT — Reglas de compatibilidad y versionado de esquemas

Fecha de formalización: 2026-04-23
Aplica a: todo archivo `.hdist.json` generado por `home-distribution`.

---

## Resumen ejecutivo

Un archivo de proyecto `.hdist.json` guardado con cualquier versión anterior de la app debe poder abrirse sin error en cualquier versión posterior. Esta garantía se llama **retrocompatibilidad**. La compatibilidad hacia adelante (abrir un archivo nuevo en una app vieja) **no** es garantizada.

---

## Estructura del archivo de proyecto

```json
{
  "version": "2.0.0",
  "exportedAt": "ISO-8601",
  "terrain": { "points": [], "finished": false, "entrance": null },
  "elements": [ /* PlacedElement[] */ ],
  "paths": [],
  "solar": {},
  "measurements": {},
  "customDefinitions": []
}
```

Cada `PlacedElement` puede tener:

```json
{
  "id": "...",
  "definitionId": "casa",
  "x": 0, "y": 0, "width": 10, "height": 8,
  ...campos visuales...,
  "detail": {
    "_schema": "casa@2",
    "floors": 1,
    "walls": [],
    "labels": []
  }
}
```

El campo `detail` es **opcional** en el elemento. Si está ausente, el elemento funciona sin detalle (compatible con archivos v1).

---

## Versiones del archivo de proyecto (`version` top-level)

| Versión | Cambios |
|---------|---------|
| 1.0.0 | Terreno y elementos básicos (puntos planos, sin `terrain` anidado) |
| 2.0.0 | Añadido `terrain` como objeto; `entrance`; `paths`; `detail` en elementos |

### Reglas para incrementar versión

- **Patch** (2.0.x): correcciones de bugs en serialización. No cambia el schema.
- **Minor** (2.x.0): añade campos opcionales. Archivos viejos siguen siendo válidos.
- **Major** (x.0.0): cambio incompatible hacia atrás. El lector debe rechazar o migrar explícitamente.

El lector en `importProject` solo rechaza si `fileMajor > CURRENT_MAJOR`. Archivos con major igual o menor siempre se intentan leer con defaults para campos ausentes.

### Cómo añadir un campo nuevo al top-level

1. Añadir el campo con un valor por defecto seguro en `importProject` (`doc.nuevoCampo ?? defaultValue`).
2. Incrementar la versión minor.
3. Actualizar el historial de versiones en el comentario de `projectIO.js` y en esta tabla.

---

## Versiones de schema de elemento (`detail._schema`)

Formato: `"<definitionId>@<version>"`, ej. `"casa@2"`.

La versión del schema es un entero. Se incrementa cada vez que se añaden, renombran o eliminan campos del `detail`.

### Registro de schemas

| definitionId | Versión actual | Archivo |
|---|---|---|
| `casa` | 3 | `src/data/detailSchemas/casa.js` |
| `piscina` | 1 | `src/data/detailSchemas/piscina.js` |
| `huerto` | 1 | `src/data/detailSchemas/huerto.js` |

### Reglas para migración de schema

Implementadas en `src/utils/detailUtils.js`, función `migrateDetail(detail, targetVersion)`.

**Regla principal**: la migración es siempre aditiva. Nunca se elimina un campo que existía; si se renombra, se conserva el valor bajo el nuevo nombre y se elimina el viejo.

Cuando `importProject` carga un elemento y su `detail._schema` indica una versión menor a la actual, `migrateDetail` aplica las migraciones necesarias en cadena:

```
detail @ v1 → migrate v1→v2 → migrate v2→v3 → detail @ v3
```

Si `detail._schema` es desconocido (definitionId no registrado), se preserva `detail` tal cual sin modificar (round-trip safe).

Si `detail._schema` está ausente pero `detail` existe, se asume la versión más antigua conocida (v1 o la más baja del registro).

---

## Schema de `casa` — historial de versiones

### casa@1
```js
{ _schema: 'casa@1', floors: 1, roofType: 'a dos aguas', construction: 'hormigón', notes: '' }
```

### casa@2 (actual antes de HOUSE_EDITOR)
```js
{
  _schema: 'casa@2',
  floors, bedrooms, bathrooms, roofType, construction, notes,
  walls: Wall[],
  labels: Label[],
}
```

### casa@3 (introducido por HOUSE_EDITOR)
```js
{
  _schema: 'casa@3',
  // Campos existentes (v2):
  floors, bedrooms, bathrooms, roofType, construction, notes,
  walls: Wall[],
  labels: Label[],
  // Nuevos en v3:
  doors: Door[],
  windows: Window[],
  rooms: Room[],
  guides: Guide[],
  networkElements: NetworkElement[],
  networkSegments: NetworkSegment[],
  layers: LayerConfig,
  backgroundImage: BackgroundImage | null,
}
```

**Migración v2 → v3** (en `migrateDetail`):
```js
case 'casa':
  if (fromVersion < 3) {
    detail.doors            = detail.doors            ?? [];
    detail.windows          = detail.windows          ?? [];
    detail.rooms            = detail.rooms            ?? [];
    detail.guides           = detail.guides           ?? [];
    detail.networkElements  = detail.networkElements  ?? [];
    detail.networkSegments  = detail.networkSegments  ?? [];
    detail.layers           = detail.layers           ?? DEFAULT_LAYERS;
    detail.backgroundImage  = detail.backgroundImage  ?? null;
    detail._schema          = 'casa@3';
  }
```

Un archivo con `casa@2` abre sin error: los campos nuevos quedan vacíos y la planta muestra solo las paredes ya dibujadas.

---

## Qué NO requiere cambios en `projectIO.js`

La infraestructura de export/import ya es retrocompatible:

- `exportProject` serializa `elements` tal cual, incluyendo `detail` si existe.
- `importProject` restaura `elements` sin transformar `detail` (lo pasa opaco).
- La migración de schema ocurre en `detailUtils.migrateDetail`, llamada desde `App.jsx` al cargar el proyecto (después de `importProject`).
- Claves top-level desconocidas se preservan en `_extra` (forward compat parcial).

Por lo tanto: **ningún cambio a `projectIO.js` es necesario para HOUSE_EDITOR**.

---

## Checklist para implementadores

Al añadir campos nuevos al `detail` de un elemento:

- [ ] Incrementar `version` en el archivo `src/data/detailSchemas/<tipo>.js`.
- [ ] Actualizar `defaults` con el valor vacío/seguro del campo nuevo.
- [ ] Añadir caso de migración en `migrateDetail` para rellenar el campo cuando viene ausente.
- [ ] Actualizar la tabla "Registro de schemas" en este documento.
- [ ] Añadir test en `src/utils/__tests__/detailSchemas.test.js` que verifique que un `detail` con la versión anterior migra correctamente.
- [ ] Actualizar el historial de versiones del schema en este documento.

---

## Anti-patrones a evitar

| Mal | Bien |
|-----|------|
| Cambiar el tipo de un campo existente (ej. `walls` de array a objeto) | Añadir un campo nuevo; deprecar el viejo |
| Eliminar un campo en una versión nueva | Preservar el campo aunque esté vacío |
| Guardar estado transitorio de UI en `detail` (ej. `isExpanded: true`) | Solo guardar datos persistentes del modelo |
| Asumir que `detail` siempre existe | Siempre usar `element.detail ?? {}` |
| Asumir que `detail.walls` es un array | Siempre usar `detail.walls ?? []` |
