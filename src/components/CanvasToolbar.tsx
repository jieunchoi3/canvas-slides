import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { screenToWorld } from '../utils/canvas';
import { addMediaFilesAtPosition } from '../utils/mediaUpload';
import { parseYouTubeId } from '../utils/youtube';
import type { CanvasObject, Viewport } from '../types';
import { generateId } from '../utils/canvas';
import { ImageIcon, VideoIcon, YouTubeIcon, TextIcon } from './Sidebar';

interface CanvasToolbarProps {
  slideId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: Viewport;
}

export function CanvasToolbar({ slideId, containerRef, viewport }: CanvasToolbarProps) {
  const addObject = useStore((s) => s.addObject);
  const updateObject = useStore((s) => s.updateObject);
  const deleteObject = useStore((s) => s.deleteObject);
  const [showYouTube, setShowYouTube] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const mediaHandlers = { addObject, updateObject, deleteObject };

  const getCenterWorld = () => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, rect, viewport);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const { x, y } = getCenterWorld();
    await addMediaFilesAtPosition(Array.from(fileList), x, y, slideId, mediaHandlers);
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const { x, y } = getCenterWorld();
    await addMediaFilesAtPosition(Array.from(fileList), x, y, slideId, mediaHandlers);
    e.target.value = '';
  };

  const handleAddText = () => {
    const { x, y } = getCenterWorld();
    const obj: CanvasObject = {
      id: generateId(),
      type: 'text',
      x: x - 100,
      y: y - 20,
      width: 200,
      height: 40,
      text: '',
      fontFamily: 'Inter, -apple-system, sans-serif',
      fontSize: 24,
      color: '#1D1D1F',
    };
    addObject(slideId, obj);
  };

  const handleAddYouTube = () => {
    const id = parseYouTubeId(youtubeUrl);
    if (!id) return;
    const { x, y } = getCenterWorld();
    const width = 480;
    const height = (width * 9) / 16;
    const obj: CanvasObject = {
      id: generateId(),
      type: 'youtube',
      x: x - width / 2,
      y: y - height / 2,
      width,
      height,
      youtubeId: id,
    };
    addObject(slideId, obj);
    setYoutubeUrl('');
    setShowYouTube(false);
  };

  return (
    <>
      <div className="canvas-toolbar">
        <button type="button" className="canvas-toolbar__btn" onClick={() => imageInputRef.current?.click()} title="Add images">
          <ImageIcon />
        </button>
        <button type="button" className="canvas-toolbar__btn" onClick={() => videoInputRef.current?.click()} title="Add videos">
          <VideoIcon />
        </button>
        <button type="button" className="canvas-toolbar__btn" onClick={() => setShowYouTube(true)} title="Add YouTube">
          <YouTubeIcon />
        </button>
        <button type="button" className="canvas-toolbar__btn" onClick={handleAddText} title="Add text">
          <TextIcon />
        </button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={handleImageUpload}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,.mov,.mp4,.m4v"
        multiple
        hidden
        onChange={handleVideoUpload}
      />

      {showYouTube && (
        <div className="youtube-dialog-overlay" onClick={() => setShowYouTube(false)}>
          <div className="youtube-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="youtube-dialog__title">Add YouTube Link</h3>
            <input
              className="youtube-dialog__input"
              type="url"
              placeholder="Paste YouTube URL..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddYouTube()}
              autoFocus
            />
            <div className="youtube-dialog__actions">
              <button type="button" className="btn-secondary" onClick={() => setShowYouTube(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleAddYouTube}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
