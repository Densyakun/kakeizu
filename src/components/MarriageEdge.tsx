import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

export default function MarriageEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ strokeWidth: 3 }} />
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ stroke: "white", strokeWidth: 1 }} />
    </>
  );
}
