import React, { useState } from 'react';
import { Layer, Rect, Circle, Text, Group, Line } from 'react-konva';
import { getElementDefinition, getPolyBbox } from '../data/elementDefinitions.js';
import { calculateRectResize, calculateCircleResize, calculateRotation, rotatePoint } from '../utils/elementUtils.js';
import { isRectangleInPolygon, isCircleInPolygon, isPolygonElementInPolygon, snapToGrid } from '../utils/collisionUtils.js';

const SELECTION_STROKE = '#0099FF';
const SELECTION_STROKE_WIDTH = 3;

const VIOLATION_STROKE = '#F44336';

const PlacedElementsLayer = ({
  elements = [],
  scale = 1,
  position = { x: 0, y: 0 },
  baseScale = 10,
  terrainPoints = [],
  snapToGridEnabled = false,
  violatingIds = null,
  customDefinitions = [],
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onRotateElement,
}) => {
  const [hoveredElementId, setHoveredElementId] = useState(null);
  // Live rotation state: tracks angle while rotation handle is being dragged
  const [draggingRot, setDraggingRot] = useState(null); // { id, angle }
  // Live resize state: tracks updated dimensions while resize handle is being dragged
  const [draggingResize, setDraggingResize] = useState(null); // { id, updates }
  const findDef = (id) => getElementDefinition(id) ?? customDefinitions.find(d => d.id === id);

  // Convert meters to stage pixels
  const toStage = (meters) => meters * baseScale * scale;
  const stageX = (mx) => mx * baseScale * scale + position.x;
  const stageY = (my) => my * baseScale * scale + position.y;

  return (
    <Layer>
      {elements.map((el) => {
        const def = findDef(el.definitionId);
        const shape = el.shape || def?.shape || 'rectangle';
        const fill = el.color || def?.color || '#ccc';
        const isViolating = violatingIds && (violatingIds instanceof Set ? violatingIds.has(el.id) : violatingIds.includes(el.id));
        const stroke = isViolating ? VIOLATION_STROKE : (el.isSelected ? SELECTION_STROKE : (el.borderColor || def?.borderColor || '#000'));
        const strokeWidth = el.isSelected ? SELECTION_STROKE_WIDTH : (el.borderWidth || def?.borderWidth || 1);
        const sx = stageX(el.x);
        const sy = stageY(el.y);
        const w = toStage(el.width);
        const h = toStage(el.height);
        const r = toStage(el.radius || 0);

        const handleClick = () => onSelectElement?.(el.id);
        const handleDragEnd = (e) => {
          if (!onMoveElement) return;
          const bs = baseScale * scale;
          const rawX = (e.target.x() - position.x) / bs;
          const rawY = (e.target.y() - position.y) / bs;

          const newX = snapToGridEnabled ? snapToGrid(rawX, 1) : rawX;
          const newY = snapToGridEnabled ? snapToGrid(rawY, 1) : rawY;

          // Collision check: element must stay within terrain polygon
          if (terrainPoints.length >= 3) {
            let inside;
            if (shape === 'circle') {
              inside = isCircleInPolygon({ x: newX, y: newY, radius: el.radius || el.width / 2 }, terrainPoints, baseScale);
            } else if (shape === 'polygon') {
              const defPoints = def?.points || [];
              inside = isPolygonElementInPolygon(defPoints, newX, newY, rot, terrainPoints, baseScale);
            } else {
              inside = isRectangleInPolygon({ x: newX - el.width / 2, y: newY - el.height / 2, width: el.width, height: el.height }, terrainPoints, baseScale);
            }
            if (!inside) {
              e.target.position({ x: sx, y: sy });
              return;
            }
          }

          onMoveElement(el.id, newX, newY);
        };

        const HANDLE_R = 6;
        // Use live resize values during drag, committed values otherwise
        const liveResize = draggingResize?.id === el.id ? draggingResize.updates : null;
        const liveEl = liveResize ? { ...el, ...liveResize } : el;
        const effectiveR = toStage(liveEl.radius || liveEl.width / 2);
        const liveW = toStage(liveEl.width);
        const liveH = toStage(liveEl.height);
        const liveSx = stageX(liveEl.x);
        const liveSy = stageY(liveEl.y);
        // Use live rotation during drag, committed rotation otherwise
        const rot = (draggingRot?.id === el.id ? draggingRot.angle : el.rotation) || 0;

        // Helper: rotate a stage point around live element center
        const rp = (px, py) => rot !== 0 ? rotatePoint(px, py, liveSx, liveSy, rot) : { x: px, y: py };

        // For polygon shapes: get the bounding box from definition points
        const polyDefPoints = shape === 'polygon' ? (def?.points || []) : null;
        const polyBbox = polyDefPoints && polyDefPoints.length > 0 ? getPolyBbox(polyDefPoints) : null;
        // Polygon bbox top (in stage pixels, relative to center, before rotation)
        const polyTopY = polyBbox ? toStage(polyBbox.minY) : 0;

        // Resize handle positions — use live dimensions, rotated to match element orientation
        const resizeHandles = el.isSelected
          ? (shape === 'circle'
            ? [{ key: 'r', ...rp(liveSx + effectiveR, liveSy) }]
            : shape === 'polygon'
            ? []
            : [
                { key: 'tl', ...rp(liveSx - liveW / 2, liveSy - liveH / 2) },
                { key: 'tr', ...rp(liveSx + liveW / 2, liveSy - liveH / 2) },
                { key: 'br', ...rp(liveSx + liveW / 2, liveSy + liveH / 2) },
                { key: 'bl', ...rp(liveSx - liveW / 2, liveSy + liveH / 2) },
              ])
          : [];

        // Rotation handle: above the live element center (in rotated frame)
        const rotHandleUnrotated = {
          x: liveSx,
          y: shape === 'circle' ? liveSy - effectiveR - 20
           : shape === 'polygon' ? liveSy + polyTopY - 20
           : liveSy - liveH / 2 - 20,
        };
        const rotHandlePos = rp(rotHandleUnrotated.x, rotHandleUnrotated.y);

        const isHovered = hoveredElementId === el.id;
        const hoverHandlers = {
          onMouseEnter: () => setHoveredElementId(el.id),
          onMouseLeave: () => setHoveredElementId(null),
        };

        // Dimension labels shown on hover OR during resize
        const isResizing = draggingResize?.id === el.id;
        let dimensionLabels = null;
        if (isHovered || isResizing) {
          if (shape === 'circle') {
            dimensionLabels = (
              <Text
                data-testid="dimension-label"
                x={liveSx} y={liveSy - effectiveR - 16}
                text={`Ø ${(liveEl.radius || liveEl.width / 2).toFixed(2)}m`}
                fontSize={11} fill="#1565c0"
                offsetX={30}
                listening={false}
              />
            );
          } else if (shape === 'polygon' && polyDefPoints) {
            dimensionLabels = polyDefPoints.map((pt, i) => {
              const next = polyDefPoints[(i + 1) % polyDefPoints.length];
              const dx = next.x - pt.x, dy = next.y - pt.y;
              const lenM = Math.sqrt(dx * dx + dy * dy);
              const midLocalX = (pt.x + next.x) / 2 * toStage(1);
              const midLocalY = (pt.y + next.y) / 2 * toStage(1);
              const edgeLen = Math.sqrt(dx * dx + dy * dy);
              const nx = edgeLen > 0 ? -dy / edgeLen : 0;
              const ny = edgeLen > 0 ?  dx / edgeLen : -1;
              const offsetPx = 12;
              const midStage = rp(liveSx + midLocalX + nx * offsetPx, liveSy + midLocalY + ny * offsetPx);
              return (
                <Text
                  key={`dim-${i}`}
                  data-testid="dimension-label"
                  x={midStage.x} y={midStage.y}
                  text={`${lenM.toFixed(1)}m`}
                  fontSize={10} fill="#1565c0"
                  offsetX={14} offsetY={5}
                  listening={false}
                />
              );
            });
          } else {
            dimensionLabels = (
              <>
                <Text
                  data-testid="dimension-label"
                  {...rp(liveSx, liveSy - liveH / 2 - 14)}
                  text={`${liveEl.width.toFixed(2)}m`}
                  fontSize={11} fill="#1565c0"
                  rotation={rot}
                  offsetX={(liveEl.width.toFixed(2).length * 3.5)}
                  listening={false}
                />
                <Text
                  data-testid="dimension-label"
                  {...rp(liveSx + liveW / 2 + 4, liveSy)}
                  text={`${liveEl.height.toFixed(2)}m`}
                  fontSize={11} fill="#1565c0"
                  rotation={rot}
                  offsetY={5}
                  listening={false}
                />
              </>
            );
          }
        }

        // Label position: below the live bounding box bottom
        const labelY = shape === 'polygon' && polyBbox
          ? liveSy + toStage(polyBbox.maxY) + 4
          : shape === 'circle'
          ? liveSy + effectiveR + 4
          : liveSy + liveH / 2 + 4;
        const labelX = shape === 'polygon' && polyBbox
          ? liveSx + toStage(polyBbox.minX)
          : shape === 'circle'
          ? liveSx - effectiveR
          : liveSx - liveW / 2;

        return (
          <Group key={el.id} data-testid="konva-group">
            {shape === 'circle' ? (
              <Circle
                x={liveSx} y={liveSy}
                radius={effectiveR}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                draggable
                onClick={handleClick}
                onDragEnd={handleDragEnd}
                rotation={el.rotation || 0}
                {...hoverHandlers}
              />
            ) : shape === 'polygon' ? (
              <Line
                x={liveSx} y={liveSy}
                points={(def?.points || []).flatMap(pt => [
                  pt.x * toStage(1),
                  pt.y * toStage(1),
                ])}
                closed
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                rotation={rot}
                draggable
                onClick={handleClick}
                onDragEnd={handleDragEnd}
                {...hoverHandlers}
              />
            ) : (
              <Rect
                x={liveSx} y={liveSy}
                offsetX={liveW / 2} offsetY={liveH / 2}
                width={liveW} height={liveH}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                draggable
                onClick={handleClick}
                onDragEnd={handleDragEnd}
                rotation={el.rotation || 0}
                {...hoverHandlers}
              />
            )}
            {dimensionLabels}
            <Text
              x={labelX} y={labelY}
              text={el.label || def?.name || ''}
              fontSize={12}
              fill="#333"
              listening={false}
            />
            {/* Resize handles */}
            {resizeHandles.map(handle => (
              <Circle
                key={handle.key}
                data-testid="resize-handle"
                x={handle.x} y={handle.y}
                radius={HANDLE_R}
                fill="white"
                stroke="#0099FF"
                strokeWidth={2}
                draggable
                onDragMove={(e) => {
                  const updates = shape === 'circle'
                    ? calculateCircleResize(e.target.x(), e.target.y(), el, scale, position, baseScale)
                    : calculateRectResize(handle.key, e.target.x(), e.target.y(), el, scale, position, baseScale);
                  setDraggingResize({ id: el.id, updates });
                }}
                onDragEnd={(e) => {
                  if (!onResizeElement) return;
                  const updates = shape === 'circle'
                    ? calculateCircleResize(e.target.x(), e.target.y(), el, scale, position, baseScale)
                    : calculateRectResize(handle.key, e.target.x(), e.target.y(), el, scale, position, baseScale);
                  onResizeElement(el.id, updates);
                  setDraggingResize(null);
                }}
              />
            ))}
            {/* Rotation handle + angle indicator */}
            {el.isSelected && (() => {
              const isRotating = draggingRot?.id === el.id;
              // Vertical reference line (upward from center, fixed, dashed)
              const refLen = (shape === 'circle' ? effectiveR : shape === 'polygon' ? Math.abs(polyTopY) : h / 2) + 30;
              // Angle label position: beside the rotation handle
              const angleDeg = Math.round(rot);
              const angleText = `${angleDeg}°`;
              return (
                <>
                  {/* Dashed vertical reference line */}
                  <Line
                    points={[liveSx, liveSy, liveSx, liveSy - refLen]}
                    stroke="#aaa"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                  {/* Arc showing rotation amount */}
                  {rot !== 0 && (
                    <Text
                      x={liveSx + 6} y={liveSy - refLen / 2}
                      text={angleText}
                      fontSize={11}
                      fill={isRotating ? '#e65100' : '#555'}
                      listening={false}
                    />
                  )}
                  <Circle
                    data-testid="rotation-handle"
                    x={rotHandlePos.x} y={rotHandlePos.y}
                    radius={HANDLE_R}
                    fill={isRotating ? '#FF8C00' : '#FFD700'}
                    stroke="#FFA500"
                    strokeWidth={2}
                    draggable
                    onDragMove={(e) => {
                      const angle = calculateRotation(e.target.x(), e.target.y(), liveSx, liveSy);
                      setDraggingRot({ id: el.id, angle });
                    }}
                    onDragEnd={(e) => {
                      if (!onRotateElement) return;
                      const angle = calculateRotation(e.target.x(), e.target.y(), liveSx, liveSy);
                      onRotateElement(el.id, angle);
                      setDraggingRot(null);
                    }}
                  />
                  {/* Angle label next to handle during drag */}
                  {isRotating && (
                    <Text
                      x={rotHandlePos.x + 10} y={rotHandlePos.y - 8}
                      text={angleText}
                      fontSize={12}
                      fill="#e65100"
                      listening={false}
                    />
                  )}
                </>
              );
            })()}
          </Group>
        );
      })}
    </Layer>
  );
};

export default PlacedElementsLayer;
