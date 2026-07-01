import { supabase } from '../supabaseClient';
import type { Slide, SlideRow } from '../types';

const ACTIVE_SLIDE_KEY = 'canvas-slides-active-id';

type ViewportWithBg = Slide['viewport'] & { backgroundColor?: string };

function rowToSlide(row: SlideRow): Slide {
  const { backgroundColor, ...viewport } = row.viewport as ViewportWithBg;
  return {
    id: row.id,
    title: row.title,
    objects: row.objects ?? [],
    viewport,
    backgroundColor: backgroundColor ?? '#FFFFFF',
    sortOrder: row.sort_order,
  };
}

function slideToRow(slide: Slide): Omit<SlideRow, 'created_at' | 'updated_at'> {
  return {
    id: slide.id,
    title: slide.title,
    objects: slide.objects.map(({ uploading: _, ...obj }) => obj),
    viewport: {
      ...slide.viewport,
      backgroundColor: slide.backgroundColor ?? '#FFFFFF',
    },
    sort_order: slide.sortOrder,
  };
}

export async function loadSlides(): Promise<Slide[]> {
  const { data, error } = await supabase
    .from('slides')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data as SlideRow[]).map(rowToSlide);
}

export async function saveSlide(slide: Slide): Promise<void> {
  const row = slideToRow(slide);
  const { error } = await supabase.from('slides').upsert({
    ...row,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function createSlideInDb(title: string, sortOrder: number): Promise<Slide> {
  const { data, error } = await supabase
    .from('slides')
    .insert({
      title,
      sort_order: sortOrder,
      objects: [],
      viewport: { x: 0, y: 0, zoom: 1, backgroundColor: '#FFFFFF' },
    })
    .select()
    .single();

  if (error) throw error;
  return rowToSlide(data as SlideRow);
}

export async function deleteSlideFromDb(id: string): Promise<void> {
  const { error } = await supabase.from('slides').delete().eq('id', id);
  if (error) throw error;
}

export async function persistAllSlides(slides: Slide[]): Promise<void> {
  await Promise.all(slides.map(saveSlide));

  const { data: remoteRows, error } = await supabase.from('slides').select('id');
  if (error) throw error;

  const currentIds = new Set(slides.map((s) => s.id));
  const toDelete = (remoteRows ?? []).filter((r) => !currentIds.has(r.id));

  await Promise.all(toDelete.map((r) => deleteSlideFromDb(r.id)));
}

export function getStoredActiveSlideId(): string {
  return localStorage.getItem(ACTIVE_SLIDE_KEY) ?? '';
}

export function setStoredActiveSlideId(id: string): void {
  localStorage.setItem(ACTIVE_SLIDE_KEY, id);
}

export { ACTIVE_SLIDE_KEY };
