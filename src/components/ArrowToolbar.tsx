import { useStore } from '../store/useStore';
import type { CanvasObject } from '../types';
import { TEXT_COLORS } from '../utils/canvas';
import { DeleteObjectButton } from './DeleteObjectButton';

interface ArrowToolbarProps {
  object: CanvasObject;
  slideId: string;
  midpoint: { x: number; y: number };
}

function clampStrokeWidth(width: number) {
  return Math.min(12, Math.max(1, width));
}

export function ArrowToolbar({ object, slideId, midpoint }: ArrowToolbarProps) {
  const updateObject = useStore((s) => s.updateObject);
  const strokeWidth = object.strokeWidth ?? 2;
  const strokeColor = object.strokeColor ?? '#1D1D1F';

  return (
    <div
      className="arrow-toolbar"
      style={{
        left: midpoint.x,
        top: midpoint.y - 48,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="arrow-toolbar__colors">
        {TEXT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`text-toolbar__color ${strokeColor === color ? 'text-toolbar__color--active' : ''}`}
            style={{ backgroundColor: color, border: color === '#FFFFFF' ? '1px solid #E5E5E5' : undefined }}
            onClick={() => updateObject(slideId, object.id, { strokeColor: color })}
            title={color}
          />
        ))}
        <input
          type="color"
          className="text-toolbar__color-input"
          value={strokeColor}
          onChange={(e) => updateObject(slideId, object.id, { strokeColor: e.target.value })}
          title="Custom color"
        />
      </div>

      <div className="arrow-toolbar__width">
        <button
          type="button"
          className="text-toolbar__btn"
          onClick={() =>
            updateObject(slideId, object.id, { strokeWidth: clampStrokeWidth(strokeWidth - 1) })
          }
          aria-label="Decrease stroke width"
        >
          −
        </button>
        <span className="arrow-toolbar__width-value">{strokeWidth}px</span>
        <button
          type="button"
          className="text-toolbar__btn"
          onClick={() =>
            updateObject(slideId, object.id, { strokeWidth: clampStrokeWidth(strokeWidth + 1) })
          }
          aria-label="Increase stroke width"
        >
          +
        </button>
      </div>

      <button
        type="button"
        className={`text-toolbar__btn ${object.arrowheadStart ? 'text-toolbar__btn--active' : ''}`}
        onClick={() =>
          updateObject(slideId, object.id, { arrowheadStart: !object.arrowheadStart })
        }
        title="Arrowhead at start"
        aria-label="Toggle arrowhead at start"
      >
        ←
      </button>
      <button
        type="button"
        className={`text-toolbar__btn ${object.arrowheadEnd !== false ? 'text-toolbar__btn--active' : ''}`}
        onClick={() =>
          updateObject(slideId, object.id, {
            arrowheadEnd: object.arrowheadEnd === false ? true : false,
          })
        }
        title="Arrowhead at end"
        aria-label="Toggle arrowhead at end"
      >
        →
      </button>

      <div className="text-toolbar__divider" aria-hidden="true" />

      <DeleteObjectButton slideId={slideId} objectId={object.id} />
    </div>
  );
}
