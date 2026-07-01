import type { CanvasObject, Viewport } from '../types';
import { resolveEndpoint } from './arrows';

export function generateId(): string {
  return crypto.randomUUID();
}

export function computeFitViewport(
  objects: CanvasObject[],
  containerWidth: number,
  containerHeight: number,
  padding = 48,
): Viewport {
  if (objects.length === 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { x: containerWidth / 2, y: containerHeight / 2, zoom: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    if (obj.type === 'arrow' && obj.start && obj.end) {
      const p1 = resolveEndpoint(obj.start, objects);
      const p2 = resolveEndpoint(obj.end, objects);
      minX = Math.min(minX, p1.x, p2.x);
      minY = Math.min(minY, p1.y, p2.y);
      maxX = Math.max(maxX, p1.x, p2.x);
      maxY = Math.max(maxY, p1.y, p2.y);
      continue;
    }

    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  if (contentWidth <= 0 || contentHeight <= 0) {
    return { x: containerWidth / 2, y: containerHeight / 2, zoom: 1 };
  }

  const zoom = Math.min(
    (containerWidth - padding * 2) / contentWidth,
    (containerHeight - padding * 2) / contentHeight,
  );

  const x = (containerWidth - contentWidth * zoom) / 2 - minX * zoom;
  const y = (containerHeight - contentHeight * zoom) / 2 - minY * zoom;

  return { x, y, zoom: Math.max(0.05, zoom) };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: (screenX - containerRect.left - viewport.x) / viewport.zoom,
    y: (screenY - containerRect.top - viewport.y) / viewport.zoom,
  };
}

export function clampZoom(zoom: number): number {
  return Math.min(5, Math.max(0.05, zoom));
}

export const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, -apple-system, sans-serif' },
  { label: 'System', value: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: '"SF Mono", "JetBrains Mono", Menlo, monospace' },
] as const;

export const TEXT_COLORS = ['#1D1D1F', '#86868B', '#FFFFFF', '#E5E5E5', '#6E6E73'] as const;
