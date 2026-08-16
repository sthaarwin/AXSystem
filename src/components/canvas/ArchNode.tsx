import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { KIND_BY_TYPE, type NodeData } from "@/lib/architecture";

const HANDLES = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
];

export function ArchNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  const kind = KIND_BY_TYPE[d.type];
  const Icon = kind?.icon;
  const overloaded = d.cpu > 85 || d.memory > 88;
  const loadedLatency = d.liveLatency > d.latency * 2 || (d.latency > 0 && d.liveLatency > 120);

  return (
    <div
      className={`w-56 rounded-3xl border bg-surface-2 p-4 shadow-[var(--shadow-elev)] transition-all ${
        selected ? "border-primary ring-2 ring-primary/40" : "border-border"
      } ${overloaded ? "border-destructive" : ""}`}
    >
      {HANDLES.map((h) => (
        <Handle key={`s-${h.id}`} type="source" id={h.id} position={h.position} />
      ))}
      {HANDLES.map((h) => (
        <Handle key={`t-${h.id}`} type="target" id={`${h.id}-in`} position={h.position} />
      ))}

      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/15 p-2 text-primary">
          {Icon ? <Icon size={18} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{d.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {d.strategy} · x{d.instances}
          </p>
        </div>
        {overloaded && <AlertTriangle size={16} className="text-destructive" />}
      </div>

      <div className="mt-3 space-y-2">
        <Meter label="CPU" value={d.cpu} />
        <Meter label="MEM" value={d.memory} />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="rounded-full bg-surface-3 px-2 py-0.5">
          ${(d.cost * d.instances).toFixed(2)}/h
        </span>
        <span
          className={`rounded-full px-2 py-0.5 ${
            d.simulating
              ? loadedLatency
                ? "bg-destructive/20 text-destructive"
                : "bg-secondary/20 text-secondary"
              : "bg-surface-3 text-muted-foreground"
          }`}
        >
          {d.simulating ? d.liveLatency : d.latency}ms
        </span>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const hot = value > 85;
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-[10px] tracking-wide text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${hot ? "bg-destructive" : "bg-secondary"}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span
        className={`w-8 text-right text-[10px] ${hot ? "text-destructive" : "text-muted-foreground"}`}
      >
        {Math.round(value)}%
      </span>
    </div>
  );
}
