import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Label, Tag, Text } from 'react-konva';
import { calculateArea, calculatePerimeter, wouldCauseSelfIntersection } from '../utils/geometryUtils';
import { getEdgeLengthMeters, entranceToT, getEntranceGapPoints, clampEntrancePosition, projectPointOnEdge } from '../utils/entranceUtils.js';
import PlacedElementsLayer from './PlacedElementsLayer.jsx';
import CardinalLayer from './CardinalLayer.jsx';
import SolarPathLayer from './SolarPathLayer.jsx';
import ShadowLayer from './ShadowLayer.jsx';
import MeasurementOverlay from './MeasurementOverlay.jsx';

const TerrainCanvas = ({
  onPointsChange, container, gridVisible = false, gridSize = 10,
  onCursorMove, onFinish, onCancel, finished: finishedProp,
  activeElementType = null, onPlaceElement,
  placedElements = [], onSelectElement, onMoveElement, onResizeElement, onRotateElement,
  snapToGridEnabled = false,
  solarVisible = false, solarConfig = null,
  measurementConfig = null,
  onAddMeasurement, onSetActiveTool,
  selectedElementId = null,
  violatingIds = null,
  customDefinitions = [],
  terrainEditMode = false,
  entrance = null,
  entranceMode = false,
  onEntranceChange,
  initialPoints = [],
  initialFinished = false,
}) => {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [points, setPoints] = useState(initialPoints); // array of {x, y} in layer coordinates
  const [finishedInternal, setFinishedInternal] = useState(initialFinished);
  // finishedProp (from Toolbar) takes priority over internal state
  const finished = finishedProp === true ? true : finishedInternal;
  const [hoverSegmentIndex, setHoverSegmentIndex] = useState(-1); // index of segment being hovered
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState('');
  const [area, setArea] = useState(0); // area of polygon in square meters
  const [perimeter, setPerimeter] = useState(0); // perimeter of polygon in meters
  const [invalidPreview, setInvalidPreview] = useState(false); // whether the preview point would cause self-intersection
  const [scale, setScale] = useState(1); // stage scale (layer to stage)
  const [draggingVertexIndex, setDraggingVertexIndex] = useState(-1); // index of vertex being dragged

  // Ref so drag handlers always read the latest entrance (avoids stale closure)
  const entranceRef = useRef(entrance);
  useEffect(() => { entranceRef.current = entrance; }, [entrance]);
  const [position, setPosition] = useState({ x: 0, y: 0 }); // stage position (top-left) in stage coordinates

  const baseScale = 10; // 10px = 1m (layer pixel to meter)
  const precision = 1; // decimal precision
  const pointRadius = 5;
  const lineWidth = 2;
  const dragTolerance = 2; // pixels for point movement

  // Measure container and keep stage size in sync
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      setStageSize({ width: el.clientWidth, height: el.clientHeight });
    }
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setStageSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stageWidth = stageSize.width;
  const stageHeight = stageSize.height;

  // Convert stage pointer position to layer coordinates
  const getLayerPos = useCallback((evt) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointerStage = stage.getPointerPosition();
    if (!pointerStage) return null;
    const { x: pointerX, y: pointerY } = pointerStage;
    const { x: tx, y: ty } = position;
    const s = scale;
    // layer coordinates: (pointerX - tx) / s, (pointerY - ty) / s
    return {
      x: (pointerX - tx) / s,
      y: (pointerY - ty) / s
    };
  }, [position, scale]);

  // Convert layer coordinates to stage coordinates (for drawing)
  const getStagePos = useCallback((layerPoint) => {
    const { x: tx, y: ty } = position;
    const s = scale;
    return {
      x: s * layerPoint.x + tx,
      y: s * layerPoint.y + ty
    };
  }, [position, scale]);

  // Get canvas bounds in layer coordinates
  const getCanvasBounds = useCallback(() => {
    const layerLeft = -position.x / scale;
    const layerTop = -position.y / scale;
    const layerRight = layerLeft + stageWidth / scale;
    const layerBottom = layerTop + stageHeight / scale;
    return {
      left: layerLeft,
      top: layerTop,
      right: layerRight,
      bottom: layerBottom
    };
  }, [position, scale, stageWidth, stageHeight]);

  // Check if a point is within canvas bounds
  const isPointInCanvas = useCallback((pos) => {
    const bounds = getCanvasBounds();
    return (
      pos.x >= bounds.left &&
      pos.x <= bounds.right &&
      pos.y >= bounds.top &&
      pos.y <= bounds.bottom
    );
  }, [getCanvasBounds]);

  // Segment intersection check (using orientation method)
  const orientation = (p, q, r) => {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0; // colinear
    return val > 0 ? 1 : 2; // clock or counterclock wise
  };

  const onSegment = (p, q, r) => {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
           q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
  };

  const segmentsIntersect = (seg1, seg2) => {
    const o1 = orientation(seg1.p1, seg1.p2, seg2.p1);
    const o2 = orientation(seg1.p1, seg1.p2, seg2.p2);
    const o3 = orientation(seg2.p1, seg2.p2, seg1.p1);
    const o4 = orientation(seg2.p1, seg2.p2, seg1.p2);

    if (o1 !== o2 && o3 !== o4) return true;

    // Special Cases
    if (o1 === 0 && onSegment(seg1.p1, seg2.p1, seg1.p2)) return true;
    if (o2 === 0 && onSegment(seg1.p1, seg2.p2, seg1.p2)) return true;
    if (o3 === 0 && onSegment(seg2.p1, seg1.p1, seg2.p2)) return true;
    if (o4 === 0 && onSegment(seg2.p1, seg1.p2, seg2.p2)) return true;

    return false;
  };

  // Helper: distance from point to segment (layer coordinates)
  const distanceFromPointToSegment = (p, a, b) => {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ap = { x: p.x - a.x, y: p.y - a.y };
    const ab2 = ab.x * ab.x + ab.y * ab.y;
    if (ab2 === 0) {
      return Math.sqrt(ap.x * ap.x + ap.y * ap.y);
    }
    const t = (ap.x * ab.x + ap.y * ab.y) / ab2;
    const clampedT = Math.max(0, Math.min(1, t));
    const closest = { x: a.x + clampedT * ab.x, y: a.y + clampedT * ab.y };
    const dx = p.x - closest.x;
    const dy = p.y - closest.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Find if click is on an existing point (within tolerance)
  const findPointAtPosition = useCallback((pos) => {
    return points.findIndex((p, idx) => {
      const dx = pos.x - p.x;
      const dy = pos.y - p.y;
      return Math.sqrt(dx * dx + dy * dy) <= dragTolerance;
    });
  }, [points]);

  // Handle click to add point or place element
  const handleClick = useCallback((e) => {
    const pos = getLayerPos(e.evt);
    if (!pos) return;
    if (!isPointInCanvas(pos)) return;

    // Entrance mode: clicking a hovered edge places/moves the entrance
    if (entranceMode && finished) {
      if (hoverSegmentIndex >= 0) {
        const p1 = points[hoverSegmentIndex];
        const p2 = points[(hoverSegmentIndex + 1) % points.length];
        const edgeLenM = getEdgeLengthMeters(p1, p2, baseScale);
        const cur = entranceRef.current;
        // Preserve existing width when repositioning on the same edge; use default only for new entrance
        const existingWidth = cur && cur.edgeIndex === hoverSegmentIndex ? cur.width : null;
        const width = existingWidth ?? Math.max(1, Math.min(3, edgeLenM * 0.3));
        const t = projectPointOnEdge(pos.x, pos.y, p1, p2);
        const newPos = clampEntrancePosition(t, width, edgeLenM);
        onEntranceChange?.({ edgeIndex: hoverSegmentIndex, position: newPos, width });
      }
      return;
    }

    // If terrain is being edited, ignore clicks for placement
    if (terrainEditMode) return;

    // If terrain is finished and an element type is active, place element
    if (finished && activeElementType && onPlaceElement) {
      onPlaceElement(pos.x / baseScale, pos.y / baseScale);
      return;
    }

    if (finished) return; // terrain done, not placing element — ignore

    // Check if clicking on an existing point (for potential future drag)
    const hitPointIndex = findPointAtPosition(pos);
    if (hitPointIndex >= 0) return;

    // Check self-intersection before adding
    if (!wouldCauseSelfIntersection(points, pos)) {
      const newPoints = [...points, pos];
      setPoints(newPoints);
      onPointsChange(newPoints);
      const newArea = calculateArea(newPoints);
      const newPerimeter = calculatePerimeter(newPoints);
      setArea(newArea);
      setPerimeter(newPerimeter);
    }
  }, [finished, activeElementType, onPlaceElement, getLayerPos, isPointInCanvas, findPointAtPosition, wouldCauseSelfIntersection, points, onPointsChange, calculateArea, calculatePerimeter, baseScale]);

  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const draggedPointIndexRef = useRef(-1);

  const handleStageMouseDown = useCallback((e) => {
    if (e.evt.button !== 0) return; // Only left mouse button
    
    const pos = getLayerPos(e.evt);
    if (!pos) return;
    
    // Check if clicking on an existing point
    const hitPointIndex = findPointAtPosition(pos);
    
    if (hitPointIndex >= 0 && (!finished || terrainEditMode)) {
      // Start dragging the point
      setIsDraggingPoint(true);
      draggedPointIndexRef.current = hitPointIndex;
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
    } else {
      // Start panning
      setIsPanning(true);
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
    }
  }, [getLayerPos, findPointAtPosition, finished]);

  const handleStageMouseMove = useCallback((e) => {
    const pos = getLayerPos(e.evt);
    if (!pos) return;

    // Handle point dragging
    if (isDraggingPoint && lastPanPos && draggedPointIndexRef.current >= 0) {
      const dx = e.evt.clientX - lastPanPos.x;
      const dy = e.evt.clientY - lastPanPos.y;
      
      const deltaLayer = {
        x: dx / scale,
        y: dy / scale
      };
      
      const newPoints = [...points];
      const idx = draggedPointIndexRef.current;
      newPoints[idx] = {
        x: newPoints[idx].x + deltaLayer.x,
        y: newPoints[idx].y + deltaLayer.y
      };
      
      setPoints(newPoints);
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
    }
    
    // Handle panning
    if (isPanning && lastPanPos) {
      const dx = e.evt.clientX - lastPanPos.x;
      const dy = e.evt.clientY - lastPanPos.y;
      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
    }

    // Call onCursorMove with coordinates in meters (only when not finished)
    if (!finished && onCursorMove) {
      onCursorMove({ x: pos.x / baseScale, y: pos.y / baseScale });
    }

    // Find which segment is being hovered for tooltip
    if (points.length >= 1) {
      let found = -1;
      const threshold = 5; // pixels in layer coordinates

      // Build list of segments to check (all open segments + closing segment if finished)
      const segmentsToCheck = [];
      for (let i = 0; i < points.length - 1; i++) {
        segmentsToCheck.push({ idx: i, p1: points[i], p2: points[i + 1] });
      }
      if (finished && points.length >= 3) {
        segmentsToCheck.push({ idx: points.length - 1, p1: points[points.length - 1], p2: points[0] });
      }

      for (const seg of segmentsToCheck) {
        const dist = distanceFromPointToSegment(pos, seg.p1, seg.p2);
        if (dist < threshold) {
          found = seg.idx;
          break;
        }
      }

      setHoverSegmentIndex(found);

      if (found >= 0) {
        const p1 = points[found];
        const p2 = points[(found + 1) % points.length];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const stagePos = getStagePos({ x: midX, y: midY });
        setTooltipPos(stagePos);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthPx = Math.sqrt(dx * dx + dy * dy);
        const lengthM = lengthPx / baseScale;
        setTooltipText(`${lengthM.toFixed(precision)} m`);
      } else {
        // Check preview segment (last point to cursor) - only when not finished
        if (!finished && points.length >= 1) {
          const p1 = points[points.length - 1];
          const dist = distanceFromPointToSegment(pos, p1, pos);
          if (dist < threshold) {
            const stagePos = getStagePos(pos);
            setTooltipPos(stagePos);

            const dx = pos.x - p1.x;
            const dy = pos.y - p1.y;
            const lengthPx = Math.sqrt(dx * dx + dy * dy);
            const lengthM = lengthPx / baseScale;
            setTooltipText(`${lengthM.toFixed(precision)} m`);

            // Check if this preview point would cause self-intersection
            const wouldIntersect = wouldCauseSelfIntersection(points, pos);
            setInvalidPreview(wouldIntersect);
          } else {
            setHoverSegmentIndex(-1);
            setTooltipText('');
            setInvalidPreview(false);
          }
        } else {
          setTooltipText('');
          setInvalidPreview(false);
        }
      }
    } else {
      setHoverSegmentIndex(-1);
      setTooltipText('');
    }
  }, [isDraggingPoint, isPanning, lastPanPos, points, getLayerPos, getStagePos, scale, finished, onCursorMove, getCanvasBounds]);

  const handleStageMouseUp = useCallback((e) => {
    if (isDraggingPoint) {
      // Finalize point drag
      const idx = draggedPointIndexRef.current;
      if (idx >= 0) {
        onPointsChange([...points]);
      }
      setIsDraggingPoint(false);
      draggedPointIndexRef.current = -1;
    }
    
    setIsPanning(false);
    setLastPanPos(null);
  }, [isDraggingPoint, points, onPointsChange]);

  // Handle point drag end (called by Circle component)
  const handlePointDragEnd = useCallback((e, idx) => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointerStage = stage.getPointerPosition();
    if (!pointerStage) return;
    
    const { x: tx, y: ty } = position;
    const s = scale;
    const layerPos = {
      x: (pointerStage.x - tx) / s,
      y: (pointerStage.y - ty) / s
    };
    
    // Validate new position is within canvas
    if (isPointInCanvas(layerPos)) {
      setPoints(prev => {
        const newPoints = [...prev];
        newPoints[idx] = layerPos;
        return newPoints;
      });
      onPointsChange([...points]);
      
      // Calculate and update area and perimeter after drag
      const newArea = calculateArea([...points]);
      const newPerimeter = calculatePerimeter([...points]);
      setArea(newArea);
      setPerimeter(newPerimeter);
    }
  }, [position, scale, isPointInCanvas, onPointsChange, points, calculateArea, calculatePerimeter]);

  // Use a ref so the window keydown handler always sees the latest state
  const keyStateRef = useRef({ points, finished, onPointsChange, onFinish, onCancel });
  keyStateRef.current = { points, finished, onPointsChange, onFinish, onCancel };

  useEffect(() => {
    const handler = (e) => {
      const { points, finished, onPointsChange, onFinish, onCancel } = keyStateRef.current;
      if (e.key === 'Enter') {
        if (!finished && points.length >= 3) {
          setFinishedInternal(true);
          onPointsChange([...points]);
          onFinish?.();
        }
      } else if (e.key === 'Escape') {
        setPoints([]);
        setFinishedInternal(false);
        onPointsChange([]);
        onCancel?.();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (!finished && points.length > 0) {
          const newPoints = points.slice(0, -1);
          setPoints(newPoints);
          onPointsChange(newPoints);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel zoom (zoom toward mouse position)
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointerStage = stage.getPointerPosition();
    if (!pointerStage) return;
    
    const delta = e.evt.deltaY;
    const zoomFactor = 1.1;
    
    // Calculate new scale
    let newScale = scale;
    if (delta < 0) {
      newScale = scale * zoomFactor;
    } else {
      newScale = scale / zoomFactor;
    }
    
    // Clamp scale
    const minScale = 0.1;
    const maxScale = 10;
    newScale = Math.min(Math.max(newScale, minScale), maxScale);
    
    // Calculate the point under the mouse in layer coordinates before zoom
    const mouseX = pointerStage.x;
    const mouseY = pointerStage.y;
    
    // Current position in layer coords
    const layerX = (mouseX - position.x) / scale;
    const layerY = (mouseY - position.y) / scale;
    
    // New position in layer coords should stay the same
    // So we need to adjust stage position accordingly
    const newX = mouseX - layerX * newScale;
    const newY = mouseY - layerY * newScale;
    
    setScale(newScale);
    setPosition({ x: newX, y: newY });
  }, [scale, position]);

  useEffect(() => {
    onPointsChange(initialPoints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — seeds App state with initial points

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
    <Stage
      ref={stageRef}
      width={stageWidth}
      height={stageHeight}
      onMouseDown={(e) => {
        handleStageMouseDown(e);
        if (!isDraggingPoint && !isPanning) {
          handleClick(e);
        }
      }}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onMouseLeave={handleStageMouseUp}
      onWheel={handleWheel}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <Layer>
        {/* Grid lines */}
        {gridVisible && (() => {
          const lines = [];
          const bounds = getCanvasBounds();
          const step = gridSize; // gridSize in layer units
          const startX = Math.floor(bounds.left / step) * step;
          const startY = Math.floor(bounds.top / step) * step;
          let key = 0;
          for (let x = startX; x <= bounds.right; x += step) {
            const sp1 = getStagePos({ x, y: bounds.top });
            const sp2 = getStagePos({ x, y: bounds.bottom });
            lines.push(
              <Line key={`gv-${key++}`} data-testid="konva-grid-line" points={[sp1.x, sp1.y, sp2.x, sp2.y]} stroke="#ddd" strokeWidth={0.5} />
            );
          }
          for (let y = startY; y <= bounds.bottom; y += step) {
            const sp1 = getStagePos({ x: bounds.left, y });
            const sp2 = getStagePos({ x: bounds.right, y });
            lines.push(
              <Line key={`gh-${key++}`} data-testid="konva-grid-line" points={[sp1.x, sp1.y, sp2.x, sp2.y]} stroke="#ddd" strokeWidth={0.5} />
            );
          }
          return lines;
        })()}
        {/* Origin marker at (0,0) */}
        {(() => {
          const o = getStagePos({ x: 0, y: 0 });
          return <Circle data-testid="origin-marker" x={o.x} y={o.y} radius={4} fill="#aaa" listening={false} />;
        })()}

        {/* While drawing: open polyline (no entrance) */}
        {!finished && points.length > 0 && (
          <Line
            points={points.flatMap(p => {
              const sp = getStagePos(p);
              return [sp.x, sp.y];
            })}
            stroke="brown"
            strokeWidth={lineWidth}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Finished: draw each edge individually to support entrance gap */}
        {finished && points.length >= 3 && points.map((_, i) => {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          const sp1 = getStagePos(p1);
          const sp2 = getStagePos(p2);
          const isEntranceEdge = entrance && entrance.edgeIndex === i;
          const isHoveredInEntranceMode = entranceMode && hoverSegmentIndex === i;
          const edgeStroke = isHoveredInEntranceMode ? '#FF8C00' : 'brown';

          if (isEntranceEdge) {
            const edgeLenM = getEdgeLengthMeters(p1, p2, baseScale);
            const { t1, t2 } = entranceToT(entrance.position, entrance.width, edgeLenM);
            const { gapStart, gapEnd } = getEntranceGapPoints(p1, p2, t1, t2);
            const sgStart = getStagePos(gapStart);
            const sgEnd   = getStagePos(gapEnd);
            return (
              <React.Fragment key={`edge-${i}`}>
                {t1 > 0 && (
                  <Line points={[sp1.x, sp1.y, sgStart.x, sgStart.y]}
                    stroke={edgeStroke} strokeWidth={lineWidth} lineCap="round" />
                )}
                {t2 < 1 && (
                  <Line points={[sgEnd.x, sgEnd.y, sp2.x, sp2.y]}
                    stroke={edgeStroke} strokeWidth={lineWidth} lineCap="round" />
                )}
              </React.Fragment>
            );
          }

          return (
            <Line key={`edge-${i}`}
              points={[sp1.x, sp1.y, sp2.x, sp2.y]}
              stroke={edgeStroke} strokeWidth={lineWidth} lineCap="round" lineJoin="round" />
          );
        })}
        
        {/* Preview line from last point to mouse (dashed blue when valid, red when invalid) */}
        {!finished && points.length > 0 && (
          <Line
            points={[
              getStagePos(points[points.length - 1]).x,
              getStagePos(points[points.length - 1]).y,
              tooltipPos.x,
              tooltipPos.y
            ]}
            stroke={invalidPreview ? "red" : "blue"}
            strokeWidth={1}
            dash={[5, 5]}
          />
        )}
        
        {/* Draw points as red circles */}
        {points.map((p, idx) => {
          const stagePos = getStagePos(p);
          return (
            <Circle
              key={idx}
              x={stagePos.x}
              y={stagePos.y}
              radius={pointRadius}
              fill="red"
              stroke="black"
              strokeWidth={1}
              draggable={!finished || terrainEditMode}
              onDragStart={() => {
                setIsDraggingPoint(true);
                setDraggingVertexIndex(idx);
                draggedPointIndexRef.current = idx;
              }}
              onDragMove={(e) => {
                const lx = (e.target.x() - position.x) / scale;
                const ly = (e.target.y() - position.y) / scale;
                const newPoints = [...points];
                newPoints[idx] = { x: lx, y: ly };
                setPoints(newPoints);
              }}
              onDragEnd={(e) => {
                setIsDraggingPoint(false);
                setDraggingVertexIndex(-1);
                handlePointDragEnd(e, idx);
                draggedPointIndexRef.current = -1;
              }}
              onMouseEnter={() => {
                document.body.style.cursor = 'pointer';
              }}
              onMouseLeave={() => {
                document.body.style.cursor = 'default';
              }}
            />
          );
        })}
        
        {/* Edge length labels while dragging a vertex */}
        {draggingVertexIndex >= 0 && points.length >= 2 && (() => {
          const n = points.length;
          const labels = [];
          // Build list of adjacent edge indices
          const edgeIndices = [];
          if (finished && n >= 3) {
            // Two edges touch vertex: (prev→vertex) and (vertex→next)
            edgeIndices.push((draggingVertexIndex - 1 + n) % n); // edge ending at vertex
            edgeIndices.push(draggingVertexIndex);                // edge starting at vertex
          } else {
            // Open polyline: edges touching this vertex index
            if (draggingVertexIndex > 0) edgeIndices.push(draggingVertexIndex - 1);
            if (draggingVertexIndex < n - 1) edgeIndices.push(draggingVertexIndex);
          }
          edgeIndices.forEach(i => {
            const p1 = points[i];
            const p2 = points[(i + 1) % (finished ? n : n)];
            if (!p1 || !p2) return;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lenPx = Math.sqrt(dx * dx + dy * dy);
            const lenM = lenPx / baseScale;
            const midL = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            const midS = getStagePos(midL);
            const nx = lenPx > 0 ? -dy / lenPx : 0;
            const ny = lenPx > 0 ?  dx / lenPx : -1;
            labels.push(
              <Label key={`vdrag-label-${i}`}
                x={midS.x + nx * 16}
                y={midS.y + ny * 16}
                offsetX={28} offsetY={10}
                listening={false}
              >
                <Tag fill="rgba(0,0,0,0.65)" cornerRadius={3} />
                <Text
                  text={`${lenM.toFixed(2)} m`}
                  fontSize={12}
                  fill="white"
                  fontStyle="bold"
                  padding={3}
                />
              </Label>
            );
          });
          return labels;
        })()}

        {/* Vertex position label while dragging */}
        {draggingVertexIndex >= 0 && points.length > 0 && (() => {
          const vertex = points[draggingVertexIndex];
          if (!vertex) return null;
          const stagePos = getStagePos(vertex);
          const xM = vertex.x / baseScale;
          const yM = vertex.y / baseScale;
          return (
            <Label key="vertex-pos-label"
              x={stagePos.x + 12}
              y={stagePos.y - 12}
              offsetX={38} offsetY={10}
              listening={false}
            >
              <Tag fill="rgba(0,100,200,0.8)" cornerRadius={3} />
              <Text
                text={`x: ${xM.toFixed(1)}m  y: ${yM.toFixed(1)}m`}
                fontSize={11}
                fill="white"
                fontStyle="bold"
                padding={3}
              />
            </Label>
          );
        })()}

        {/* Entrance handles (visible when entranceMode is on and entrance exists) */}
        {finished && entrance && entranceMode && points.length > entrance.edgeIndex && (() => {
          const p1 = points[entrance.edgeIndex];
          const p2 = points[(entrance.edgeIndex + 1) % points.length];
          const edgeLenM = getEdgeLengthMeters(p1, p2, baseScale);
          const { t1, t2 } = entranceToT(entrance.position, entrance.width, edgeLenM);
          const { gapStart, gapEnd, center } = getEntranceGapPoints(p1, p2, t1, t2);
          const sCtr   = getStagePos(center);
          const sStart = getStagePos(gapStart);
          const sEnd   = getStagePos(gapEnd);
          const sP1    = getStagePos(p1);
          const sP2    = getStagePos(p2);

          // Perpendicular unit vector (outward from edge, rotated 90° CCW)
          const edgeDxL = p2.x - p1.x;
          const edgeDyL = p2.y - p1.y;
          const edgeLenPx = Math.sqrt(edgeDxL * edgeDxL + edgeDyL * edgeDyL);
          const normalX = edgeLenPx > 0 ? -edgeDyL / edgeLenPx : 0;
          const normalY = edgeLenPx > 0 ?  edgeDxL / edgeLenPx : 1;
          const labelOffset = 16; // stage pixels away from the edge

          // Side distances
          const distLeftM  = t1 * edgeLenM;
          const distRightM = (1 - t2) * edgeLenM;

          // Label positions: midpoint of each remaining segment, offset outward
          const leftMidStage  = getStagePos({ x: (p1.x + gapStart.x) / 2,  y: (p1.y + gapStart.y) / 2 });
          const rightMidStage = getStagePos({ x: (gapEnd.x + p2.x) / 2,    y: (gapEnd.y + p2.y) / 2 });

          const toLayer = (sx, sy) => ({ x: (sx - position.x) / scale, y: (sy - position.y) / scale });

          // --- Handlers using entranceRef to avoid stale closure ---
          const handleCenterDrag = (e) => {
            const cur = entranceRef.current;
            if (!cur) return;
            const { x: lx, y: ly } = toLayer(e.target.x(), e.target.y());
            const t = projectPointOnEdge(lx, ly, p1, p2);
            const newPos = clampEntrancePosition(t, cur.width, edgeLenM);
            const cx = p1.x + newPos * (p2.x - p1.x);
            const cy = p1.y + newPos * (p2.y - p1.y);
            e.target.position(getStagePos({ x: cx, y: cy }));
            onEntranceChange?.({ ...cur, position: newPos });
          };

          const handleEndDrag = (e, side) => {
            const cur = entranceRef.current;
            if (!cur) return;
            const { x: lx, y: ly } = toLayer(e.target.x(), e.target.y());
            const t = projectPointOnEdge(lx, ly, p1, p2);
            const halfWidthM = Math.abs(t - cur.position) * edgeLenM;
            const newWidth = Math.max(0.5, halfWidthM * 2);
            const newPos = clampEntrancePosition(cur.position, newWidth, edgeLenM);
            const { t1: nt1, t2: nt2 } = entranceToT(newPos, newWidth, edgeLenM);
            const handleT = side === 'start' ? nt1 : nt2;
            const hx = p1.x + handleT * (p2.x - p1.x);
            const hy = p1.y + handleT * (p2.y - p1.y);
            e.target.position(getStagePos({ x: hx, y: hy }));
            onEntranceChange?.({ ...cur, position: newPos, width: newWidth });
          };

          return [
            // Center handle: move position along edge
            <Circle key="entrance-center"
              data-testid="entrance-center-handle"
              x={sCtr.x} y={sCtr.y}
              radius={8} fill="#FF8C00" stroke="white" strokeWidth={2}
              draggable
              onDragMove={handleCenterDrag}
              onMouseEnter={() => { document.body.style.cursor = 'ew-resize'; }}
              onMouseLeave={() => { document.body.style.cursor = 'default'; }}
            />,
            // Start handle: adjust width
            <Circle key="entrance-start"
              data-testid="entrance-start-handle"
              x={sStart.x} y={sStart.y}
              radius={5} fill="white" stroke="#FF8C00" strokeWidth={2}
              draggable
              onDragMove={(e) => handleEndDrag(e, 'start')}
              onMouseEnter={() => { document.body.style.cursor = 'ew-resize'; }}
              onMouseLeave={() => { document.body.style.cursor = 'default'; }}
            />,
            // End handle: adjust width
            <Circle key="entrance-end"
              data-testid="entrance-end-handle"
              x={sEnd.x} y={sEnd.y}
              radius={5} fill="white" stroke="#FF8C00" strokeWidth={2}
              draggable
              onDragMove={(e) => handleEndDrag(e, 'end')}
              onMouseEnter={() => { document.body.style.cursor = 'ew-resize'; }}
              onMouseLeave={() => { document.body.style.cursor = 'default'; }}
            />,
            // Entrance width label (above center handle)
            <Text key="entrance-label"
              data-testid="entrance-label"
              x={sCtr.x + normalX * labelOffset} y={sCtr.y + normalY * labelOffset}
              text={`↔ ${entrance.width.toFixed(2)}m`}
              fontSize={11} fill="#FF8C00" fontStyle="bold"
              offsetX={22} offsetY={5}
              listening={false}
            />,
            // Left side distance label (between edge start and gap start)
            distLeftM > 0.05 && (
              <Text key="entrance-dist-left"
                data-testid="entrance-dist-left"
                x={leftMidStage.x + normalX * labelOffset} y={leftMidStage.y + normalY * labelOffset}
                text={`${distLeftM.toFixed(2)}m`}
                fontSize={10} fill="#555"
                offsetX={18} offsetY={5}
                listening={false}
              />
            ),
            // Right side distance label (between gap end and edge end)
            distRightM > 0.05 && (
              <Text key="entrance-dist-right"
                data-testid="entrance-dist-right"
                x={rightMidStage.x + normalX * labelOffset} y={rightMidStage.y + normalY * labelOffset}
                text={`${distRightM.toFixed(2)}m`}
                fontSize={10} fill="#555"
                offsetX={18} offsetY={5}
                listening={false}
              />
            ),
          ].filter(Boolean);
        })()}

        {/* Entrance indicator (always visible when entrance is set) */}
        {finished && entrance && !entranceMode && points.length > entrance.edgeIndex && (() => {
          const p1 = points[entrance.edgeIndex];
          const p2 = points[(entrance.edgeIndex + 1) % points.length];
          const edgeLenM = getEdgeLengthMeters(p1, p2, baseScale);
          const { t1, t2 } = entranceToT(entrance.position, entrance.width, edgeLenM);
          const { center } = getEntranceGapPoints(p1, p2, t1, t2);
          const sCtr = getStagePos(center);
          return (
            <Text key="entrance-indicator"
              x={sCtr.x} y={sCtr.y - 14}
              text="E"
              fontSize={12} fill="#FF8C00" fontStyle="bold"
              offsetX={4}
              listening={false}
            />
          );
        })()}

        {/* Tooltip */}
        {tooltipText && (
          <Label
            x={tooltipPos.x}
            y={tooltipPos.y - 25}
          >
            <Tag
              fill="white"
              cornerRadius={3}
              stroke="black"
              strokeWidth={0.5}
              pointerDirection="down"
              pointerWidth={10}
              pointerHeight={10}
            />
            <Text
              text={tooltipText}
              fill="black"
              fontSize={12}
              padding={3}
            />
          </Label>
        )}
      </Layer>
      <PlacedElementsLayer
        elements={placedElements}
        scale={scale}
        position={position}
        baseScale={baseScale}
        terrainPoints={points}
        snapToGridEnabled={snapToGridEnabled}
        violatingIds={violatingIds}
        customDefinitions={customDefinitions}
        onSelectElement={onSelectElement}
        onMoveElement={onMoveElement}
        onResizeElement={onResizeElement}
        onRotateElement={onRotateElement}
      />
      {measurementConfig && (
        <MeasurementOverlay
          activeTool={measurementConfig.activeTool}
          activeMeasurements={measurementConfig.activeMeasurements}
          constraints={measurementConfig.constraints}
          validationResults={[]}
          selectedElementId={selectedElementId}
          elements={placedElements}
          terrainPoints={points}
          scale={scale}
          position={position}
          baseScale={baseScale}
          width={stageWidth}
          height={stageHeight}
          showMeasurements={measurementConfig.showMeasurements}
          showConstraints={measurementConfig.showConstraints}
          onAddMeasurement={onAddMeasurement}
          onCancel={() => onSetActiveTool?.('none')}
        />
      )}
      {solarVisible && solarConfig && solarConfig.displayOptions.showShadows && (
        <ShadowLayer
          elements={placedElements}
          solarConfig={solarConfig}
          scale={scale}
          position={position}
          baseScale={baseScale}
        />
      )}
      {solarVisible && solarConfig && solarConfig.displayOptions.showSolarPath && (
        <SolarPathLayer
          solarConfig={solarConfig}
          width={stageWidth}
          height={stageHeight}
          scale={scale}
          position={position}
          baseScale={baseScale}
          terrainPoints={points}
        />
      )}
      {solarVisible && solarConfig && solarConfig.displayOptions.showCardinals && (
        <CardinalLayer
          width={stageWidth}
          height={stageHeight}
          northAtTop={solarConfig.displayOptions.northAtTop}
        />
      )}
    </Stage>
    </div>
  );
};

export default TerrainCanvas;
