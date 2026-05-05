// Given a problem description, returns the recommended algorithm key.
// Heuristic (plan/AUTO_07_algorithms.md, seccion AUTO_07_4):
//   H == 0                        -> 'sa'   (sin constraints, SA converge rapido)
//   H >= 1 y N <= 30              -> 'sa'   (default seguro)
//   H >= 1 y N > 30 y memetic ok  -> 'memetic'  (no implementado aun -> cae a 'sa')
//   otro                          -> 'sa'
// GA no entra en la heuristica: aunque es estable, su ventaja sobre SA en el
// caso real no esta cuantificada. El usuario avanzado puede elegirlo a mano.
export const selectAlgorithm = ({ elements = [], constraints = [], available = { sa: true, ga: true } } = {}) => {
  const movable = elements.filter(e => !e.locked).length;
  const hardCount = constraints.filter(c => c.enabled).length;
  if (hardCount === 0) return 'sa';
  if (movable <= 30) return 'sa';
  if (available.memetic) return 'memetic';
  return 'sa';
};
