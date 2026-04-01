import { useState, useCallback, useRef } from 'react';

const DEFAULT_MAX_SIZE = 50;

/**
 * Generic undo history stack.
 * @param {number} maxSize - maximum number of snapshots to keep
 */
const useUndoHistory = (maxSize = DEFAULT_MAX_SIZE) => {
  // useRef holds the real stack so reads/writes are always synchronous
  const stackRef = useRef([]);
  // useState only drives re-renders when the stack length changes
  const [, setLen] = useState(0);

  const push = useCallback((snapshot) => {
    const next = [...stackRef.current, snapshot];
    stackRef.current = next.length > maxSize ? next.slice(next.length - maxSize) : next;
    setLen(stackRef.current.length);
  }, [maxSize]);

  const undo = useCallback(() => {
    if (stackRef.current.length === 0) return null;
    const restored = stackRef.current[stackRef.current.length - 1];
    stackRef.current = stackRef.current.slice(0, -1);
    setLen(stackRef.current.length);
    return restored;
  }, []);

  const clear = useCallback(() => {
    stackRef.current = [];
    setLen(0);
  }, []);

  return {
    push,
    undo,
    clear,
    canUndo: stackRef.current.length > 0,
  };
};

export default useUndoHistory;
