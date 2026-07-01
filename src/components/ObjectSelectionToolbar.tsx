import { DeleteObjectButton } from './DeleteObjectButton';

interface ObjectSelectionToolbarProps {
  slideId: string;
  objectId: string;
}

export function ObjectSelectionToolbar({ slideId, objectId }: ObjectSelectionToolbarProps) {
  return (
    <div className="object-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      <DeleteObjectButton slideId={slideId} objectId={objectId} />
    </div>
  );
}
