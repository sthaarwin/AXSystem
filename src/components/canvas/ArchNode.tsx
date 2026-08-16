import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { KIND_BY_TYPE, metersFor, type NodeData, type MeterKey } from "@/lib/architecture";

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
  const meters = kind ? metersFor(kind) : [];
  const severity =
    d.cpu > 97 ||
    d.memory > 97 ||
    (kind?.category === "Database & Cache" && d.storage > 96) ||
    (kind?.category === "Traffic" && d.liveUsers > 8000) ||
    d.status === "down";
  const overloaded = severity || d.cpu > 85 || d.memory > 88;
  const loadedLatency = d.liveLatency > d.latency * 2 || (d.latency > 0 && d.liveLatency > 120);

  const statusChip = d.status === "down" ? "bg-destructive text-destructive-foreground" : null;

  const warnings = [
    { id: "cpu", text: d.cpu > 92 ? "CPU overload" : "High CPU", show: d.cpu > 80 },
    { id: "mem", text: d.memory > 92 ? "Memory pressure" : "High memory", show: d.memory > 85 },
    {
      id: "store",
      text: d.storage > 93 ? "Storage near-full" : "High storage",
      show: kind?.category === "Database & Cache" && d.storage > 78,
    },
    {
      id: "lat",
      text: loadedLatency ? "Latency spike" : "Slow response",
      show: d.simulating && loadedLatency,
    },
    {
      id: "users",
      text: d.liveUsers > 8000 ? "Too many users" : "Busy",
      show: kind?.category === "Traffic" && d.simulating && d.liveUsers > 6000,
    },
  ].filter((w) => w.show);

  return (
    <div
      className={`w-56 rounded-3xl border bg-surface-2 p-4 shadow-[var(--shadow-elev)] transition-all ${
        selected ? "border-primary ring-2 ring-primary/40" : "border-border"
      } ${severity ? "border-destructive" : ""} ${
        d.status === "down" ? "opacity-80" : d.status === "degraded" ? "border-secondary/70" : ""
      }`}
    >
      {HANDLES.map((h) => (
        <Handle key={h.id} type="source" id={h.id} position={h.position} />
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
        {meters.map((m) => (
          <Meter
            key={m.key}
            label={m.label}
            value={m.key === "users" ? d.liveUsers : d[m.key]}
            metric={m.key}
          />
        ))}
      </div>

      {d.simulating && warnings.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {warnings.slice(0, 2).map((w) => (
            <WarningChip key={w.id} text={w.text} severity={severity} />
          ))}
        </div>
      )}

      {d.status !== "healthy" && (
        <div className="mt-2.5 flex items-center justify-center">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              statusChip ?? (d.status === "degraded" ? "bg-secondary/20 text-secondary" : "")
            }`}
          >
            <AlertTriangle size={10} />
            {d.status === "down" ? "OFFLINE" : "DEGRADED"}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        {kind?.category === "Traffic" ? (
          <span className="rounded-full bg-surface-3 px-2 py-0.5">
            {d.simulating ? `${Math.round((d.liveUsers / 8000) * 100)}% load` : "idle"}
          </span>
        ) : (
          <span className="rounded-full bg-surface-3 px-2 py-0.5">
            ${(d.cost * d.instances).toFixed(2)}/h
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 ${
            d.simulating
              ? loadedLatency
                ? "bg-destructive/20 text-destructive"
                : "bg-secondary/20 text-secondary"
              : "bg-surface-3 text-muted-foreground"
          }`}
        >
          {kind?.category === "Traffic"
            ? d.simulating
              ? `${Math.round(d.liveUsers).toLocaleString()} users`
              : "0 users"
            : d.simulating
              ? d.liveLatency
              : d.latency}
          {kind?.category !== "Traffic" ? "ms" : ""}
        </span>
      </div>
    </div>
  );
}

function WarningChip({ text, severity }: { text: string; severity: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        severity ? "bg-destructive/20 text-destructive" : "bg-secondary/20 text-secondary"
      }`}
    >
      <AlertTriangle size={10} />
      {text}
    </span>
  );
}

function Meter({ label, value, metric }: { label: string; value: number; metric: MeterKey }) {
  const isCount = metric === "users";
  const hot = isCount ? value > 8000 : value > 85;
  const pct = isCount ? (value / 8000) * 100 : value;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[10px] tracking-wide text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${hot ? "bg-destructive" : "bg-secondary"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span
        className={`w-10 text-right text-[10px] ${hot ? "text-destructive" : "text-muted-foreground"}`}
      >
        {isCount ? Math.round(value).toLocaleString() : `${Math.round(value)}%`}
      </span>
    </div>
  );
}
