import piscina from './piscina.js';
import casa from './casa.js';
import huerto from './huerto.js';

/** Map of definitionId → DetailSchema */
const registry = {
  piscina,
  casa,
  huerto,
};

export default registry;
