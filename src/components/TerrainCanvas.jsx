import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Label } from 'react-konva';

const TerrainCanvas = ({ onPointsChange, container }) => {
  const stageRef = useRef(null);
  const [points, setPoints] = useState([]); // array of {x, y} in layer coordinates (bottom-left origin)
  const [finished, setFinished] = useState(false); // whether polygon is finished (>=3 points and Enter pressed)
  const [hoverSegmentIndex, setHoverSegmentIndex] = useState(-1); // index of segment being hovered
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState('');
  const [scale, setScale] = useState(1); // stage scale (layer to stage)
  const [position, setPosition] = useState({ x: 0, y: 0 }); // stage position (top-left) in stage coordinates

  const baseScale = 10; // 10px = 1m (layer pixel to meter)
  const precision = 1; // decimal precision
  const pointRadius = 5;
  const lineWidth = 2;
  const dragTolerance = 2; // pixels for point movement

  // Get stage dimensions
  const stageWidth = container ? container.clientWidth : 800;
  const stageHeight = container ? container.clientHeight : 600;

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

  // Check if adding a new point would cause self-intersection (excluding the last segment)
  const wouldCauseSelfIntersection = useCallback((newPoint) => {
    if (points.length < 2) return false;
    const newSegment = {
      p1: points[points.length - 1],
      p2: newPoint
    };
    // Check against all existing segments except the last one (which shares p1)
    for (let i = 0; i < points.length - 1; i++) {
      const seg = {
        p1: points[i],
        p2: points[i + 1]
      };
      if (segmentsIntersect(newSegment, seg)) {
        return true;
      }
    }
    return false;
  }, [points]);

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

  // Handle click to add point
  const handleClick = useCallback((e) => {
    if (finished) return; // do not add points after finishing
    
    const pos = getLayerPos(e.evt);
    if (!pos) return;
    
    // Validate point is within canvas bounds
    if (!isPointInCanvas(pos)) return;
    
    // Check if clicking on an existing point (for potential future drag)
    const hitPointIndex = findPointAtPosition(pos);
    
    if (hitPointIndex >= 0) {
      // Clicked on existing point - let drag handler deal with it
      return;
    }
    
    // Check self-intersection before adding
    if (!wouldCauseSelfIntersection(pos)) {
      const newPoints = [...points, pos];
      setPoints(newPoints);
      onPointsChange(newPoints);
    }
  }, [finished, getLayerPos, isPointInCanvas, findPointAtPosition, wouldCauseSelfIntersection, points, onPointsChange]);

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
    
    if (hitPointIndex >= 0 && !finished) {
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

    // Find which segment is being hovered for tooltip
    if (!finished && points.length >= 1) {
      let found = -1;
      const threshold = 5; // pixels in layer coordinates
      
      // Check all segments (including the preview segment from last point to cursor)
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = distanceFromPointToSegment(pos, p1, p2);
        if (dist < threshold) {
          found = i;
          break;
        }
      }
      
      setHoverSegmentIndex(found);
      
      if (found >= 0) {
        const p1 = points[found];
        const p2 = points[found + 1];
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
        // Check preview segment (last point to cursor)
        if (points.length >= 1) {
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
          } else {
            setHoverSegmentIndex(-1);
            setTooltipText('');
          }
        } else {
          setHoverSegmentIndex(-1);
          setTooltipText('');
        }
      }
    } else {
      setHoverSegmentIndex(-1);
      setTooltipText('');
    }
  }, [isDraggingPoint, isPanning, lastPanPos, points, getLayerPos, getStagePos, scale, finished]);

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
    }
  }, [position, scale, isPointInCanvas, onPointsChange, points]);

  const handleKeyDown = useCallback((e) => {
    const key = e.evt.key;
    if (key === 'Enter') {
      if (points.length >= 3) {
        setFinished(true);
        onPointsChange([...points]);
      }
    } else if (key === 'Escape') {
      setPoints([]);
      setFinished(false);
      onPointsChange([]);
    } else if (key === 'Backspace' || key === 'Delete') {
      if (!finished && points.length > 0) {
        const newPoints = points.slice(0, -1);
        setPoints(newPoints);
        onPointsChange(newPoints);
      }
    }
  }, [points, finished, onPointsChange]);

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
    onPointsChange([]);
  }, [onPointsChange]);

  return (
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
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <Layer>
        {/* Draw the polygon lines (finished or in progress) */}
        {points.length > 0 && (
          <Line
            points={points.flatMap(p => {
              const stagePos = getStagePos(p);
              return [stagePos.x, stagePos.y];
            })}
            stroke="brown"
            strokeWidth={lineWidth}
            lineJoin="round"
            lineCap="round"
          />
        )}
        
        {/* Draw closing line if finished and at least 3 points */}
        {finished && points.length >= 3 && (
          <Line
            points={[
              getStagePos(points[points.length - 1]).x,
              getStagePos(points[points.length - 1]).y,
              getStagePos(points[0]).x,
              getStagePos(points[0]).y
            ]}
            stroke="brown"
            strokeWidth={lineWidth}
            lineJoin="round"
            lineCap="round"
          />
        )}
        
        {/* Preview line from last point to mouse (dashed blue) */}
        {!finished && points.length > 0 && (
          <Line
            points={[
              getStagePos(points[points.length - 1]).x,
              getStagePos(points[points.length - 1]).y,
              tooltipPos.x,
              tooltipPos.y
            ]}
            stroke="blue"
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
              draggable={!finished}
              onDragStart={() => {
                setIsDraggingPoint(true);
                draggedPointIndexRef.current = idx;
              }}
              onDragEnd={(e) => {
                setIsDraggingPoint(false);
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
        
        {/* Tooltip */}
        {tooltipText && (
          <Label
            x={tooltipPos.x}
            y={tooltipPos.y - 25}
            pointerDirection="down"
            pointerWidth={10}
            pointerHeight={10}
          >
            <Label.Tag
              fill="white"
              cornerRadius={3}
              stroke="black"
              strokeWidth={0.5}
            />
            <Label.Text 
              text={tooltipText} 
              fill="black" 
              fontSize={12}
              padding={3}
            />
          </Label>
        )}
      </Layer>
    </Stage>
  );
};

export default TerrainCanvas;
