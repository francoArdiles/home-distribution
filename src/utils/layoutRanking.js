// Lexicographic comparison: feasible always beats infeasible;
// among equals (same violationCount) the lower softScore wins.
export const compareLex = (a, b) => {
  if (a.violationCount !== b.violationCount) return a.violationCount - b.violationCount;
  if (a.softScore !== b.softScore) return a.softScore - b.softScore;
  return 0;
};

export const rankLex = (evaluations) => {
  const order = evaluations.map((e, i) => [e, i]).sort((x, y) => compareLex(x[0], y[0]));
  const ranks = new Array(evaluations.length);
  for (let r = 0; r < order.length; r++) ranks[order[r][1]] = r;
  return ranks;
};

export const argminLex = (evaluations) => {
  let best = 0;
  for (let i = 1; i < evaluations.length; i++) {
    if (compareLex(evaluations[i], evaluations[best]) < 0) best = i;
  }
  return best;
};
