import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useUndoHistory from '../useUndoHistory.js';

describe('useUndoHistory', () => {
  test('canUndo is false initially', () => {
    const { result } = renderHook(() => useUndoHistory());
    expect(result.current.canUndo).toBe(false);
  });

  test('canUndo is true after pushing one snapshot', () => {
    const { result } = renderHook(() => useUndoHistory());
    act(() => { result.current.push({ elements: [] }); });
    expect(result.current.canUndo).toBe(true);
  });

  test('undo returns the last pushed snapshot', () => {
    const { result } = renderHook(() => useUndoHistory());
    const snap = { elements: [{ id: '1' }] };
    act(() => { result.current.push(snap); });
    let restored;
    act(() => { restored = result.current.undo(); });
    expect(restored).toEqual(snap);
  });

  test('undo removes the snapshot from the stack', () => {
    const { result } = renderHook(() => useUndoHistory());
    act(() => { result.current.push({ a: 1 }); });
    act(() => { result.current.undo(); });
    expect(result.current.canUndo).toBe(false);
  });

  test('undo returns null when stack is empty', () => {
    const { result } = renderHook(() => useUndoHistory());
    let restored;
    act(() => { restored = result.current.undo(); });
    expect(restored).toBeNull();
  });

  test('multiple pushes and undos work in LIFO order', () => {
    const { result } = renderHook(() => useUndoHistory());
    act(() => { result.current.push({ step: 1 }); });
    act(() => { result.current.push({ step: 2 }); });
    act(() => { result.current.push({ step: 3 }); });

    let r;
    act(() => { r = result.current.undo(); });
    expect(r.step).toBe(3);
    act(() => { r = result.current.undo(); });
    expect(r.step).toBe(2);
    act(() => { r = result.current.undo(); });
    expect(r.step).toBe(1);
    expect(result.current.canUndo).toBe(false);
  });

  test('clear resets the history', () => {
    const { result } = renderHook(() => useUndoHistory());
    act(() => { result.current.push({ a: 1 }); });
    act(() => { result.current.push({ a: 2 }); });
    act(() => { result.current.clear(); });
    expect(result.current.canUndo).toBe(false);
  });

  test('respects maxSize — oldest entries are dropped', () => {
    const { result } = renderHook(() => useUndoHistory(3));
    act(() => { result.current.push({ n: 1 }); });
    act(() => { result.current.push({ n: 2 }); });
    act(() => { result.current.push({ n: 3 }); });
    act(() => { result.current.push({ n: 4 }); }); // should drop n:1

    let r;
    act(() => { r = result.current.undo(); });
    expect(r.n).toBe(4);
    act(() => { r = result.current.undo(); });
    expect(r.n).toBe(3);
    act(() => { r = result.current.undo(); });
    expect(r.n).toBe(2);
    expect(result.current.canUndo).toBe(false); // n:1 was dropped
  });
});
