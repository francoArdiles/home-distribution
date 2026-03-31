import { distanceElementToElement, distanceElementToTerrain } from './distanceUtils.js';

export const validateConstraint = (constraint, elements, terrainPoints, baseScale) => {
  if (!constraint.enabled) {
    return { valid: true, actualDistance: Infinity, requiredDistance: constraint.value };
  }

  const source = elements.find(e => e.id === constraint.sourceId);
  if (!source) return { valid: true, actualDistance: Infinity, requiredDistance: constraint.value };

  let actualDistance;
  if (constraint.targetId === 'terrain') {
    actualDistance = distanceElementToTerrain(source, terrainPoints, baseScale);
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

  return {
    valid: actualDistance >= constraint.value,
    actualDistance,
    requiredDistance: constraint.value,
  };
};

export const validateAllConstraints = (constraints, elements, terrainPoints, baseScale) => {
  return constraints.map(constraint => ({
    constraint,
    ...validateConstraint(constraint, elements, terrainPoints, baseScale),
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
