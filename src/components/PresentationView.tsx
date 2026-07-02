import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { InfiniteCanvas } from './InfiniteCanvas';

export function PresentationView() {
  const slides = useStore((s) => s.slides);
  const presentationSlideIndex = useStore((s) => s.presentationSlideIndex);
  const exitPresentation = useStore((s) => s.exitPresentation);
  const nextSlide = useStore((s) => s.nextSlide);
  const prevSlide = useStore((s) => s.prevSlide);

  const slide = slides[presentationSlideIndex];
  const hasNext = presentationSlideIndex < slides.length - 1;
  const hasPrev = presentationSlideIndex > 0;

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Fullscreen may be blocked; presentation still works
      }
    };
    enterFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitPresentation();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exitPresentation, nextSlide, prevSlide]);

  if (!slide) return null;

  return (
    <div className="presentation">
      <InfiniteCanvas
        slideId={slide.id}
        readOnly
        persistViewport={false}
        autoFitOnMount
        showZoomControls
      />

      <div className="presentation-nav">
        <button
          type="button"
          className="presentation-nav__btn"
          onClick={prevSlide}
          disabled={!hasPrev}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <span className="presentation-nav__counter">
          {presentationSlideIndex + 1} / {slides.length}
        </span>
        <button
          type="button"
          className="presentation-nav__btn presentation-nav__btn--next"
          onClick={nextSlide}
          disabled={!hasNext}
          aria-label="Next slide"
        >
          Next
        </button>
      </div>

      <div className="presentation-exit-zone">
        <button
          type="button"
          className="presentation-exit"
          onClick={exitPresentation}
        >
          Exit
        </button>
      </div>
    </div>
  );
}
