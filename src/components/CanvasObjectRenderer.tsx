import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasObject, ResizeHandle } from '../types';
import { useStore } from '../store/useStore';
import { youtubeEmbedUrl } from '../utils/youtube';
import { FONT_FAMILIES } from '../utils/canvas';
import { TextToolbar } from './TextToolbar';

interface CanvasObjectRendererProps {
  object: CanvasObject;
  slideId: string;
  isSelected: boolean;
  readOnly?: boolean;
}

export function CanvasObjectRenderer({
  object,
  slideId,
  isSelected,
  readOnly = false,
}: CanvasObjectRendererProps) {
  const selectObject = useStore((s) => s.selectObject);
  const updateObject = useStore((s) => s.updateObject);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; objX: number; objY: number } | null>(null);
  const resizeStart = useRef<{
    handle: ResizeHandle;
    x: number;
    y: number;
    obj: CanvasObject;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly || object.uploading) return;
    e.stopPropagation();
    selectObject(object.id);
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      objX: object.x,
      objY: object.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (e: React.PointerEvent, handle: ResizeHandle) => {
    if (readOnly || object.uploading) return;
    e.stopPropagation();
    selectObject(object.id);
    resizeStart.current = { handle, x: e.clientX, y: e.clientY, obj: { ...object } };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const zoom = useStore.getState().slides.find((s) => s.id === slideId)?.viewport.zoom ?? 1;

      if (resizeStart.current) {
        const { handle, x, y, obj } = resizeStart.current;
        const dx = (e.clientX - x) / zoom;
        const dy = (e.clientY - y) / zoom;
        const lockAspect = object.type !== 'text' && !e.shiftKey;
        const aspect = obj.width / obj.height;

        let newX = obj.x;
        let newY = obj.y;
        let newW = obj.width;
        let newH = obj.height;

        if (handle.includes('e')) newW = Math.max(40, obj.width + dx);
        if (handle.includes('w')) {
          newW = Math.max(40, obj.width - dx);
          newX = obj.x + obj.width - newW;
        }
        if (handle.includes('s')) newH = Math.max(30, obj.height + dy);
        if (handle.includes('n')) {
          newH = Math.max(30, obj.height - dy);
          newY = obj.y + obj.height - newH;
        }

        if (lockAspect) {
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = newW / aspect;
          } else {
            newW = newH * aspect;
          }
          if (handle.includes('w')) newX = obj.x + obj.width - newW;
          if (handle.includes('n')) newY = obj.y + obj.height - newH;
        }

        updateObject(slideId, object.id, { x: newX, y: newY, width: newW, height: newH });
        return;
      }

      if (isDragging && dragStart.current) {
        const dx = (e.clientX - dragStart.current.x) / zoom;
        const dy = (e.clientY - dragStart.current.y) / zoom;
        updateObject(slideId, object.id, {
          x: dragStart.current.objX + dx,
          y: dragStart.current.objY + dy,
        });
      }
    },
    [isDragging, object.id, object.type, slideId, updateObject],
  );

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStart.current = null;
    resizeStart.current = null;
  };

  const textStyle: React.CSSProperties = {
    fontFamily: object.fontFamily ?? FONT_FAMILIES[0].value,
    fontSize: object.fontSize ?? 24,
    color: object.color ?? '#1D1D1F',
    fontWeight: object.fontWeight ?? 'normal',
    fontStyle: object.fontStyle ?? 'normal',
  };

  return (
    <div
      className={`canvas-object ${isSelected ? 'canvas-object--selected' : ''} ${readOnly ? 'canvas-object--readonly' : ''} ${object.uploading ? 'canvas-object--uploading' : ''}`}
      style={{
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {object.type === 'image' && object.src && (
        <img src={object.src} alt="" draggable={false} className="canvas-object__media" />
      )}

      {object.type === 'video' && object.src && (
        <video
          src={object.src}
          autoPlay
          muted
          loop
          playsInline
          className="canvas-object__media"
        />
      )}

      {object.uploading && (
        <div className="canvas-object__upload-overlay">
          <span className="canvas-object__upload-spinner" />
          <span className="canvas-object__upload-label">Uploading…</span>
        </div>
      )}

      {object.type === 'youtube' && object.youtubeId && (
        <iframe
          src={youtubeEmbedUrl(object.youtubeId)}
          title="YouTube embed"
          className="canvas-object__media canvas-object__youtube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}

      {object.type === 'text' && (
        <TextContent
          object={object}
          slideId={slideId}
          isSelected={isSelected}
          readOnly={readOnly}
          style={textStyle}
        />
      )}

      {isSelected && !readOnly && !object.uploading && (
        <>
          {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => (
            <div
              key={handle}
              className={`resize-handle resize-handle--${handle}`}
              onPointerDown={(e) => handleResizePointerDown(e, handle)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          ))}
          {object.type === 'text' && <TextToolbar object={object} slideId={slideId} />}
        </>
      )}
    </div>
  );
}

function TextContent({
  object,
  slideId,
  isSelected,
  readOnly,
  style,
}: {
  object: CanvasObject;
  slideId: string;
  isSelected: boolean;
  readOnly: boolean;
  style: React.CSSProperties;
}) {
  const updateObject = useStore((s) => s.updateObject);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && !readOnly && ref.current) {
      ref.current.focus();
    }
  }, [isSelected, readOnly]);

  return (
    <div
      ref={ref}
      className="canvas-object__text"
      style={style}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onPointerDown={(e) => e.stopPropagation()}
      onInput={(e) => {
        updateObject(slideId, object.id, { text: e.currentTarget.textContent ?? '' });
      }}
    >
      {object.text}
    </div>
  );
}
