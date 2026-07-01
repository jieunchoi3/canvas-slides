import type { CanvasObject } from '../types';
import { generateId } from './canvas';
import { uploadMedia } from './uploadMedia';

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'bmp',
  'tiff',
  'tif',
  'avif',
]);

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv', 'mpeg', 'mpg']);

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? VIDEO_EXTENSIONS.has(ext) : false;
}

export function getDroppedFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];

  if (dataTransfer.items?.length) {
    for (const item of Array.from(dataTransfer.items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }

  if (files.length === 0 && dataTransfer.files?.length) {
    return Array.from(dataTransfer.files);
  }

  return files;
}

function extensionForMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[mimeType] ?? mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
}

function normalizeClipboardFile(file: File, index: number): File {
  if (file.name && file.name !== 'image.png' && file.name !== 'blob') return file;
  const ext = extensionForMimeType(file.type);
  return new File([file], `pasted-image-${index + 1}.${ext}`, { type: file.type });
}

export function getClipboardMediaFiles(dataTransfer: DataTransfer): File[] {
  const rawFiles: File[] = [];

  if (dataTransfer.items?.length) {
    for (const item of Array.from(dataTransfer.items)) {
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (file && (file.type.startsWith('image/') || isImageFile(file))) {
        rawFiles.push(file);
      }
    }
  }

  if (rawFiles.length === 0 && dataTransfer.files?.length) {
    for (const file of Array.from(dataTransfer.files)) {
      if (isImageFile(file)) rawFiles.push(file);
    }
  }

  return rawFiles.map((file, index) => normalizeClipboardFile(file, index));
}

async function fileFromDataUrl(dataUrl: string, index: number): Promise<File | null> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const ext = extensionForMimeType(blob.type);
    return new File([blob], `pasted-image-${index + 1}.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

export async function getClipboardImageFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const files = getClipboardMediaFiles(dataTransfer);
  if (files.length > 0) return files;

  const html = dataTransfer.getData('text/html');
  if (!html) return [];

  const srcMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  const dataUrls = srcMatches
    .map((match) => match[1])
    .filter((src) => src.startsWith('data:image/'));

  const fromHtml: File[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const file = await fileFromDataUrl(dataUrls[i], fromHtml.length);
    if (file) fromHtml.push(file);
  }

  return fromHtml;
}

export function getGridOffset(
  index: number,
  total: number,
  cellWidth = 420,
  cellHeight = 320,
): { dx: number; dy: number } {
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const itemsInRow = Math.min(cols, total - row * cols);
  const centerOffsetX = ((itemsInRow - 1) * cellWidth) / 2;
  return { dx: col * cellWidth - centerOffsetX, dy: row * cellHeight };
}

function measureImage(file: File): Promise<{ width: number; height: number }> {
  const tempUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      const maxW = 400;
      const scale = Math.min(1, maxW / img.width);
      resolve({ width: img.width * scale, height: img.height * scale });
    };
    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = tempUrl;
  });
}

function measureVideo(file: File): Promise<{ width: number; height: number }> {
  const tempUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(tempUrl);
      const maxW = 480;
      const w = video.videoWidth || 480;
      const h = video.videoHeight || 270;
      const scale = Math.min(1, maxW / w);
      resolve({ width: w * scale, height: h * scale });
    };
    video.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Failed to load video'));
    };
    video.src = tempUrl;
  });
}

type ObjectHandlers = {
  addObject: (slideId: string, object: CanvasObject) => void;
  updateObject: (slideId: string, objectId: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (slideId: string, objectId: string) => void;
};

async function uploadImageObject(
  file: File,
  x: number,
  y: number,
  slideId: string,
  handlers: ObjectHandlers,
): Promise<void> {
  const { width, height } = await measureImage(file);
  const id = generateId();

  handlers.addObject(slideId, {
    id,
    type: 'image',
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    uploading: true,
  });

  try {
    const src = await uploadMedia(file);
    handlers.updateObject(slideId, id, { src, uploading: false });
  } catch {
    handlers.deleteObject(slideId, id);
  }
}

async function uploadVideoObject(
  file: File,
  x: number,
  y: number,
  slideId: string,
  handlers: ObjectHandlers,
): Promise<void> {
  const { width, height } = await measureVideo(file);
  const id = generateId();

  handlers.addObject(slideId, {
    id,
    type: 'video',
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    uploading: true,
  });

  try {
    const src = await uploadMedia(file);
    handlers.updateObject(slideId, id, { src, uploading: false });
  } catch {
    handlers.deleteObject(slideId, id);
  }
}

export async function addMediaFilesAtPosition(
  files: File[],
  baseX: number,
  baseY: number,
  slideId: string,
  handlers: ObjectHandlers,
): Promise<void> {
  const mediaFiles = files.filter((f) => isImageFile(f) || isVideoFile(f));

  for (let index = 0; index < mediaFiles.length; index++) {
    const file = mediaFiles[index];
    const { dx, dy } = getGridOffset(index, mediaFiles.length);
    const x = baseX + dx;
    const y = baseY + dy;

    if (isImageFile(file)) {
      await uploadImageObject(file, x, y, slideId, handlers);
    } else {
      await uploadVideoObject(file, x, y, slideId, handlers);
    }
  }
}
