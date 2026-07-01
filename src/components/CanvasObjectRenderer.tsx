import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasObject, ResizeHandle } from '../types';
import { useStore } from '../store/useStore';
import { youtubeEmbedUrl, sendYouTubeCommand, isInteractiveMediaTarget } from '../utils/youtube';
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
    if (object.type === 'youtube' && isInteractiveMediaTarget(e.target)) return;
    e.stopPropagation();
    selectObject(object.id);
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      objX: object.x,
      objY: object.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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

  const isYouTube = object.type === 'youtube';
  const isText = object.type === 'text';

  return (
    <div
      className={`canvas-object ${isSelected ? 'canvas-object--selected' : ''} ${readOnly ? 'canvas-object--readonly' : ''} ${object.uploading ? 'canvas-object--uploading' : ''} ${isYouTube ? 'canvas-object--youtube' : ''} ${isText ? 'canvas-object--text' : ''}`}
      style={{
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
      }}
      onPointerDown={isYouTube || isText ? undefined : handlePointerDown}
      onPointerMove={isYouTube || isText ? undefined : handlePointerMove}
      onPointerUp={isYouTube || isText ? undefined : handlePointerUp}
    >
      {object.type === 'image' && object.src && (
        <img src={object.src} alt="" draggable={false} className="canvas-object__media" />
      )}

      {object.type === 'video' && object.src && (
        <VideoMedia src={object.src} isSelected={isSelected} />
      )}

      {object.uploading && (
        <div className="canvas-object__upload-overlay">
          <span className="canvas-object__upload-spinner" />
          <span className="canvas-object__upload-label">Uploading…</span>
        </div>
      )}

      {object.type === 'youtube' && object.youtubeId && (
        <>
          {!readOnly && (
            <div className="canvas-object__youtube-chrome">
              <div
                className="canvas-object__drag-handle"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                Move
              </div>
            </div>
          )}
          <YouTubeEmbed videoId={object.youtubeId} isSelected={isSelected} />
        </>
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

function VideoMedia({
  src,
  isSelected,
}: {
  src: string;
  isSelected: boolean;
}) {
  const mediaAudioEnabled = useStore((s) => s.mediaAudioEnabled);
  const enableMediaAudio = useStore((s) => s.enableMediaAudio);
  const ref = useRef<HTMLVideoElement>(null);

  const tryUnmute = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    enableMediaAudio();
    void video.play().catch(() => {
      video.muted = true;
      void video.play();
    });
  }, [enableMediaAudio]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {});
  }, [src]);

  useEffect(() => {
    if (isSelected || mediaAudioEnabled) tryUnmute();
  }, [isSelected, mediaAudioEnabled, tryUnmute]);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      loop
      playsInline
      className="canvas-object__media canvas-object__media--video"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        tryUnmute();
      }}
    />
  );
}

function YouTubeEmbed({
  videoId,
  isSelected,
}: {
  videoId: string;
  isSelected: boolean;
}) {
  const mediaAudioEnabled = useStore((s) => s.mediaAudioEnabled);
  const enableMediaAudio = useStore((s) => s.enableMediaAudio);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const embedSrc = youtubeEmbedUrl(videoId);

  const tryUnmute = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    enableMediaAudio();
    sendYouTubeCommand(iframe, 'unMute');
    sendYouTubeCommand(iframe, 'playVideo');
  }, [enableMediaAudio]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      if (isSelected || mediaAudioEnabled) tryUnmute();
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [embedSrc, isSelected, mediaAudioEnabled, tryUnmute]);

  useEffect(() => {
    if (isSelected || mediaAudioEnabled) tryUnmute();
  }, [isSelected, mediaAudioEnabled, tryUnmute]);

  const blockCanvasPointer = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="canvas-object__youtube-wrap"
      onPointerDown={blockCanvasPointer}
      onPointerMove={blockCanvasPointer}
      onPointerUp={blockCanvasPointer}
    >
      <iframe
        ref={iframeRef}
        src={embedSrc}
        title="YouTube embed"
        className="canvas-object__youtube"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onPointerDown={blockCanvasPointer}
      />
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
  const selectObject = useStore((s) => s.selectObject);
  const updateObject = useStore((s) => s.updateObject);
  const ref = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const lastSyncedText = useRef(object.text ?? '');
  const dragState = useRef<{
    startX: number;
    startY: number;
    objX: number;
    objY: number;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isComposing.current) return;
    const nextText = object.text ?? '';
    if (nextText !== lastSyncedText.current && el.textContent !== nextText) {
      el.textContent = nextText;
      lastSyncedText.current = nextText;
    }
  }, [object.text, object.id]);

  useEffect(() => {
    if (isSelected && !readOnly && ref.current && !dragState.current?.dragging) {
      ref.current.focus();
    }
  }, [isSelected, readOnly]);

  const getZoom = () =>
    useStore.getState().slides.find((s) => s.id === slideId)?.viewport.zoom ?? 1;

  const syncText = (text: string) => {
    lastSyncedText.current = text;
    updateObject(slideId, object.id, { text });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    selectObject(object.id);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      objX: object.x,
      objY: object.y,
      dragging: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (readOnly || !dragState.current) return;

    const zoom = getZoom();
    const dx = (e.clientX - dragState.current.startX) / zoom;
    const dy = (e.clientY - dragState.current.startY) / zoom;
    const moved = Math.hypot(e.clientX - dragState.current.startX, e.clientY - dragState.current.startY);

    if (!dragState.current.dragging && moved > 5) {
      dragState.current.dragging = true;
      ref.current?.blur();
    }

    if (dragState.current.dragging) {
      updateObject(slideId, object.id, {
        x: dragState.current.objX + dx,
        y: dragState.current.objY + dy,
      });
    }
  };

  const handlePointerUp = () => {
    if (!dragState.current || readOnly) {
      dragState.current = null;
      return;
    }

    if (!dragState.current.dragging) {
      ref.current?.focus();
    }

    dragState.current = null;
  };

  return (
    <div
      ref={ref}
      className="canvas-object__text"
      style={style}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onCompositionStart={() => {
        isComposing.current = true;
      }}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        syncText(e.currentTarget.textContent ?? '');
      }}
      onInput={(e) => {
        if (isComposing.current) return;
        syncText(e.currentTarget.textContent ?? '');
      }}
      onBlur={(e) => {
        if (isComposing.current) return;
        syncText(e.currentTarget.textContent ?? '');
      }}
    />
  );
}
