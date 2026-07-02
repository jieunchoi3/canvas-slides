import { useStore } from '../store/useStore';
import type { CanvasObject } from '../types';
import { isMediaMuted } from './MediaSelectionToolbar';

interface MediaMuteToggleProps {
  object: CanvasObject;
  slideId: string;
}

export function MediaMuteToggle({ object, slideId }: MediaMuteToggleProps) {
  const updateObject = useStore((s) => s.updateObject);
  const muted = isMediaMuted(object);

  return (
    <button
      type="button"
      className="media-mute-toggle"
      aria-label={muted ? 'Unmute video' : 'Mute video'}
      title={muted ? 'Unmute' : 'Mute'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => updateObject(slideId, object.id, { muted: !muted })}
    >
      {muted ? 'Unmute' : 'Mute'}
    </button>
  );
}
