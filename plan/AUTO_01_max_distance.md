# AUTO_01 — Tipo max-distance en restricciones

**Estado: DONE**

## Goal

Extender el modelo de constraints para aceptar `type: 'max-distance'` además del existente `'min-distance'`. Permite declarar proximidad requerida entre elementos (ej: tanque de agua cerca de casa).

## Cambios realizados

### `src/utils/constraintUtils.js`

- `validateConstraint` bifurca según `constraint.type`:
  - `max-distance`: válido si `actualDistance <= value`
  - `min-distance` o undefined: válido si `actualDistance >= value`
- `getConstraintDisplayName` usa prefijo `"máx."` o `"mín."` según type.
- Helper interno `prefixFor(type)`.

### `src/components/ConstraintPanel.jsx`

- Nuevo estado `formType` (default `'min-distance'`).
- Selector `<select aria-label="Tipo">` con opciones "Distancia mínima" / "Distancia máxima".
- Label del input numérico cambia según type.
- Al enviar, `type` viene del form y el `name` auto-generado usa el prefijo correcto.
- Display de violación usa `c.type === 'max-distance' ? 'máx.' : 'mín.'`.

## Tests

- `src/utils/__tests__/constraintUtils.test.js`: 6 tests nuevos bajo `describe('validateConstraint — max-distance')`.
- `src/utils/__tests__/constraintLabel.test.js`: 1 test para formato de label con max.
- `src/components/__tests__/ConstraintPanel.test.jsx`: 1 test para el selector de tipo.

## Backward compat

Constraints sin `type` se interpretan como `'min-distance'`. Los archivos de proyecto antiguos siguen cargando.

## Follow-ups no incluidos

- Defaults para `tanque_agua -> casa: máx. 20m` requieren crear el elemento `tanque_agua` en `elementDefinitions.js` primero.
- El label en `handleSubmit` usa `"mín."`/`"máx."` literales; si más tipos aparecen, mover a `getConstraintDisplayName`.
