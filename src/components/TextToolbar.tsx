import { useStore } from '../store/useStore';
import type { CanvasObject } from '../types';
import { FONT_FAMILIES, TEXT_COLORS } from '../utils/canvas';

interface TextToolbarProps {
  object: CanvasObject;
  slideId: string;
}

export function TextToolbar({ object, slideId }: TextToolbarProps) {
  const updateObject = useStore((s) => s.updateObject);

  return (
    <div
      className="text-toolbar"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        className="text-toolbar__select"
        value={object.fontFamily ?? FONT_FAMILIES[0].value}
        onChange={(e) => updateObject(slideId, object.id, { fontFamily: e.target.value })}
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <div className="text-toolbar__size">
        <button
          type="button"
          className="text-toolbar__btn"
          onClick={() =>
            updateObject(slideId, object.id, { fontSize: Math.max(8, (object.fontSize ?? 24) - 2) })
          }
        >
          −
        </button>
        <span className="text-toolbar__size-value">{object.fontSize ?? 24}</span>
        <button
          type="button"
          className="text-toolbar__btn"
          onClick={() =>
            updateObject(slideId, object.id, { fontSize: Math.min(200, (object.fontSize ?? 24) + 2) })
          }
        >
          +
        </button>
      </div>

      <div className="text-toolbar__colors">
        {TEXT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`text-toolbar__color ${object.color === color ? 'text-toolbar__color--active' : ''}`}
            style={{ backgroundColor: color, border: color === '#FFFFFF' ? '1px solid #E5E5E5' : undefined }}
            onClick={() => updateObject(slideId, object.id, { color })}
            title={color}
          />
        ))}
        <input
          type="color"
          className="text-toolbar__color-input"
          value={object.color ?? '#1D1D1F'}
          onChange={(e) => updateObject(slideId, object.id, { color: e.target.value })}
          title="Custom color"
        />
      </div>

      <button
        type="button"
        className={`text-toolbar__btn ${object.fontWeight === 'bold' ? 'text-toolbar__btn--active' : ''}`}
        onClick={() =>
          updateObject(slideId, object.id, {
            fontWeight: object.fontWeight === 'bold' ? 'normal' : 'bold',
          })
        }
      >
        B
      </button>
      <button
        type="button"
        className={`text-toolbar__btn text-toolbar__btn--italic ${object.fontStyle === 'italic' ? 'text-toolbar__btn--active' : ''}`}
        onClick={() =>
          updateObject(slideId, object.id, {
            fontStyle: object.fontStyle === 'italic' ? 'normal' : 'italic',
          })
        }
      >
        I
      </button>
    </div>
  );
}
