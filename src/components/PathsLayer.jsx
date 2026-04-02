import React, { useState } from 'react';
import { Layer, Line, Circle, Text } from 'react-konva';
import { pathTotalLength } from '../utils/pathUtils.js';

const DRAFT_COLOR = '#9E9E9E';
const PATH_COLOR = '#D4A96A';
const PATH_BORDER = '#8B6914';
const VERTEX_RADIUS = 5;

const PathsLayer = ({
  paths = [],
  draftPath = null,
  cursorPoint = null,
  scale = 1,
  position = { x: 0, y: 0 },
  baseScale = 10,
  selectedPathId = null,
  onSelectPath = null,
  onUpdatePath = null,
}) => {
  // Live drag state: { pathId, index, stageX, stageY }
  const [dragging, setDragging] = useState(null);

  const toStageX = (mx) => mx * baseScale * scale + position.x;
  const toStageY = (my) => my * baseScale * scale + position.y;
  const toStageW = (m) => m * baseScale * scale;
  const toMeters = (stagePx, originPx) => (stagePx - originPx) / (baseScale * scale);

  const pointsToFlat = (pts) => pts.flatMap(p => [toStageX(p.x), toStageY(p.y)]);

  return (
    <Layer>
      {/* Finished paths */}
      {paths.map((path) => {
        const isSelected = path.id === selectedPathId;
        const isDraggingThis = dragging?.pathId === path.id;

        // Build live points: replace dragged vertex with current drag position
        const livePoints = path.points.map((pt, i) => {
          if (isDraggingThis && dragging.index === i) {
            return { x: toMeters(dragging.stageX, position.x), y: toMeters(dragging.stageY, position.y) };
          }
          return pt;
        });

        const flat = pointsToFlat(livePoints);
        const total = pathTotalLength({ ...path, points: livePoints });
        // Label position: midpoint of the path
        const mid = livePoints[Math.floor((livePoints.length - 1) / 2)];
        const labelX = toStageX(mid.x);
        const labelY = toStageY(mid.y) - toStageW(path.width / 2) - 8;

        return (
          <React.Fragment key={path.id}>
            <Line
              data-testid="path-line"
              data-selected={isSelected ? 'true' : undefined}
              points={flat}
              stroke={isSelected ? '#0099FF' : PATH_BORDER}
              strokeWidth={toStageW(path.width) + (isSelected ? 4 : 0)}
              lineCap="round"
              lineJoin="round"
              onClick={() => onSelectPath?.(path.id)}
            />
            <Line
              data-testid="path-line-inner"
              points={flat}
              stroke={PATH_COLOR}
              strokeWidth={Math.max(0, toStageW(path.width) - 4)}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
            <Text
              data-testid="path-label"
              x={labelX}
              y={labelY}
              text={`${total.toFixed(2)}m`}
              fontSize={11}
              fill={PATH_BORDER}
              offsetX={20}
              listening={false}
            />
            {/* Draggable vertex handles — only for selected path */}
            {isSelected && livePoints.map((pt, i) => (
              <Circle
                key={`vh-${i}`}
                data-testid="path-vertex"
                data-vertex-index={i}
                x={toStageX(pt.x)}
                y={toStageY(pt.y)}
                radius={VERTEX_RADIUS + 2}
                fill="white"
                stroke="#0099FF"
                strokeWidth={2}
                draggable
                onDragMove={(e) => {
                  setDragging({ pathId: path.id, index: i, stageX: e.target.x(), stageY: e.target.y() });
                }}
                onDragEnd={(e) => {
                  const newPoints = path.points.map((p, j) =>
                    j === i
                      ? { x: toMeters(e.target.x(), position.x), y: toMeters(e.target.y(), position.y) }
                      : p
                  );
                  onUpdatePath?.(path.id, { points: newPoints });
                  setDragging(null);
                }}
              />
            ))}
          </React.Fragment>
        );
      })}

      {/* Draft (in-progress) path */}
      {draftPath && (
        <>
          {(() => {
            const allPts = cursorPoint
              ? [...draftPath.points, cursorPoint]
              : draftPath.points;
            const flat = pointsToFlat(allPts);
            return (
              <Line
                data-testid="path-line"
                points={flat}
                stroke={DRAFT_COLOR}
                strokeWidth={toStageW(draftPath.width)}
                lineCap="round"
                lineJoin="round"
                dash={[8, 4]}
                opacity={0.7}
              />
            );
          })()}
          {/* Vertex dots for confirmed draft points */}
          {draftPath.points.map((pt, i) => (
            <Circle
              key={i}
              data-testid="path-vertex"
              x={toStageX(pt.x)}
              y={toStageY(pt.y)}
              radius={VERTEX_RADIUS}
              fill="white"
              stroke={DRAFT_COLOR}
              strokeWidth={2}
              listening={false}
            />
          ))}
        </>
      )}
    </Layer>
  );
};

export default PathsLayer;
