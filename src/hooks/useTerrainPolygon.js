import { useState, useCallback } from 'react';

/**
 * Custom hook for terrain polygon logic.
 * Returns an object with state and handlers for polygon drawing.
 */
export const useTerrainPolygon = () => {
  const [points, setPoints] = useState([]); // array of {x, y} in layer coordinates (bottom-left origin)
  const [finished, setFinished] = useState(false); // whether polygon is finished (>=3 points and Enter pressed)

  const addPoint = useCallback((point) => {
    setPoints(prev => [...prev, point]);
  }, []);

  const finish = useCallback(() => {
    if (points.length >= 3) {
      setFinished(true);
    }
  }, [points]);

  const cancel = useCallback(() => {
    setPoints([]);
    setFinished(false);
  }, []);

  const removeLastPoint = useCallback(() => {
    setPoints(prev => {
      if (prev.length > 0) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  // Optional: move point index to new position
  const movePoint = useCallback((index, newPoint) => {
    setPoints(prev => {
      const newPoints = [...prev];
      if (index >= 0 && index < newPoints.length) {
        newPoints[index] = newPoint;
      }
      return newPoints;
    });
  }, []);

  return {
    points,
    finished,
    addPoint,
    finish,
    cancel,
    removeLastPoint,
    movePoint,
    setPoints,
    setFinished
  };
};