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

export function youtubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '1',
    modestbranding: '1',
    rel: '0',
    enablejsapi: '1',
    playsinline: '1',
  });
  if (typeof window !== 'undefined') {
    params.set('origin', window.location.origin);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

type YouTubeCommand = 'playVideo' | 'pauseVideo' | 'unMute' | 'muteVideo';

export function sendYouTubeCommand(iframe: HTMLIFrameElement, func: YouTubeCommand) {
  iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: '' }), '*');
}

export function isInteractiveMediaTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('.canvas-object__youtube-wrap, .canvas-object__media--video'),
  );
}
