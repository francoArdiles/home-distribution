import { distanceElementToElement, distanceElementToTerrain, distanceElementToPoint } from './distanceUtils.js';

// ---------------------------------------------------------------------------
// Display name helpers
// ---------------------------------------------------------------------------

const SOURCE_LABELS = {
  any: 'Cualquier elemento',
};

const TARGET_LABELS = {
  terrain: 'Límite del terreno',
  any: 'Cualquier otro elemento',
  entrance: 'Entrada del terreno',
};

/**
 * Derives a human-readable display name for a constraint using the *current*
 * element labels. Falls back to the stored `constraint.name` (or a generic
 * string) when an element ID cannot be resolved — preserving backward
 * compatibility with older project files.
 *
 * @param {object} constraint
 * @param {Array<{id, label}>} elements
 * @returns {string}
 */
const prefixFor = (type) => (type === 'max-distance' ? 'máx.' : 'mín.');

export const getConstraintDisplayName = (constraint, elements) => {
  const { sourceId, targetId, value, name, type } = constraint;
  const prefix = prefixFor(type);

  const srcEl = elements.find(e => e.id === sourceId);
  const srcLabel = srcEl?.label ?? SOURCE_LABELS[sourceId];

  // If source cannot be resolved, fall back to stored name
  if (!srcLabel) return name || `Restricción (${prefix} ${value}m)`;

  let tgtLabel;
  if (TARGET_LABELS[targetId]) {
    tgtLabel = TARGET_LABELS[targetId];
  } else {
    const tgtEl = elements.find(e => e.id === targetId);
    tgtLabel = tgtEl?.label;
    // If target element ID not found, fall back to stored name
    if (!tgtLabel) return name || `${srcLabel} (${prefix} ${value}m)`;
  }

  const valueStr = Number.isInteger(value) ? `${value}` : `${value}`;
  return `${srcLabel} → ${tgtLabel} (${prefix} ${valueStr}m)`;
};

/**
 * Returns a new array of constraints with `name` refreshed to reflect the
 * current element labels. Does not mutate the originals.
 *
 * @param {Array<object>} constraints
 * @param {Array<{id, label}>} elements
 * @returns {Array<object>}
 */
export const refreshConstraintNames = (constraints, elements) =>
  constraints.map(c => ({ ...c, name: getConstraintDisplayName(c, elements) }));

export const validateConstraint = (constraint, elements, terrainPoints, baseScale, entrancePoint = null) => {
  if (!constraint.enabled) {
    return { valid: true, actualDistance: Infinity, requiredDistance: constraint.value };
  }

  const source = elements.find(e => e.id === constraint.sourceId);
  if (!source) return { valid: true, actualDistance: Infinity, requiredDistance: constraint.value };

  let actualDistance;
  if (constraint.targetId === 'terrain') {
    actualDistance = distanceElementToTerrain(source, terrainPoints, baseScale);
  } else if (constraint.targetId === 'entrance') {
    if (!entrancePoint) return { valid: true, actualDistance: Infinity, requiredDistance: constraint.value };
    actualDistance = distanceElementToPoint(source, entrancePoint);
  } else if (constraint.targetId === 'any') {
    // Minimum distance from source to ALL other elements
    const others = elements.filter(e => e.id !== constraint.sourceId);
    if (others.length === 0) return { valid: true, actualDistance: Infinity, requiredDistance: constraint.value };
    actualDistance = Math.min(...others.map(other => distanceElementToElement(source, other)));
  } else {
    const target = elements.find(e => e.id === constraint.targetId);
    if (!target) return { valid: true, actualDistance: Infinity, requiredDistance: constraint.value };
    actualDistance = distanceElementToElement(source, target);
  }

  const isMax = constraint.type === 'max-distance';
  const valid = isMax
    ? actualDistance <= constraint.value
    : actualDistance >= constraint.value;

  return {
    valid,
    actualDistance,
    requiredDistance: constraint.value,
  };
};

export const validateAllConstraints = (constraints, elements, terrainPoints, baseScale, entrancePoint = null) => {
  return constraints.map(constraint => ({
    constraint,
    ...validateConstraint(constraint, elements, terrainPoints, baseScale, entrancePoint),
  }));
};

// Default constraints by element type
const DEFAULT_CONSTRAINTS_MAP = {
  casa: [
    { targetId: 'terrain', value: 3, name: 'Casa: distancia mínima al límite del terreno' },
    { targetId: null, value: 5, name: 'Casa: separación mínima entre casas', forType: 'casa' },
  ],
  arbol_frutal: [
    { targetId: null, value: 4, name: 'Árbol frutal: separación entre árboles frutales', forType: 'arbol_frutal' },
  ],
  gallinero: [
    { targetId: null, value: 5, name: 'Gallinero: distancia mínima a la casa', forType: 'casa' },
  ],
  compost: [
    { targetId: null, value: 3, name: 'Compost: distancia mínima a la casa', forType: 'casa' },
  ],
  piscina: [
    { targetId: 'terrain', value: 2, name: 'Piscina: distancia mínima al límite del terreno' },
  ],
  huerto: [
    { targetId: null, value: 2, name: 'Huerto: distancia mínima al gallinero', forType: 'gallinero' },
  ],
};

export const getDefaultConstraints = (elementType, elementId) => {
  const templates = DEFAULT_CONSTRAINTS_MAP[elementType] || [];
  return templates.map((tpl, idx) => ({
    id: `${elementId}-default-${idx}`,
    name: tpl.name,
    type: 'min-distance',
    sourceId: elementId,
    targetId: tpl.targetId || tpl.forType || 'terrain',
    value: tpl.value,
    enabled: true,
  }));
};
