import React from 'react';
import { Layer, Rect, Circle, Text, Group } from 'react-konva';
import { getElementDefinition } from '../data/elementDefinitions.js';
import { calculateRectResize, calculateCircleResize, calculateRotation } from '../utils/elementUtils.js';

const SELECTION_STROKE = '#0099FF';
const SELECTION_STROKE_WIDTH = 3;

const PlacedElementsLayer = ({
  elements = [],
  scale = 1,
  position = { x: 0, y: 0 },
  baseScale = 10,
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
        const stroke = el.isSelected ? SELECTION_STROKE : (el.borderColor || def?.borderColor || '#000');
        const strokeWidth = el.isSelected ? SELECTION_STROKE_WIDTH : (el.borderWidth || def?.borderWidth || 1);
        const sx = stageX(el.x);
        const sy = stageY(el.y);
        const w = toStage(el.width);
        const h = toStage(el.height);
        const r = toStage(el.radius || 0);

        const handleClick = () => onSelectElement?.(el.id);
        const handleDragEnd = (e) => {
          if (!onMoveElement) return;
          const newX = (e.target.x() - position.x) / (baseScale * scale);
          const newY = (e.target.y() - position.y) / (baseScale * scale);
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
