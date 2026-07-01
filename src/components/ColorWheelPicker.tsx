import { useRef, useEffect, useCallback, useState } from 'react';
import { hexToHsv, hsvToHex, hsvToRgb, hexToRgb } from '../utils/color';

const WHEEL_SIZE = 200;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorWheelPicker({ value, onChange }: ColorWheelPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const dragging = useRef(false);

  useEffect(() => {
    const next = hexToHsv(value);
    setHsv(next);
    setHexInput(value.toUpperCase());
  }, [value]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = WHEEL_RADIUS;
    const imageData = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    const data = imageData.data;

    for (let y = 0; y < WHEEL_SIZE; y++) {
      for (let x = 0; x < WHEEL_SIZE; x++) {
        const dx = x - center + 0.5;
        const dy = y - center + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * WHEEL_SIZE + x) * 4;

        if (dist > WHEEL_RADIUS) {
          data[idx + 3] = 0;
          continue;
        }

        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const sat = Math.min(1, dist / WHEEL_RADIUS);
        const { r, g, b } = hsvToRgb(hue, sat, hsv.v);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [hsv.v]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const applyHsv = (next: typeof hsv) => {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexInput(hex.toUpperCase());
    onChange(hex);
  };

  const pickFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - WHEEL_RADIUS;
    const dy = y - WHEEL_RADIUS;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > WHEEL_RADIUS) return;

    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const s = Math.min(1, dist / WHEEL_RADIUS);
    applyHsv({ h, s, v: hsv.v });
  };

  const handleWheelPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pickFromPointer(e.clientX, e.clientY);
  };

  const handleWheelPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    pickFromPointer(e.clientX, e.clientY);
  };

  const handleWheelPointerUp = () => {
    dragging.current = false;
  };

  const handleHexCommit = () => {
    const normalized = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    const rgb = hexToRgb(normalized);
    if (!rgb) {
      setHexInput(value.toUpperCase());
      return;
    }
    applyHsv(hexToHsv(normalized));
  };

  const indicatorAngle = (hsv.h * Math.PI) / 180;
  const indicatorDist = hsv.s * WHEEL_RADIUS;
  const indicatorX = WHEEL_RADIUS + Math.cos(indicatorAngle) * indicatorDist;
  const indicatorY = WHEEL_RADIUS + Math.sin(indicatorAngle) * indicatorDist;

  return (
    <div className="color-wheel-picker">
      <div
        className="color-wheel-picker__wheel-wrap"
        onPointerDown={handleWheelPointerDown}
        onPointerMove={handleWheelPointerMove}
        onPointerUp={handleWheelPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          className="color-wheel-picker__wheel"
        />
        <div
          className="color-wheel-picker__indicator"
          style={{ left: indicatorX, top: indicatorY }}
        />
      </div>

      <div className="color-wheel-picker__brightness">
        <span className="color-wheel-picker__label">Brightness</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          className="color-wheel-picker__slider"
          onChange={(e) => applyHsv({ ...hsv, v: Number(e.target.value) / 100 })}
        />
      </div>

      <div className="color-wheel-picker__hex-row">
        <div className="color-wheel-picker__swatch" style={{ backgroundColor: value }} />
        <input
          className="color-wheel-picker__hex-input"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value.toUpperCase())}
          onBlur={handleHexCommit}
          onKeyDown={(e) => e.key === 'Enter' && handleHexCommit()}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
