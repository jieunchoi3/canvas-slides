import type { AnchorPoint, ArrowEndpoint, CanvasObject } from '../types';

export const ANCHOR_POINTS: AnchorPoint[] = ['top', 'right', 'bottom', 'left', 'center'];

export function isArrowObject(obj: CanvasObject): boolean {
  return obj.type === 'arrow';
}

export function isFixedEndpoint(endpoint: ArrowEndpoint): endpoint is { x: number; y: number } {
  return 'x' in endpoint;
}

export function isAttachedEndpoint(
  endpoint: ArrowEndpoint,
): endpoint is { attachedTo: string; anchor: AnchorPoint } {
  return 'attachedTo' in endpoint;
}

export function getAnchorPosition(obj: CanvasObject, anchor: AnchorPoint): { x: number; y: number } {
  const { x, y, width, height } = obj;
  switch (anchor) {
    case 'top':
      return { x: x + width / 2, y };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    case 'left':
      return { x, y: y + height / 2 };
    case 'center':
      return { x: x + width / 2, y: y + height / 2 };
  }
}

export function resolveEndpoint(
  endpoint: ArrowEndpoint,
  objects: CanvasObject[],
): { x: number; y: number } {
  if (isFixedEndpoint(endpoint)) {
    return { x: endpoint.x, y: endpoint.y };
  }
  const target = objects.find((o) => o.id === endpoint.attachedTo);
  if (!target) return { x: 0, y: 0 };
  return getAnchorPosition(target, endpoint.anchor);
}

export interface SnapTarget {
  objectId: string;
  anchor: AnchorPoint;
  x: number;
  y: number;
}

export function findSnapTarget(
  worldX: number,
  worldY: number,
  objects: CanvasObject[],
  zoom: number,
  excludeObjectId?: string,
): SnapTarget | null {
  const snapDistance = 28 / zoom;
  let best: SnapTarget | null = null;
  let bestDist = snapDistance;

  for (const obj of objects) {
    if (obj.type === 'arrow' || obj.id === excludeObjectId) continue;

    for (const anchor of ANCHOR_POINTS) {
      const pos = getAnchorPosition(obj, anchor);
      const dist = Math.hypot(worldX - pos.x, worldY - pos.y);
      if (dist <= bestDist) {
        bestDist = dist;
        best = { objectId: obj.id, anchor, x: pos.x, y: pos.y };
      }
    }
  }

  return best;
}

export function snapToEndpoint(
  worldX: number,
  worldY: number,
  objects: CanvasObject[],
  zoom: number,
  excludeObjectId?: string,
): ArrowEndpoint {
  const snap = findSnapTarget(worldX, worldY, objects, zoom, excludeObjectId);
  if (snap) {
    return { attachedTo: snap.objectId, anchor: snap.anchor };
  }
  return { x: worldX, y: worldY };
}

export function arrowIsAttachedTo(arrow: CanvasObject, objectId: string): boolean {
  if (arrow.type !== 'arrow' || !arrow.start || !arrow.end) return false;
  return (
    (isAttachedEndpoint(arrow.start) && arrow.start.attachedTo === objectId) ||
    (isAttachedEndpoint(arrow.end) && arrow.end.attachedTo === objectId)
  );
}

export function computeArrowBounds(
  start: ArrowEndpoint,
  end: ArrowEndpoint,
  objects: CanvasObject[],
): { x: number; y: number; width: number; height: number } {
  const p1 = resolveEndpoint(start, objects);
  const p2 = resolveEndpoint(end, objects);
  const minX = Math.min(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxX = Math.max(p1.x, p2.x);
  const maxY = Math.max(p1.y, p2.y);
  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function hitTestArrow(
  worldX: number,
  worldY: number,
  objects: CanvasObject[],
  zoom: number,
): CanvasObject | null {
  const threshold = 10 / zoom;
  let best: CanvasObject | null = null;
  let bestDist = threshold;

  for (const obj of objects) {
    if (!isArrowObject(obj) || !obj.start || !obj.end) continue;
    const p1 = resolveEndpoint(obj.start, objects);
    const p2 = resolveEndpoint(obj.end, objects);
    const dist = distancePointToSegment(worldX, worldY, p1.x, p1.y, p2.x, p2.y);
    if (dist <= bestDist) {
      bestDist = dist;
      best = obj;
    }
  }

  return best;
}
