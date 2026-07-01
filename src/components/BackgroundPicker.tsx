import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ColorWheelPicker } from './ColorWheelPicker';
import { BACKGROUND_PRESETS } from '../utils/color';

interface BackgroundPickerProps {
  slideId: string;
}

export function BackgroundPicker({ slideId }: BackgroundPickerProps) {
  const slide = useStore((s) => s.slides.find((sl) => sl.id === slideId));
  const updateSlideBackground = useStore((s) => s.updateSlideBackground);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const backgroundColor = slide?.backgroundColor ?? '#FFFFFF';

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="background-picker" ref={panelRef}>
      <button
        type="button"
        className="background-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        title="Slide background"
        aria-label="Slide background color"
        aria-expanded={open}
      >
        <span className="background-picker__trigger-swatch" style={{ backgroundColor }} />
        <span className="background-picker__trigger-label">Background</span>
      </button>

      {open && (
        <div className="background-picker__panel">
          <p className="background-picker__title">Slide background</p>

          <div className="background-picker__presets">
            {BACKGROUND_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`background-picker__preset ${backgroundColor.toUpperCase() === color ? 'background-picker__preset--active' : ''}`}
                style={{
                  backgroundColor: color,
                  border: color === '#FFFFFF' || color === '#FAFAFA' ? '1px solid #E5E5E5' : undefined,
                }}
                onClick={() => updateSlideBackground(slideId, color)}
                title={color}
              />
            ))}
          </div>

          <ColorWheelPicker
            value={backgroundColor}
            onChange={(hex) => updateSlideBackground(slideId, hex)}
          />
        </div>
      )}
    </div>
  );
}
