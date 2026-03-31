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
        const effectiveR = r || toStage(el.width / 2);
        const rot = el.rotation || 0;

        // Helper: rotate a stage point around element center
        const rp = (px, py) => rot !== 0 ? rotatePoint(px, py, sx, sy, rot) : { x: px, y: py };

        // For polygon shapes: get the bounding box from definition points
        const polyDefPoints = shape === 'polygon' ? (def?.points || []) : null;
        const polyBbox = polyDefPoints && polyDefPoints.length > 0 ? getPolyBbox(polyDefPoints) : null;
        // Polygon bbox top (in stage pixels, relative to center, before rotation)
        const polyTopY = polyBbox ? toStage(polyBbox.minY) : 0;

        // Resize handle positions — rotated to match element orientation (polygons: no resize)
        const resizeHandles = el.isSelected
          ? (shape === 'circle'
            ? [{ key: 'r', ...rp(sx + effectiveR, sy) }]
            : shape === 'polygon'
            ? []
            : [
                { key: 'tl', ...rp(sx - w / 2, sy - h / 2) },
                { key: 'tr', ...rp(sx + w / 2, sy - h / 2) },
                { key: 'br', ...rp(sx + w / 2, sy + h / 2) },
                { key: 'bl', ...rp(sx - w / 2, sy + h / 2) },
              ])
          : [];

        // Rotation handle: above the element center (in rotated frame)
        const rotHandleUnrotated = {
          x: sx,
          y: shape === 'circle' ? sy - effectiveR - 20
           : shape === 'polygon' ? sy + polyTopY - 20
           : sy - h / 2 - 20,
        };
        const rotHandlePos = rp(rotHandleUnrotated.x, rotHandleUnrotated.y);

        const isHovered = hoveredElementId === el.id;
        const hoverHandlers = {
          onMouseEnter: () => setHoveredElementId(el.id),
          onMouseLeave: () => setHoveredElementId(null),
        };

        // Dimension labels shown on hover
        let dimensionLabels = null;
        if (isHovered) {
          if (shape === 'circle') {
            dimensionLabels = (
              <Text
                data-testid="dimension-label"
                x={sx} y={sy - effectiveR - 16}
                text={`Ø ${(el.radius || el.width / 2).toFixed(2)}m`}
                fontSize={11} fill="#1565c0"
                offsetX={30}
                listening={false}
              />
            );
          } else if (shape === 'polygon' && polyDefPoints) {
            // Show each edge length
            dimensionLabels = polyDefPoints.map((pt, i) => {
              const next = polyDefPoints[(i + 1) % polyDefPoints.length];
              const dx = next.x - pt.x, dy = next.y - pt.y;
              const lenM = Math.sqrt(dx * dx + dy * dy);
              // Midpoint of edge in local stage coords (relative to center)
              const midLocalX = (pt.x + next.x) / 2 * toStage(1);
              const midLocalY = (pt.y + next.y) / 2 * toStage(1);
              // Perpendicular offset for label
              const edgeLen = Math.sqrt(dx * dx + dy * dy);
              const nx = edgeLen > 0 ? -dy / edgeLen : 0;
              const ny = edgeLen > 0 ?  dx / edgeLen : -1;
              const offsetPx = 12;
              // Stage position: rotate midpoint around element center
              const midStage = rp(sx + midLocalX + nx * offsetPx, sy + midLocalY + ny * offsetPx);
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
                  {...rp(sx, sy - h / 2 - 14)}
                  text={`${el.width.toFixed(2)}m`}
                  fontSize={11} fill="#1565c0"
                  rotation={rot}
                  offsetX={(el.width.toFixed(2).length * 3.5)}
                  listening={false}
                />
                <Text
                  data-testid="dimension-label"
                  {...rp(sx + w / 2 + 4, sy)}
                  text={`${el.height.toFixed(2)}m`}
                  fontSize={11} fill="#1565c0"
                  rotation={rot}
                  offsetY={5}
                  listening={false}
                />
              </>
            );
          }
        }

        // Label position: below the bounding box bottom
        const labelY = shape === 'polygon' && polyBbox
          ? sy + toStage(polyBbox.maxY) + 4
          : shape === 'circle'
          ? sy + effectiveR + 4
          : sy + h / 2 + 4;
        const labelX = shape === 'polygon' && polyBbox
          ? sx + toStage(polyBbox.minX)
          : shape === 'circle'
          ? sx - effectiveR
          : sx - w / 2;

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
                {...hoverHandlers}
              />
            ) : shape === 'polygon' ? (
              <Line
                x={sx} y={sy}
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
                x={sx} y={sy}
                offsetX={w / 2} offsetY={h / 2}
                width={w} height={h}
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
                x={rotHandlePos.x} y={rotHandlePos.y}
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
