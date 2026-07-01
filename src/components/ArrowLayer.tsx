import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasObject } from '../types';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/canvas';
import { computeArrowBounds, isArrowObject, resolveEndpoint } from '../utils/arrows';
import { screenToWorld } from '../utils/canvas';
import { ArrowToolbar } from './ArrowToolbar';

type Point = { x: number; y: number };

interface ArrowLayerProps {
  slideId: string;
  objects: CanvasObject[];
  readOnly?: boolean;
  preview?: { start: Point; current: Point } | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: { x: number; y: number; zoom: number };
}

type EndpointDrag = 'start' | 'end';

export function ArrowLayer({
  slideId,
  objects,
  readOnly = false,
  preview = null,
  containerRef,
  viewport,
}: ArrowLayerProps) {
  const selectedObjectId = useStore((s) => s.selectedObjectId);
  const updateObject = useStore((s) => s.updateObject);

  const arrows = objects.filter(isArrowObject);
  const selectedArrow = arrows.find((a) => a.id === selectedObjectId);

  const renderArrowLine = (arrow: CanvasObject, isSelected: boolean, isPreview = false) => {
    if (!arrow.start || !arrow.end) return null;
    const p1 = resolveEndpoint(arrow.start, objects);
    const p2 = resolveEndpoint(arrow.end, objects);
    const color = arrow.strokeColor ?? '#1D1D1F';
    const width = arrow.strokeWidth ?? 2;
    const markerEndId = `arrowhead-end-${arrow.id}`;
    const markerStartId = `arrowhead-start-${arrow.id}`;

    return (
      <g key={isPreview ? 'preview' : arrow.id}>
        {!isPreview && (
          <defs>
            {arrow.arrowheadEnd !== false && (
              <marker
                id={markerEndId}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={color} />
              </marker>
            )}
            {arrow.arrowheadStart && (
              <marker
                id={markerStartId}
                viewBox="0 0 10 10"
                refX="2"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={color} />
              </marker>
            )}
          </defs>
        )}
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={color}
          strokeWidth={width}
          strokeDasharray={isPreview ? '6 4' : undefined}
          strokeOpacity={isPreview ? 0.7 : 1}
          markerEnd={!isPreview && arrow.arrowheadEnd !== false ? `url(#${markerEndId})` : undefined}
          markerStart={!isPreview && arrow.arrowheadStart ? `url(#${markerStartId})` : undefined}
          className={`arrow-layer__line ${isSelected ? 'arrow-layer__line--selected' : ''}`}
        />
      </g>
    );
  };

  const previewArrow: CanvasObject | null = preview
    ? {
        id: 'preview',
        type: 'arrow',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        start: preview.start,
        end: preview.current,
        strokeColor: '#1D1D1F',
        strokeWidth: 2,
        arrowheadEnd: true,
      }
    : null;

  const selectedMidpoint =
    selectedArrow?.start && selectedArrow.end
      ? (() => {
          const p1 = resolveEndpoint(selectedArrow.start, objects);
          const p2 = resolveEndpoint(selectedArrow.end, objects);
          return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        })()
      : null;

  return (
    <>
      <svg className="arrow-layer" aria-hidden="true">
        {arrows.map((arrow) =>
          renderArrowLine(arrow, !readOnly && selectedObjectId === arrow.id),
        )}
        {previewArrow && renderArrowLine(previewArrow, false, true)}
      </svg>

      {!readOnly && selectedArrow?.start && selectedArrow.end && (
        <ArrowEndpointHandles
          slideId={slideId}
          arrow={selectedArrow}
          containerRef={containerRef}
          viewport={viewport}
          objects={objects}
          onUpdate={updateObject}
        />
      )}

      {!readOnly && selectedArrow && selectedMidpoint && (
        <ArrowToolbar object={selectedArrow} slideId={slideId} midpoint={selectedMidpoint} />
      )}
    </>
  );
}

function ArrowEndpointHandles({
  slideId,
  arrow,
  containerRef,
  viewport,
  objects,
  onUpdate,
}: {
  slideId: string;
  arrow: CanvasObject;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: { x: number; y: number; zoom: number };
  objects: CanvasObject[];
  onUpdate: (slideId: string, objectId: string, updates: Partial<CanvasObject>) => void;
}) {
  const dragRef = useRef<EndpointDrag | null>(null);

  const p1 = resolveEndpoint(arrow.start!, objects);
  const p2 = resolveEndpoint(arrow.end!, objects);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToWorld(clientX, clientY, rect, viewport);
  };

  const handlePointerDown = (e: React.PointerEvent, which: EndpointDrag) => {
    e.stopPropagation();
    dragRef.current = which;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { x, y } = toWorld(e.clientX, e.clientY);
    const endpoint = { x, y };
    onUpdate(
      slideId,
      arrow.id,
      dragRef.current === 'start' ? { start: endpoint } : { end: endpoint },
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="arrow-layer__handles" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <div
        className="arrow-layer__handle"
        style={{ left: p1.x - 6, top: p1.y - 6 }}
        onPointerDown={(e) => handlePointerDown(e, 'start')}
      />
      <div
        className="arrow-layer__handle"
        style={{ left: p2.x - 6, top: p2.y - 6 }}
        onPointerDown={(e) => handlePointerDown(e, 'end')}
      />
    </div>
  );
}

interface ArrowDrawOverlayProps {
  slideId: string;
  objects: CanvasObject[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: { x: number; y: number; zoom: number };
  onPreviewChange: (preview: { start: Point; current: Point } | null) => void;
}

export function ArrowDrawOverlay({
  slideId,
  objects,
  containerRef,
  viewport,
  onPreviewChange,
}: ArrowDrawOverlayProps) {
  const arrowDrawingMode = useStore((s) => s.arrowDrawingMode);
  const setArrowDrawingMode = useStore((s) => s.setArrowDrawingMode);
  const addObject = useStore((s) => s.addObject);
  const drawingRef = useRef<{ start: Point; current: Point } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return screenToWorld(clientX, clientY, rect, viewport);
    },
    [containerRef, viewport],
  );

  useEffect(() => {
    if (!arrowDrawingMode && !drawingRef.current) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawingRef.current = null;
        setIsDrawing(false);
        onPreviewChange(null);
        setArrowDrawingMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [arrowDrawingMode, onPreviewChange, setArrowDrawingMode]);

  useEffect(() => {
    if (!arrowDrawingMode) {
      drawingRef.current = null;
      setIsDrawing(false);
      onPreviewChange(null);
    }
  }, [arrowDrawingMode, onPreviewChange]);

  const finishDrawing = useCallback(
    (start: Point, end: Point) => {
      if (Math.hypot(end.x - start.x, end.y - start.y) < 4) return;

      const startEndpoint = { x: start.x, y: start.y };
      const endEndpoint = { x: end.x, y: end.y };
      const bounds = computeArrowBounds(startEndpoint, endEndpoint, objects);

      addObject(slideId, {
        id: generateId(),
        type: 'arrow',
        ...bounds,
        start: startEndpoint,
        end: endEndpoint,
        strokeColor: '#1D1D1F',
        strokeWidth: 2,
        arrowheadStart: false,
        arrowheadEnd: true,
      });
    },
    [addObject, objects, slideId],
  );

  if (!arrowDrawingMode && !isDrawing) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!arrowDrawingMode) return;
    e.stopPropagation();
    e.preventDefault();
    const world = toWorld(e.clientX, e.clientY);
    drawingRef.current = { start: world, current: world };
    setIsDrawing(true);
    onPreviewChange({ start: world, current: world });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const world = toWorld(e.clientX, e.clientY);
    drawingRef.current = { ...drawingRef.current, current: world };
    onPreviewChange({ ...drawingRef.current });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    finishDrawing(drawingRef.current.start, drawingRef.current.current);
    drawingRef.current = null;
    setIsDrawing(false);
    onPreviewChange(null);
    setArrowDrawingMode(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="arrow-draw-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
