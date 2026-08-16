import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import type { EdgeData } from "@/lib/architecture";

export function FlowEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } =
    props;
  const d = data as unknown as EdgeData | undefined;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  });

  const active = d && d.rps > 0;
  const arrowId = `edge-arrow-${id}`;

  return (
    <g>
      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--secondary)" />
        </marker>
      </defs>

      <BaseEdge id={id} path={path} markerEnd={`url(#${arrowId})`} style={style} />

      {active && (
        <>
          <circle r={3} fill="var(--primary)">
            <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
          <circle r={2.2} fill="var(--secondary)" opacity={0.85}>
            <animateMotion
              dur="1.8s"
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        </>
      )}

      {active && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute z-10 rounded-full border border-border bg-surface-1/90 px-1.5 py-0.5 text-[9px] font-medium text-secondary nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {Math.round(d.rps).toLocaleString()} r/s · {Math.round(d.response).toLocaleString()} res
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}
