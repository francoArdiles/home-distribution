import React from 'react';
import { Layer, Rect, Circle, Text, Group } from 'react-konva';
import { getElementDefinition } from '../data/elementDefinitions.js';
import { calculateRectResize, calculateCircleResize, calculateRotation } from '../utils/elementUtils.js';
import { isRectangleInPolygon, isCircleInPolygon, snapToGrid } from '../utils/collisionUtils.js';

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
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onRotateElement,
}) => {
  // Convert meters to stage pixels
  const toStage = (meters) => meters * baseScale * scale;
  const stageX = (mx) => mx * baseScale * scale + position.x;
  const stageY = (my) => my * baseScale * scale + position.y;

  return (
    <Layer>
      {elements.map((el) => {
        const def = getElementDefinition(el.definitionId);
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
          // Rect is positioned at top-left (sx - w/2, sy - h/2); recover center
          const rawX = shape === 'circle'
            ? (e.target.x() - position.x) / bs
            : (e.target.x() + w / 2 - position.x) / bs;
          const rawY = shape === 'circle'
            ? (e.target.y() - position.y) / bs
            : (e.target.y() + h / 2 - position.y) / bs;

          const newX = snapToGridEnabled ? snapToGrid(rawX, 1) : rawX;
          const newY = snapToGridEnabled ? snapToGrid(rawY, 1) : rawY;

          // Collision check: element must stay within terrain polygon
          if (terrainPoints.length >= 3) {
            const inside = shape === 'circle'
              ? isCircleInPolygon({ x: newX, y: newY, radius: el.radius || el.width / 2 }, terrainPoints, baseScale)
              : isRectangleInPolygon({ x: newX - el.width / 2, y: newY - el.height / 2, width: el.width, height: el.height }, terrainPoints, baseScale);

            if (!inside) {
              // Reset Konva node to original position
              e.target.position({
                x: shape === 'circle' ? sx : sx - w / 2,
                y: shape === 'circle' ? sy : sy - h / 2,
              });
              return;
            }
          }

          onMoveElement(el.id, newX, newY);
        };

        const HANDLE_R = 6;
        const effectiveR = r || toStage(el.width / 2);

        // Resize handle positions (rectangle: 4 corners; circle: 1 right edge)
        const resizeHandles = el.isSelected
          ? (shape === 'circle'
            ? [{ key: 'r', x: sx + effectiveR, y: sy }]
            : [
                { key: 'tl', x: sx - w / 2, y: sy - h / 2 },
                { key: 'tr', x: sx + w / 2, y: sy - h / 2 },
                { key: 'br', x: sx + w / 2, y: sy + h / 2 },
                { key: 'bl', x: sx - w / 2, y: sy + h / 2 },
              ])
          : [];

        // Rotation handle: above the element center
        const rotHandleY = shape === 'circle' ? sy - effectiveR - 20 : sy - h / 2 - 20;

        return (
          <Group key={el.id} data-testid="konva-group">
            {shape === 'circle' ? (
              <Circle
                x={sx} y={sy}
                radius={effectiveR}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                draggable
                onClick={handleClick}
                onDragEnd={handleDragEnd}
                rotation={el.rotation || 0}
              />
            ) : (
              <Rect
                x={sx - w / 2} y={sy - h / 2}
                width={w} height={h}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                draggable
                onClick={handleClick}
                onDragEnd={handleDragEnd}
                rotation={el.rotation || 0}
              />
            )}
            <Text
              x={sx - w / 2} y={sy + h / 2 + 4}
              text={el.label || def?.name || ''}
              fontSize={12}
              fill="#333"
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
                onDragEnd={(e) => {
                  if (!onResizeElement) return;
                  const updates = shape === 'circle'
                    ? calculateCircleResize(e.target.x(), e.target.y(), el, scale, position, baseScale)
                    : calculateRectResize(handle.key, e.target.x(), e.target.y(), el, scale, position, baseScale);
                  onResizeElement(el.id, updates);
                }}
              />
            ))}
            {/* Rotation handle */}
            {el.isSelected && (
              <Circle
                data-testid="rotation-handle"
                x={sx} y={rotHandleY}
                radius={HANDLE_R}
                fill="#FFD700"
                stroke="#FFA500"
                strokeWidth={2}
                draggable
                onDragEnd={(e) => {
                  if (!onRotateElement) return;
                  const angle = calculateRotation(e.target.x(), e.target.y(), sx, sy);
                  onRotateElement(el.id, angle);
                }}
              />
            )}
          </Group>
        );
      })}
    </Layer>
  );
};

export default PlacedElementsLayer;
