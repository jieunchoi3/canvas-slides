import { useStore } from '../store/useStore';

interface DeleteObjectButtonProps {
  slideId: string;
  objectId: string;
  className?: string;
}

export function DeleteObjectButton({ slideId, objectId, className = '' }: DeleteObjectButtonProps) {
  const deleteObject = useStore((s) => s.deleteObject);

  return (
    <button
      type="button"
      className={`object-toolbar__delete ${className}`.trim()}
      aria-label="Delete object"
      title="Delete"
      onClick={() => deleteObject(slideId, objectId)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </button>
  );
}
