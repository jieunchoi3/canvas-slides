export function isEditingText(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  return (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.tagName === 'SELECT' ||
    (active as HTMLElement).isContentEditable
  );
}
