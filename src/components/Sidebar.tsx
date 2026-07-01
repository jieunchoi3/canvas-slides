import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const slides = useStore((s) => s.slides);
  const activeSlideId = useStore((s) => s.activeSlideId);
  const setActiveSlide = useStore((s) => s.setActiveSlide);
  const addSlide = useStore((s) => s.addSlide);
  const deleteSlide = useStore((s) => s.deleteSlide);
  const updateSlideTitle = useStore((s) => s.updateSlideTitle);
  const canDelete = slides.length > 1;

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-logo">Canvas Slides</span>}
        <div className="sidebar-header__actions">
          {!collapsed && (
            <button type="button" className="icon-btn" onClick={() => void addSlide()} title="New slide" aria-label="New slide">
              <PlusIcon />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>
      </div>

      <nav className="slide-list">
        {slides.map((slide, index) => (
          <SlideRow
            key={slide.id}
            slide={slide}
            index={index}
            isActive={slide.id === activeSlideId}
            canDelete={canDelete && !collapsed}
            collapsed={collapsed}
            onSelect={() => setActiveSlide(slide.id)}
            onDelete={() => void deleteSlide(slide.id)}
            onTitleChange={(title) => updateSlideTitle(slide.id, title)}
          />
        ))}
      </nav>

      <button
        type="button"
        className="new-slide-btn"
            onClick={() => void addSlide()}
        title="New slide"
        aria-label="New slide"
      >
        <PlusIcon />
        {!collapsed && 'New Slide'}
      </button>
    </aside>
  );
}

function SlideRow({
  slide,
  index,
  isActive,
  canDelete,
  collapsed,
  onSelect,
  onDelete,
  onTitleChange,
}: {
  slide: { id: string; title: string; objects: { type: string }[] };
  index: number;
  isActive: boolean;
  canDelete: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTitleChange: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slide.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (collapsed) return;
    e.stopPropagation();
    setDraft(slide.title);
    setEditing(true);
  };

  const commitTitle = () => {
    setEditing(false);
    onTitleChange(draft.trim() || `Slide ${index + 1}`);
  };

  const previewIcon = slide.objects[0]?.type ?? 'empty';

  if (collapsed) {
    return (
      <button
        type="button"
        className={`slide-row slide-row--compact ${isActive ? 'slide-row--active' : ''}`}
        onClick={onSelect}
        title={slide.title}
        aria-label={`Slide ${index + 1}: ${slide.title}`}
      >
        <span className="slide-compact-icon">
          <SlidePreviewIcon type={previewIcon} />
        </span>
        <span className="slide-compact-number">{index + 1}</span>
      </button>
    );
  }

  return (
    <div className={`slide-row ${isActive ? 'slide-row--active' : ''}`}>
      <button
        type="button"
        className="slide-row__main"
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
      >
        <span className="slide-preview">
          <SlidePreviewIcon type={previewIcon} />
        </span>
        <span className="slide-meta">
          <span className="slide-number">{index + 1}</span>
          {editing ? (
            <input
              ref={inputRef}
              className="slide-title-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setEditing(false);
                  setDraft(slide.title);
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="slide-title">{slide.title}</span>
          )}
        </span>
      </button>
      {canDelete && (
        <button
          type="button"
          className="slide-row__delete"
          onClick={onDelete}
          title="Delete slide"
          aria-label={`Delete ${slide.title}`}
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SlidePreviewIcon({ type }: { type: string }) {
  switch (type) {
    case 'image':
      return <ImageIcon />;
    case 'video':
      return <VideoIcon />;
    case 'youtube':
      return <YouTubeIcon />;
    case 'text':
      return <TextIcon />;
    default:
      return <EmptyIcon />;
  }
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 4h9M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3.5 4l.5 7a1 1 0 001 1h4a1 1 0 001-1l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="4.5" cy="5.5" r="1" fill="currentColor" />
      <path d="M1 10l3-3 2 2 3-4 4 5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1" />
      <path d="M10 5.5l3-1.5v6l-3-1.5V5.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1" />
      <path d="M6 5.5l3.5 2L6 9.5V5.5z" fill="currentColor" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3h8M7 3v9M5 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export { ImageIcon, VideoIcon, YouTubeIcon, TextIcon };
