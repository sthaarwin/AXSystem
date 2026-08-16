import {
  Activity,
  Download,
  Eraser,
  PanelsTopLeft,
  Redo2,
  Share2,
  Undo2,
  Upload,
  Waypoints,
} from "lucide-react";
import { useRef } from "react";

export function ControlBar({
  monthlyCost,
  simulating,
  onToggleSimulate,
  onClear,
  onExport,
  onImport,
  onAutoLayout,
  onUndo,
  onRedo,
  onShare,
  canUndo,
  canRedo,
  nodeCount,
}: {
  monthlyCost: number;
  simulating: boolean;
  onToggleSimulate: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShare: () => void;
  canUndo: boolean;
  canRedo: boolean;
  nodeCount: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
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

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            className="m3-ripple rounded-full p-1.5 text-foreground disabled:opacity-30"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            className="m3-ripple rounded-full p-1.5 text-foreground disabled:opacity-30"
          >
            <Redo2 size={16} />
          </button>
        </span>
        <button
          onClick={onAutoLayout}
          aria-label="Auto-layout"
          className="m3-ripple flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground"
        >
          <PanelsTopLeft size={16} /> Layout
        </button>
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
          onClick={onShare}
          aria-label="Share architecture link"
          className="m3-ripple flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground"
        >
          <Share2 size={16} /> Share
        </button>
        <button
          onClick={onClear}
          aria-label="Clear canvas"
          className="m3-ripple flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground"
        >
          <Eraser size={16} /> Clear
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Import architecture JSON"
          className="m3-ripple flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground"
        >
          <Upload size={16} /> Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
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
