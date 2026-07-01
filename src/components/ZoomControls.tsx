interface ZoomControlsProps {
  zoom: number;
  onFit: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onFit, onReset }: ZoomControlsProps) {
  return (
    <div className="zoom-controls">
      <button type="button" className="zoom-controls__btn" onClick={onReset} title="100%">
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" className="zoom-controls__btn" onClick={onFit} title="Fit to content">
        Fit
      </button>
    </div>
  );
}
