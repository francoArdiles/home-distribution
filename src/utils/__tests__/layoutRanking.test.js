import { describe, test, expect } from 'vitest';
import { compareLex, rankLex, argminLex } from '../layoutRanking.js';

describe('layoutRanking', () => {
  test('feasible beats infeasible regardless of softScore', () => {
    const feasible = { violationCount: 0, softScore: 100 };
    const infeasible = { violationCount: 1, softScore: 0 };
    expect(compareLex(feasible, infeasible)).toBeLessThan(0);
  });

  test('among equals, lower softScore wins', () => {
    const a = { violationCount: 0, softScore: 1 };
    const b = { violationCount: 0, softScore: 2 };
    expect(compareLex(a, b)).toBeLessThan(0);
    expect(compareLex(b, a)).toBeGreaterThan(0);
  });

  test('rankLex assigns 0 to the best', () => {
    const evals = [
      { violationCount: 2, softScore: 0 },
      { violationCount: 0, softScore: 10 },
      { violationCount: 1, softScore: 0 },
      { violationCount: 0, softScore: 5 },
    ];
    const ranks = rankLex(evals);
    // Best is index 3 (0 violations, softScore 5).
    expect(ranks[3]).toBe(0);
    expect(ranks[1]).toBe(1);
    expect(ranks[2]).toBe(2);
    expect(ranks[0]).toBe(3);
  });

  test('argminLex returns index of best', () => {
    const evals = [
      { violationCount: 1, softScore: 0 },
      { violationCount: 0, softScore: 99 },
      { violationCount: 0, softScore: 50 },
    ];
    expect(argminLex(evals)).toBe(2);
  });
});
