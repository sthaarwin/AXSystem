import { Activity, Download, Eraser, Waypoints } from "lucide-react";

export function ControlBar({
  monthlyCost,
  simulating,
  onToggleSimulate,
  onClear,
  onExport,
  nodeCount,
}: {
  monthlyCost: number;
  simulating: boolean;
  onToggleSimulate: () => void;
  onClear: () => void;
  onExport: () => void;
  nodeCount: number;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-1 px-5 py-3">
      <div className="flex items-center gap-2">
        <Waypoints size={20} className="text-primary" />
        <h1 className="text-sm font-medium text-foreground">System Design Canvas</h1>
      </div>

      <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
        ${monthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} / mo
      </span>
      <span className="hidden rounded-full bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground sm:inline">
        {nodeCount} nodes
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleSimulate}
          className={`m3-ripple flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
            simulating
              ? "m3-pulse bg-primary text-primary-foreground"
              : "border border-border bg-surface-2 text-foreground"
          }`}
        >
          <Activity size={16} />
          {simulating ? "Simulating" : "Simulate Traffic"}
        </button>
        <button
          onClick={onClear}
          aria-label="Clear canvas"
          className="m3-ripple flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground"
        >
          <Eraser size={16} /> Clear
        </button>
        <button
          onClick={onExport}
          aria-label="Export architecture JSON"
          className="m3-ripple flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground"
        >
          <Download size={16} /> Export
        </button>
      </div>
    </header>
  );
}
