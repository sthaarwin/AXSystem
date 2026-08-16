import { ChevronLeft, ChevronRight, Blocks, Layers } from "lucide-react";
import { CATALOG, TEMPLATES, type ArchTemplate, type ComponentKind } from "@/lib/architecture";

export function PaletteSidebar({
  collapsed,
  onToggle,
  onAdd,
  onApplyTemplate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onAdd: (kind: ComponentKind) => void;
  onApplyTemplate: (template: ArchTemplate) => void;
}) {
  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-border bg-surface-1 transition-all duration-300 ${
        collapsed ? "w-16" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Blocks size={18} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Components</span>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="m3-ripple rounded-full p-2 text-muted-foreground"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        <section>
          {!collapsed && (
            <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Templates
            </p>
          )}
          <div className="space-y-1.5">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => onApplyTemplate(template)}
                title={template.name}
                className="m3-ripple flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 px-3 py-2.5 text-left"
              >
                <Layers size={17} className="shrink-0 text-primary" />
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">
                      {template.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {template.tagline}
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          {!collapsed && (
            <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Component library
            </p>
          )}
          {CATALOG.map((group) => (
            <div key={group.category} className="mb-5">
              {!collapsed && (
                <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  {group.category}
                </p>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/arch-node", item.type);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onAdd(item)}
                      title={item.label}
                      className="m3-ripple flex w-full cursor-grab items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 px-3 py-2.5 text-left active:cursor-grabbing"
                    >
                      <Icon size={17} className="shrink-0 text-primary" />
                      {!collapsed && (
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-foreground">
                            {item.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            ${item.cost.toFixed(2)}/h · {item.latency}ms
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
}
