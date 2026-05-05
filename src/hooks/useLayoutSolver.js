import { useCallback, useEffect, useRef, useState } from 'react';

export const useLayoutSolver = () => {
  const workerRef = useRef(null);
  const pendingRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const ensureWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/layoutWorker.js', import.meta.url),
        { type: 'module' },
      );
    }
    return workerRef.current;
  };

  const handleMessage = useCallback((e) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      setProgress({ done: msg.done, total: msg.total, bestSoFar: msg.bestSoFar });
      return;
    }
    if (msg.type === 'done') {
      const p = pendingRef.current;
      pendingRef.current = null;
      setIsRunning(false);
      setProgress(null);
      p?.resolve(msg.proposals);
      return;
    }
    if (msg.type === 'error') {
      const p = pendingRef.current;
      pendingRef.current = null;
      setIsRunning(false);
      setProgress(null);
      p?.reject(new Error(msg.message));
    }
  }, []);

  const handleError = useCallback((err) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setIsRunning(false);
    setProgress(null);
    p?.reject(err);
  }, []);

  const solve = useCallback((payload) => new Promise((resolve, reject) => {
    const w = ensureWorker();
    w.onmessage = handleMessage;
    w.onerror = handleError;
    pendingRef.current = { resolve, reject };
    setIsRunning(true);
    setProgress({ done: 0, total: payload.numRuns ?? 8, bestSoFar: Infinity });
    w.postMessage(payload);
  }), [handleMessage, handleError]);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (pendingRef.current) {
      pendingRef.current.reject(new Error('cancelled'));
      pendingRef.current = null;
    }
    setIsRunning(false);
    setProgress(null);
  }, []);

  useEffect(() => () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return { solve, cancel, progress, isRunning };
};

export default useLayoutSolver;
