import { useRef, useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { CanvasObjectRenderer } from './CanvasObjectRenderer';
import { CanvasToolbar } from './CanvasToolbar';
import { ZoomControls } from './ZoomControls';
import { BackgroundPicker } from './BackgroundPicker';
import { clampZoom, computeFitViewport, screenToWorld } from '../utils/canvas';
import { getGridDotColor } from '../utils/color';
import { addMediaFilesAtPosition, getDroppedFiles } from '../utils/mediaUpload';
import { isInteractiveMediaTarget } from '../utils/youtube';
import { isEditingText } from '../utils/keyboard';
import type { Viewport } from '../types';

interface InfiniteCanvasProps {
  /** Disables object editing, toolbar, and file drops — not pan/zoom. */
  readOnly?: boolean;
  slideId?: string;
  autoFitOnMount?: boolean;
  /** When false, pan/zoom changes stay local (used in presentation mode). */
  persistViewport?: boolean;
  /** Show fit/zoom controls (e.g. in presentation mode). */
  showZoomControls?: boolean;
}

export function InfiniteCanvas({
  readOnly = false,
  slideId,
  autoFitOnMount = false,
  persistViewport = true,
  showZoomControls = false,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSlideId = useStore((s) => s.activeSlideId);
  const resolvedSlideId = slideId ?? activeSlideId;
  const slide = useStore((s) => s.slides.find((sl) => sl.id === resolvedSlideId));
  const selectedObjectId = useStore((s) => s.selectedObjectId);
  const selectObject = useStore((s) => s.selectObject);
  const updateViewport = useStore((s) => s.updateViewport);
  const setViewport = useStore((s) => s.setViewport);
  const addObject = useStore((s) => s.addObject);
  const updateObject = useStore((s) => s.updateObject);
  const deleteObject = useStore((s) => s.deleteObject);

  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localViewport, setLocalViewport] = useState<Viewport | null>(null);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const presentationViewportsRef = useRef<Map<string, Viewport>>(new Map());
  const prevSlideIdRef = useRef(resolvedSlideId);

  const storedViewport = slide?.viewport ?? { x: 0, y: 0, zoom: 1 };
  const viewport = persistViewport ? storedViewport : (localViewport ?? storedViewport);
  const objects = slide?.objects ?? [];
  const backgroundColor = slide?.backgroundColor ?? '#FFFFFF';
  const gridDotColor = getGridDotColor(backgroundColor);

  useEffect(() => {
    if (readOnly) return;
    const preventDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDragOver);
    return () => window.removeEventListener('dragover', preventDragOver);
  }, [readOnly]);

  const applyViewport = useCallback(
    (next: Viewport) => {
      if (persistViewport && slide) {
        setViewport(slide.id, next);
      } else {
        setLocalViewport(next);
        if (slide) presentationViewportsRef.current.set(slide.id, next);
      }
    },
    [persistViewport, slide, setViewport],
  );

  const applyViewportDelta = useCallback(
    (delta: Partial<Viewport>) => {
      if (persistViewport && slide) {
        updateViewport(slide.id, delta);
      } else {
        setLocalViewport((prev) => {
          const current = prev ?? storedViewport;
          const next = { ...current, ...delta };
          if (slide) presentationViewportsRef.current.set(slide.id, next);
          return next;
        });
      }
    },
    [persistViewport, slide, storedViewport, updateViewport],
  );

  // Restore saved viewport when switching slides in presentation mode
  useEffect(() => {
    if (persistViewport) return;

    const prevId = prevSlideIdRef.current;
    if (prevId !== resolvedSlideId) {
      prevSlideIdRef.current = resolvedSlideId;
      const saved = presentationViewportsRef.current.get(resolvedSlideId);
      if (saved) setLocalViewport(saved);
    }
  }, [resolvedSlideId, persistViewport]);

  // Auto-fit on first visit to each slide in presentation mode
  useEffect(() => {
    if (!autoFitOnMount || !slide) return;

    if (!persistViewport && presentationViewportsRef.current.has(slide.id)) {
      setLocalViewport(presentationViewportsRef.current.get(slide.id)!);
      return;
    }

    const fit = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const fitVp = computeFitViewport(slide.objects, rect.width, rect.height);
      applyViewport(fitVp);
      if (!persistViewport) {
        presentationViewportsRef.current.set(slide.id, fitVp);
      }
    };

    fit();
    const raf = requestAnimationFrame(fit);
    const timer = window.setTimeout(fit, 50);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [autoFitOnMount, slide?.id, applyViewport, slide, persistViewport]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditingText()) return;

      if (e.code === 'Space' && !readOnly) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (readOnly) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId && resolvedSlideId) {
          deleteObject(resolvedSlideId, selectedObjectId);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditingText()) return;
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [readOnly, selectedObjectId, resolvedSlideId, deleteObject]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!containerRef.current || !slide) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - viewport.x) / viewport.zoom;
      const worldY = (mouseY - viewport.y) / viewport.zoom;

      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newZoom = clampZoom(viewport.zoom * factor);

      applyViewportDelta({
        zoom: newZoom,
        x: mouseX - worldX * newZoom,
        y: mouseY - worldY * newZoom,
      });
    },
    [slide, viewport, applyViewportDelta],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isInteractiveMediaTarget(e.target)) return;

    if (readOnly) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
      containerRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target.classList.contains('infinite-canvas') || target.classList.contains('canvas-world');
    const shouldPan = isCanvasBackground || spaceHeld;

    if (!shouldPan) return;

    if (isCanvasBackground) selectObject(null);
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || !panStart.current || !slide) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    applyViewportDelta({
      x: panStart.current.vx + dx,
      y: panStart.current.vy + dy,
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    panStart.current = null;
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (readOnly) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (readOnly || !containerRef.current || !slide) return;
    e.preventDefault();
    setIsDragOver(false);

    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = screenToWorld(e.clientX, e.clientY, rect, viewport);
    const files = getDroppedFiles(e.dataTransfer);

    await addMediaFilesAtPosition(files, x, y, resolvedSlideId, {
      addObject,
      updateObject,
      deleteObject,
    });
  };

  const handleFit = () => {
    if (!containerRef.current || !slide) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fit = computeFitViewport(slide.objects, rect.width, rect.height);
    applyViewport(fit);
    if (!persistViewport) {
      presentationViewportsRef.current.set(slide.id, fit);
    }
  };

  const handleResetZoom = () => {
    applyViewportDelta({ zoom: 1 });
  };

  const showEditorChrome = !readOnly;
  const showNavControls = showZoomControls || !readOnly;

  return (
    <div
      ref={containerRef}
      className={`infinite-canvas ${isPanning || spaceHeld ? 'infinite-canvas--panning' : ''} ${isDragOver ? 'infinite-canvas--drag-over' : ''}`}
      style={{
        backgroundColor,
        backgroundImage: `radial-gradient(circle, ${gridDotColor} 1px, transparent 1px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className="canvas-world"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {objects.map((obj) => (
          <CanvasObjectRenderer
            key={obj.id}
            object={obj}
            slideId={resolvedSlideId}
            isSelected={!readOnly && selectedObjectId === obj.id}
            readOnly={readOnly}
          />
        ))}
      </div>

      {!showEditorChrome && showNavControls && (
        <div className="canvas-bottom-bar canvas-bottom-bar--presentation">
          <ZoomControls onFit={handleFit} onReset={handleResetZoom} zoom={viewport.zoom} />
        </div>
      )}

      {showEditorChrome && (
        <div className="canvas-bottom-bar">
          <CanvasToolbar slideId={resolvedSlideId} containerRef={containerRef} viewport={viewport} />
          <div className="canvas-bottom-bar__divider" aria-hidden="true" />
          <BackgroundPicker slideId={resolvedSlideId} />
          <div className="canvas-bottom-bar__divider" aria-hidden="true" />
          <ZoomControls onFit={handleFit} onReset={handleResetZoom} zoom={viewport.zoom} />
        </div>
      )}
    </div>
  );
}

export { InfiniteCanvas as default };
