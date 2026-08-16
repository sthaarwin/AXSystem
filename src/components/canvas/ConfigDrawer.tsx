import { Trash2, X } from "lucide-react";
import { KIND_BY_TYPE, type NodeData } from "@/lib/architecture";

export function ConfigDrawer({
  node,
  onChange,
  onClose,
  onDelete,
}: {
  node: { id: string; data: NodeData } | null;
  onChange: (id: string, patch: Partial<NodeData>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const open = !!node;
  const kind = node ? KIND_BY_TYPE[node.data.type] : null;

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 z-20 w-[340px] max-w-[88vw] p-3 transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {node && kind && (
        <div className="pointer-events-auto flex h-full flex-col rounded-3xl border border-border bg-surface-1 shadow-[var(--shadow-elev)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Configure node</p>
              <p className="text-[11px] text-muted-foreground">{kind.category}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="m3-ripple rounded-full p-2 text-muted-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <Field label="Node name">
              <input
                value={node.data.label}
                onChange={(e) => onChange(node.id, { label: e.target.value })}
                className="w-full rounded-2xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </Field>

            {kind.category === "Traffic" ? (
              <Field label={`Concurrent users · ${node.data.users.toLocaleString()}`}>
                <input
                  type="range"
                  min={50}
                  max={8000}
                  step={50}
                  value={node.data.users}
                  onChange={(e) =>
                    onChange(node.id, {
                      users: Number(e.target.value),
                      liveUsers: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[var(--primary)]"
                />
              </Field>
            ) : (
              <Field label={`Instance count · ${node.data.instances}`}>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={node.data.instances}
                  onChange={(e) => onChange(node.id, { instances: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
              </Field>
            )}

            <Field label={kind.strategyLabel}>
              <div className="flex flex-wrap gap-2">
                {kind.strategies.map((s) => (
                  <button
                    key={s}
                    onClick={() => onChange(node.id, { strategy: s })}
                    className={`m3-ripple rounded-full border px-3 py-1.5 text-xs ${
                      node.data.strategy === s
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            {kind.category !== "Traffic" && (
              <Field label="Cost per hour ($)">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={node.data.cost}
                  onChange={(e) => onChange(node.id, { cost: Math.max(0, Number(e.target.value)) })}
                  className="w-full rounded-2xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </Field>
            )}

            {kind.category !== "Traffic" && (
              <Field label={`Latency impact · ${node.data.latency} ms`}>
                <input
                  type="range"
                  min={0}
                  max={300}
                  value={node.data.latency}
                  onChange={(e) => onChange(node.id, { latency: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
              </Field>
            )}

            {kind.category !== "Traffic" && (
              <div className="rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted-foreground">
                Monthly estimate
                <span className="ml-2 font-medium text-secondary">
                  ${(node.data.cost * node.data.instances * 730).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <button
              onClick={() => onDelete(node.id)}
              className="m3-ripple flex w-full items-center justify-center gap-2 rounded-full border border-destructive/50 px-4 py-2.5 text-sm text-destructive"
            >
              <Trash2 size={16} /> Remove node
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
