export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function youtubeEmbedUrl(videoId: string, muted = false): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: '1',
    playlist: videoId,
    controls: '1',
    modestbranding: '1',
    rel: '0',
    enablejsapi: '1',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
