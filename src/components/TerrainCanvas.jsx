import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Label } from 'react-konva';

const TerrainCanvas = ({ onPointsChange }) => {
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

  // Convert stage pointer position to layer coordinates
  const getLayerPos = (evt) => {
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
  };

  // Convert layer coordinates to stage coordinates (for drawing)
  const getStagePos = (layerPoint) => {
    const { x: tx, y: ty } = position;
    const s = scale;
    return {
      x: s * layerPoint.x + tx,
      y: s * layerPoint.y + ty
    };
  };

  // Check if adding a new point would cause self-intersection (excluding the last segment)
  const wouldCauseSelfIntersection = (newPoint) => {
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
    // Also check if the new segment intersects the closing segment (if we were to close the polygon)
    // For simplicity, we skip this for now.
    return false;
  };

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

    const handleClick = (e) => {
    if (finished) return; // do not add points after finishing
    const pos = getLayerPos(e.evt);
    if (!pos) return;
    // Check if clicking on an existing point to move it (within 2px tolerance) - we'll implement later if needed
    // For now just add point if not causing self-intersection
    if (!wouldCauseSelfIntersection(pos)) {
      const newPoints = [...points, pos];
      setPoints(newPoints);
      onPointsChange(newPoints);
    }
  }

  const handleKeyDown = (e) => {
    const key = e.evt.key;
    if (key === 'Enter') {
      if (points.length >= 3) {
        setFinished(true);
        // Keep points as is (finished polygon)
        onPointsChange([...points]);
      }
      // If less than 3 points, do nothing (keep current points)
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
  };

  const handleMouseMove = (e) => {
    const pos = getLayerPos(e.evt);
    if (!pos) return;
    // Find which segment is being hovered
    let found = -1;
    // We'll consider a segment hovered if mouse is within some tolerance (e.g., 5px) of the segment in layer coordinates
    const threshold = 5; // pixels in layer coordinates
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      // Calculate distance from pos to segment p1-p2 in layer coordinates
      const dist = distanceFromPointToSegment(pos, p1, p2);
      if (dist < threshold) {
        found = i;
        break;
      }
    }
    setHoverSegmentIndex(found);
    if (found >= 0) {
      // Calculate midpoint of segment for tooltip position in layer coordinates
      const p1 = points[found];
      const p2 = points[found + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      // Convert midpoint to stage coordinates for Konva (top-left origin)
      const stagePos = getStagePos({ x: midX, y: midY });
      setTooltipPos(stagePos);
      // Calculate segment length in meters
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      // distance in layer pixels
      const lengthPx = Math.sqrt(dx * dx + dy * dy);
      // convert to meters: divide by baseScale (10px per meter)
      const lengthM = lengthPx / baseScale;
      setTooltipText(`${lengthM.toFixed(precision)} m`);
    } else {
      setHoverSegmentIndex(-1);
      setTooltipText('');
    }
  };

  // Helper: distance from point to segment (layer coordinates)
  const distanceFromPointToSegment = (p, a, b) => {
    // vector from a to b
    const ab = { x: b.x - a.x, y: b.y - a.y };
    // vector from a to p
    const ap = { x: p.x - a.x, y: p.y - a.y };
    // squared length of ab
    const ab2 = ab.x * ab.x + ab.y * ab.y;
    if (ab2 === 0) {
      // a and b are the same point
      return Math.sqrt(ap.x * ap.x + ap.y * ap.y);
    }
    // Consider the line as a parameterized segment: a + t*(ab), t in [0,1]
    // Find the projection of p onto the line, clamped to [0,1]
    const t = (ap.x * ab.x + ap.y * ab.y) / ab2;
    const clampedT = Math.max(0, Math.min(1, t));
    // closest point on the segment
    const closest = { x: a.x + clampedT * ab.x, y: a.y + clampedT * ab.y };
    // distance between p and closest
    const dx = p.x - closest.x;
    const dy = p.y - closest.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY;
    const zoomIn = delta < 0;
    const zoomFactor = 1.1;
    let newScale = scale;
    if (zoomIn) {
      newScale = scale * zoomFactor;
    } else {
      newScale = scale / zoomFactor;
    }
    // Limit scale
    const minScale = 0.1;
    const maxScale = 10;
    newScale = Math.min(Math.max(newScale, minScale), maxScale);
    setScale(newScale);
    // Optionally adjust position to zoom towards mouse pointer
    // We'll keep it simple and just scale about the center
  };

  // Panning
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState(null); // stage coordinates

  const handleStageMouseDown = (e) => {
    if (e.evt.button === 0) { // left click
      setIsPanning(true);
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
    }
  };

  const handleStageMouseMove = (e) => {
    if (!isPanning) return;
    const currentPos = { x: e.evt.clientX, y: e.evt.clientY };
    const dx = currentPos.x - lastPanPos.x;
    const dy = currentPos.y - lastPanPos.y;
    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    setLastPanPos(currentPos);
  };

  const handleStageMouseUp = (e) => {
    if (e.evt.button === 0) {
      setIsPanning(false);
    }
  };

  useEffect(() => {
    // Initial call
    onPointsChange([]);
  }, []);

  return (
    <Stage
      ref={stageRef}
      width="100%"
      height="100%"
      scale={scale}
      position={position}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onWheel={handleWheel}
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
            strokeWidth={2}
            lineJoin="round"
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
            strokeWidth={2}
            lineJoin="round"
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
              radius={5}
              fill="red"
              stroke="black"
              strokeWidth={1}
              draggable
              onDragEnd={(e) => {
                // Convert drag end position to layer coordinates
                const stage = stageRef.current;
                if (!stage) return;
                const pointerStage = stage.getPointerPosition();
                if (!pointerStage) return;
                const { x: pointerX, y: pointerY } = pointerStage;
                const { x: tx, y: ty } = position;
                const s = scale;
                const layerPos = {
                  x: (pointerX - tx) / s,
                  y: (pointerY - ty) / s
                };
                setPoints(prev => {
                  const newPoints = [...prev];
                  newPoints[idx] = layerPos;
                  // After moving, we could check for self-intersection, but we'll skip for now.
                  return newPoints;
                });
                onPointsChange([...points]); // Note: we should pass updated points
              }}
            />
          );
        })}
        {/* Tooltip */}
        {tooltipText && (
          <Label
            x={tooltipPos.x}
            y={tooltipPos.y}
            pointerDirection="down"
            pointerWidth={10}
            pointerHeight={10}
            backgroundFill="white"
            backgroundPadding={5}
          >
            <Label.Text text={tooltipText} fill="black" fontSize={12} />
          </Label>
        )}
      </Layer>
    </Stage>
  );
};

export default TerrainCanvas;