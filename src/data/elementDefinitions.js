export const elementDefinitions = [
  { id: 'casa', name: 'Casa', shape: 'rectangle', defaultWidth: 10, defaultHeight: 8, color: '#E8D5B7', borderColor: '#8B6914', borderWidth: 2, category: 'hogar', properties: { sunNeeds: 'partial', waterNeeds: 'low', minSpacing: 2 } },
  { id: 'piscina', name: 'Piscina', shape: 'rectangle', defaultWidth: 8, defaultHeight: 4, color: '#87CEEB', borderColor: '#1E90FF', borderWidth: 2, category: 'jardin', properties: { sunNeeds: 'full', waterNeeds: 'high', minSpacing: 3 } },
  { id: 'huerto', name: 'Huerto', shape: 'rectangle', defaultWidth: 4, defaultHeight: 2, color: '#90EE90', borderColor: '#228B22', borderWidth: 1, category: 'jardin', properties: { sunNeeds: 'full', waterNeeds: 'medium', minSpacing: 1 } },
  { id: 'gallinero', name: 'Gallinero', shape: 'rectangle', defaultWidth: 3, defaultHeight: 2, color: '#DEB887', borderColor: '#8B4513', borderWidth: 1, category: 'animales', properties: { sunNeeds: 'partial', waterNeeds: 'low', minSpacing: 2 } },
  { id: 'arbol_frutal', name: 'Árbol Frutal', shape: 'circle', defaultWidth: 4, defaultHeight: 4, defaultRadius: 2, color: '#228B22', borderColor: '#006400', borderWidth: 1, category: 'sostenibilidad', properties: { sunNeeds: 'full', waterNeeds: 'medium', minSpacing: 3 } },
  { id: 'compost', name: 'Área de Compost', shape: 'rectangle', defaultWidth: 1, defaultHeight: 1, color: '#8B4513', borderColor: '#5C3317', borderWidth: 1, category: 'sostenibilidad', properties: { sunNeeds: 'partial', waterNeeds: 'low', minSpacing: 1 } },
  { id: 'recreacion', name: 'Área de Recreación', shape: 'rectangle', defaultWidth: 6, defaultHeight: 6, color: '#F0E68C', borderColor: '#DAA520', borderWidth: 1, category: 'jardin', properties: { sunNeeds: 'full', waterNeeds: 'low', minSpacing: 1 } },
  { id: 'sendero', name: 'Sendero', shape: 'rectangle', defaultWidth: 5, defaultHeight: 1, color: '#D2B48C', borderColor: '#8B7355', borderWidth: 1, category: 'jardin', properties: { sunNeeds: 'full', waterNeeds: 'low', minSpacing: 0 } },
  { id: 'pozo', name: 'Pozo', shape: 'circle', defaultWidth: 2, defaultHeight: 2, defaultRadius: 1, color: '#4169E1', borderColor: '#0000CD', borderWidth: 1, category: 'sostenibilidad', properties: { sunNeeds: 'partial', waterNeeds: 'high', minSpacing: 2 } },
  { id: 'bodega', name: 'Bodega', shape: 'rectangle', defaultWidth: 4, defaultHeight: 3, color: '#A0522D', borderColor: '#8B4513', borderWidth: 1, category: 'hogar', properties: { sunNeeds: 'low', waterNeeds: 'low', minSpacing: 1 } },
  { id: 'taller', name: 'Taller', shape: 'rectangle', defaultWidth: 5, defaultHeight: 4, color: '#808080', borderColor: '#696969', borderWidth: 1, category: 'hogar', properties: { sunNeeds: 'partial', waterNeeds: 'low', minSpacing: 2 } },
  { id: 'estacionamiento', name: 'Estacionamiento', shape: 'rectangle', defaultWidth: 6, defaultHeight: 3, color: '#D3D3D3', borderColor: '#A9A9A9', borderWidth: 1, category: 'hogar', properties: { sunNeeds: 'full', waterNeeds: 'low', minSpacing: 1 } },
  { id: 'estanque', name: 'Estanque', shape: 'circle', defaultWidth: 5, defaultHeight: 5, defaultRadius: 2.5, color: '#4682B4', borderColor: '#0000CD', borderWidth: 1, category: 'jardin', properties: { sunNeeds: 'partial', waterNeeds: 'high', minSpacing: 2 } },
];

export const getElementDefinition = (id) => elementDefinitions.find((def) => def.id === id);

export const getElementsByCategory = (categoryId) => elementDefinitions.filter((def) => def.category === categoryId);

/**
 * For polygon definitions, compute the axis-aligned bounding box of the points.
 * Returns { minX, minY, maxX, maxY, width, height } in meters.
 */
export const getPolyBbox = (points) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};
