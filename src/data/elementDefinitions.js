export const elementDefinitions = [
  { id: 'casa', name: 'Casa', shape: 'rectangle', defaultWidth: 10, defaultHeight: 8, color: '#E8D5B7', borderColor: '#8B6914', borderWidth: 2, properties: { sunNeeds: 'partial', waterNeeds: 'low', minSpacing: 2 } },
  { id: 'piscina', name: 'Piscina', shape: 'rectangle', defaultWidth: 8, defaultHeight: 4, color: '#87CEEB', borderColor: '#1E90FF', borderWidth: 2, properties: { sunNeeds: 'full', waterNeeds: 'high', minSpacing: 3 } },
  { id: 'huerto', name: 'Huerto', shape: 'rectangle', defaultWidth: 4, defaultHeight: 2, color: '#90EE90', borderColor: '#228B22', borderWidth: 1, properties: { sunNeeds: 'full', waterNeeds: 'medium', minSpacing: 1 } },
  { id: 'gallinero', name: 'Gallinero', shape: 'rectangle', defaultWidth: 3, defaultHeight: 2, color: '#DEB887', borderColor: '#8B4513', borderWidth: 1, properties: { sunNeeds: 'partial', waterNeeds: 'low', minSpacing: 2 } },
  { id: 'arbol_frutal', name: 'Árbol Frutal', shape: 'circle', defaultWidth: 4, defaultHeight: 4, defaultRadius: 2, color: '#228B22', borderColor: '#006400', borderWidth: 1, properties: { sunNeeds: 'full', waterNeeds: 'medium', minSpacing: 3 } },
  { id: 'compost', name: 'Área de Compost', shape: 'rectangle', defaultWidth: 1, defaultHeight: 1, color: '#8B4513', borderColor: '#5C3317', borderWidth: 1, properties: { sunNeeds: 'partial', waterNeeds: 'low', minSpacing: 1 } },
  { id: 'recreacion', name: 'Área de Recreación', shape: 'rectangle', defaultWidth: 6, defaultHeight: 6, color: '#F0E68C', borderColor: '#DAA520', borderWidth: 1, properties: { sunNeeds: 'full', waterNeeds: 'low', minSpacing: 1 } },
  { id: 'sendero', name: 'Sendero', shape: 'rectangle', defaultWidth: 5, defaultHeight: 1, color: '#D2B48C', borderColor: '#8B7355', borderWidth: 1, properties: { sunNeeds: 'full', waterNeeds: 'low', minSpacing: 0 } },
];

export const getElementDefinition = (id) => elementDefinitions.find((def) => def.id === id);
