import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useLayoutSolver } from '../useLayoutSolver.js';

let lastWorker = null;

class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this.terminated = false;
    this.posted = [];
    lastWorker = this;
  }
  postMessage(payload) { this.posted.push(payload); }
  terminate() { this.terminated = true; }
  emit(data) { this.onmessage?.({ data }); }
}

beforeEach(() => {
  lastWorker = null;
  global.Worker = MockWorker;
});

function Probe({ apiRef }) {
  const api = useLayoutSolver();
  apiRef.current = api;
  return null;
}

const renderProbe = () => {
  const apiRef = { current: null };
  render(<Probe apiRef={apiRef} />);
  return apiRef;
};

describe('useLayoutSolver', () => {
  test('solve resolves with proposals when worker emits done', async () => {
    const apiRef = renderProbe();
    let resolved = null;
    await act(async () => {
      apiRef.current.solve({ numRuns: 4 }).then(r => { resolved = r; });
    });
    expect(lastWorker).toBeTruthy();
    expect(apiRef.current.isRunning).toBe(true);
    await act(async () => {
      lastWorker.emit({ type: 'done', proposals: [{ score: 1 }] });
    });
    expect(resolved).toEqual([{ score: 1 }]);
    expect(apiRef.current.isRunning).toBe(false);
    expect(apiRef.current.progress).toBeNull();
  });

  test('progress updates while running', async () => {
    const apiRef = renderProbe();
    await act(async () => { apiRef.current.solve({ numRuns: 3 }); });
    await act(async () => {
      lastWorker.emit({ type: 'progress', done: 1, total: 3, bestSoFar: 5 });
    });
    expect(apiRef.current.progress).toMatchObject({ done: 1, total: 3 });
  });

  test('cancel terminates worker and rejects pending promise', async () => {
    const apiRef = renderProbe();
    let rejected = null;
    await act(async () => {
      apiRef.current.solve({ numRuns: 4 }).catch(e => { rejected = e; });
    });
    await act(async () => { apiRef.current.cancel(); });
    expect(lastWorker.terminated).toBe(true);
    expect(apiRef.current.isRunning).toBe(false);
    await Promise.resolve();
    expect(rejected).toBeInstanceOf(Error);
  });

  test('error message rejects the pending promise', async () => {
    const apiRef = renderProbe();
    let rejected = null;
    await act(async () => {
      apiRef.current.solve({ numRuns: 4 }).catch(e => { rejected = e; });
    });
    await act(async () => {
      lastWorker.emit({ type: 'error', message: 'boom' });
    });
    expect(rejected).toBeInstanceOf(Error);
    expect(rejected.message).toBe('boom');
  });
});
