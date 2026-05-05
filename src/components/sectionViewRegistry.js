import PoolSectionView  from './PoolSectionView.jsx';
import CasaSectionView  from './CasaSectionView.jsx';
import HuertoSectionView from './HuertoSectionView.jsx';

/**
 * Mapea el nombre del schema (sin versión) al componente de vista de sección.
 * Para agregar un nuevo elemento: importar el componente y añadir la entrada.
 */
const registry = {
  piscina: PoolSectionView,
  casa:    CasaSectionView,
  huerto:  HuertoSectionView,
};

/**
 * Retorna el componente de vista de sección para el schema dado, o null.
 * @param {string} schemaName — e.g. 'piscina', 'casa', 'huerto'
 */
export function getSectionView(schemaName) {
  return registry[schemaName] ?? null;
}
