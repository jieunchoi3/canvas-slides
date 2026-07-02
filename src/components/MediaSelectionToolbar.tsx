import { useStore } from '../store/useStore';
import type { CanvasObject } from '../types';
import { DeleteObjectButton } from './DeleteObjectButton';

interface MediaSelectionToolbarProps {
  object: CanvasObject;
  slideId: string;
}

export function isMediaMuted(object: CanvasObject): boolean {
  return object.muted !== false;
}

export function MediaSelectionToolbar({ object, slideId }: MediaSelectionToolbarProps) {
  const updateObject = useStore((s) => s.updateObject);
  const muted = isMediaMuted(object);

  return (
    <div className="object-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="object-toolbar__mute"
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        title={muted ? 'Unmute' : 'Mute'}
        onClick={() => updateObject(slideId, object.id, { muted: !muted })}
      >
        {muted ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M11 5L6 9H3v6h3l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M11 5L6 9H3v6h3l5 4V5zM23 9l-6 6M17 9l6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <DeleteObjectButton slideId={slideId} objectId={object.id} />
    </div>
  );
}
