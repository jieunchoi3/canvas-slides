import { supabase } from '../supabaseClient';

const MEDIA_BUCKET = 'media';

export async function uploadMedia(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export function getStoragePathFromUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/object/public/${MEDIA_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function deleteMediaByUrl(publicUrl: string): Promise<void> {
  const path = getStoragePathFromUrl(publicUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) console.warn('Failed to delete media:', error.message);
}

export async function deleteMediaForObjects(
  objects: { type: string; src?: string }[],
): Promise<void> {
  const urls = objects
    .filter((o) => (o.type === 'image' || o.type === 'video') && o.src)
    .map((o) => o.src!);
  await Promise.all(urls.map(deleteMediaByUrl));
}
