/**
 * StickerNest v2 - Vector Shape Renderer
 *
 * Renders vector shapes (rectangle, circle, triangle, polygon, star, etc.)
 * using SVG for crisp rendering at any scale.
 */

import React, { useMemo } from 'react';
import type { CanvasVectorEntity } from '../../../types/canvasEntity';

// ============================================================================
// Types
// ============================================================================

interface VectorShapeRendererProps {
  entity: CanvasVectorEntity;
}

// ============================================================================
// Shape Path Generators
// ============================================================================

/** Generate SVG path/element for rectangle */
function renderRectangle(entity: CanvasVectorEntity): React.ReactNode {
  return (
    <rect
      x={entity.strokeWidth / 2}
      y={entity.strokeWidth / 2}
      width={entity.width - entity.strokeWidth}
      height={entity.height - entity.strokeWidth}
      rx={entity.cornerRadius}
      ry={entity.cornerRadius}
      fill={entity.fill}
      fillOpacity={entity.fillOpacity}
      stroke={entity.stroke}
      strokeWidth={entity.strokeWidth}
      strokeOpacity={entity.strokeOpacity}
    />
  );
}

/** Generate SVG element for circle */
function renderCircle(entity: CanvasVectorEntity): React.ReactNode {
  const cx = entity.width / 2;
  const cy = entity.height / 2;
  const r = Math.min(entity.width, entity.height) / 2 - entity.strokeWidth / 2;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={entity.fill}
      fillOpacity={entity.fillOpacity}
      stroke={entity.stroke}
      strokeWidth={entity.strokeWidth}
      strokeOpacity={entity.strokeOpacity}
    />
  );
}

/** Generate SVG element for ellipse */
function renderEllipse(entity: CanvasVectorEntity): React.ReactNode {
  const cx = entity.width / 2;
  const cy = entity.height / 2;
  const rx = entity.width / 2 - entity.strokeWidth / 2;
  const ry = entity.height / 2 - entity.strokeWidth / 2;

  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={entity.fill}
      fillOpacity={entity.fillOpacity}
      stroke={entity.stroke}
      strokeWidth={entity.strokeWidth}
      strokeOpacity={entity.strokeOpacity}
    />
  );
}

/** Generate SVG element for triangle */
function renderTriangle(entity: CanvasVectorEntity): React.ReactNode {
  const w = entity.width - entity.strokeWidth;
  const h = entity.height - entity.strokeWidth;
  const offset = entity.strokeWidth / 2;

  const points = [
    `${w / 2 + offset},${offset}`,
    `${w + offset},${h + offset}`,
    `${offset},${h + offset}`,
  ].join(' ');

  return (
    <polygon
      points={points}
      fill={entity.fill}
      fillOpacity={entity.fillOpacity}
      stroke={entity.stroke}
      strokeWidth={entity.strokeWidth}
      strokeOpacity={entity.strokeOpacity}
      strokeLinejoin="round"
    />
  );
}

/** Generate polygon points for regular polygon */
function generatePolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number
): string {
  const points: string[] = [];
  const angleOffset = -Math.PI / 2; // Start from top

  for (let i = 0; i < sides; i++) {
    const angle = angleOffset + (2 * Math.PI * i) / sides;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return points.join(' ');
}

/** Generate SVG element for regular polygon */
function renderPolygon(entity: CanvasVectorEntity): React.ReactNode {
  const cx = entity.width / 2;
  const cy = entity.height / 2;
  const radius = Math.min(entity.width, entity.height) / 2 - entity.strokeWidth / 2;
  const sides = entity.sides || 6;

  const points = generatePolygonPoints(cx, cy, radius, sides);

  return (
    <polygon
      points={points}
      fill={entity.fill}
      fillOpacity={entity.fillOpacity}
      stroke={entity.stroke}
      strokeWidth={entity.strokeWidth}
      strokeOpacity={entity.strokeOpacity}
      strokeLinejoin="round"
    />
  );
}

/** Generate star points */
function generateStarPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points: number
): string {
  const starPoints: string[] = [];
  const angleOffset = -Math.PI / 2;
  const totalPoints = points * 2;

  for (let i = 0; i < totalPoints; i++) {
    const angle = angleOffset + (2 * Math.PI * i) / totalPoints;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    starPoints.push(`${x},${y}`);
  }

  return starPoints.join(' ');
}

/** Generate SVG element for star */
function renderStar(entity: CanvasVectorEntity): React.ReactNode {
  const cx = entity.width / 2;
  const cy = entity.height / 2;
  const outerRadius = Math.min(entity.width, entity.height) / 2 - entity.strokeWidth / 2;
  const innerRadius = outerRadius * (entity.innerRadius || 0.4);
  const numPoints = entity.points || 5;

  const points = generateStarPoints(cx, cy, outerRadius, innerRadius, numPoints);

  return (
    <polygon
      points={points}
      fill={entity.fill}
      fillOpacity={entity.fillOpacity}
      stroke={entity.stroke}
      strokeWidth={entity.strokeWidth}
      strokeOpacity={entity.strokeOpacity}
      strokeLinejoin="round"
    />
  );
}

/** Generate SVG element for line */
function renderLine(entity: CanvasVectorEntity): React.ReactNode {
  const start = entity.startPoint || { x: 0, y: entity.height / 2 };
  const end = entity.endPoint || { x: entity.width, y: entity.height / 2 };

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={entity.stroke || entity.fill}
      strokeWidth={Math.max(entity.strokeWidth, 2)}
      strokeOpacity={entity.strokeOpacity}
      strokeLinecap="round"
    />
  );
}

/** Generate SVG element for arrow */
function renderArrow(entity: CanvasVectorEntity): React.ReactNode {
  const start = entity.startPoint || { x: 10, y: entity.height / 2 };
  const end = entity.endPoint || { x: entity.width - 10, y: entity.height / 2 };
  const strokeColor = entity.stroke || entity.fill;
  const markerId = `arrow-${entity.id}`;

  // Calculate arrow head size based on stroke width
  const arrowSize = Math.max(entity.strokeWidth * 3, 8);

  return (
    <>
      <defs>
        {/* Arrow head marker */}
        {(entity.arrowHead === 'arrow' || entity.arrowHead === 'triangle' || !entity.arrowHead) && (
          <marker
            id={`${markerId}-head`}
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={arrowSize - 1}
            refY={arrowSize / 2}
            orient="auto"
          >
            <polygon
              points={`0,0 ${arrowSize},${arrowSize / 2} 0,${arrowSize}`}
              fill={strokeColor}
              fillOpacity={entity.strokeOpacity}
            />
          </marker>
        )}
        {/* Arrow tail marker */}
        {entity.arrowTail === 'arrow' || entity.arrowTail === 'triangle' ? (
          <marker
            id={`${markerId}-tail`}
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={1}
            refY={arrowSize / 2}
            orient="auto"
          >
            <polygon
              points={`${arrowSize},0 0,${arrowSize / 2} ${arrowSize},${arrowSize}`}
              fill={strokeColor}
              fillOpacity={entity.strokeOpacity}
            />
          </marker>
        ) : null}
      </defs>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={strokeColor}
        strokeWidth={Math.max(entity.strokeWidth, 2)}
        strokeOpacity={entity.strokeOpacity}
        strokeLinecap="round"
        markerEnd={entity.arrowHead !== 'none' ? `url(#${markerId}-head)` : undefined}
        markerStart={entity.arrowTail && entity.arrowTail !== 'none' ? `url(#${markerId}-tail)` : undefined}
      />
    </>
  );
}

/** Render custom path */
function renderCustomPath(entity: CanvasVectorEntity): React.ReactNode {
  if (!entity.pathData) return null;

  return (
    <path
      d={entity.pathData}
      fill={entity.fill}
      fillOpacity={entity.fillOpacity}
      stroke={entity.stroke}
      strokeWidth={entity.strokeWidth}
      strokeOpacity={entity.strokeOpacity}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

// ============================================================================
// Component
// ============================================================================

export function VectorShapeRenderer({ entity }: VectorShapeRendererProps) {
  // Render the appropriate shape
  const shapeElement = useMemo(() => {
    // If custom path data exists, use it
    if (entity.pathData) {
      return renderCustomPath(entity);
    }

    switch (entity.shapeType) {
      case 'rectangle':
        return renderRectangle(entity);
      case 'circle':
        return renderCircle(entity);
      case 'ellipse':
        return renderEllipse(entity);
      case 'triangle':
        return renderTriangle(entity);
      case 'polygon':
        return renderPolygon(entity);
      case 'star':
        return renderStar(entity);
      case 'line':
        return renderLine(entity);
      case 'arrow':
        return renderArrow(entity);
      default:
        return renderRectangle(entity);
    }
  }, [entity]);

  return (
    <svg
      width={entity.width}
      height={entity.height}
      viewBox={`0 0 ${entity.width} ${entity.height}`}
      style={{
        display: 'block',
        overflow: 'visible',
      }}
    >
      {shapeElement}
    </svg>
  );
}

export default VectorShapeRenderer;
