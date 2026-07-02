export type CanvasObjectType = 'image' | 'video' | 'youtube' | 'text' | 'arrow';

export type AnchorPoint = 'top' | 'right' | 'bottom' | 'left' | 'center';

export type ArrowEndpoint =
  | { x: number; y: number }
  | { attachedTo: string; anchor: AnchorPoint };

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  src?: string;
  youtubeId?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  uploading?: boolean;
  muted?: boolean;
  start?: ArrowEndpoint;
  end?: ArrowEndpoint;
  strokeColor?: string;
  strokeWidth?: number;
  arrowheadStart?: boolean;
  arrowheadEnd?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Slide {
  id: string;
  title: string;
  backgroundColor?: string;
  objects: CanvasObject[];
  viewport: Viewport;
  sortOrder: number;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export interface SlideRow {
  id: string;
  title: string;
  objects: CanvasObject[];
  viewport: Viewport & { backgroundColor?: string };
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
