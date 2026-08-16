import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ArchNode } from "@/components/canvas/ArchNode";
import { ConfigDrawer } from "@/components/canvas/ConfigDrawer";
import { ControlBar } from "@/components/canvas/ControlBar";
import { PaletteSidebar } from "@/components/canvas/PaletteSidebar";
import {
  KIND_BY_TYPE,
  missingRequired,
  type ComponentKind,
  type NodeData,
} from "@/lib/architecture";
import { Copy, Pencil, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AXSystem — System Designer" },
      {
        name: "description",
        content:
          "Drag, connect and configure servers, caches, queues and load balancers on a dark Material 3 canvas with live cost and traffic simulation.",
      },
      { property: "og:title", content: "System Design Canvas — Architecture Planner" },
      {
        property: "og:description",
        content:
          "Design distributed systems visually: drag components, wire traffic flows, tune strategies and estimate monthly cost.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ReactFlowProvider>
      <CanvasPage />
    </ReactFlowProvider>
  ),
});

const nodeTypes = { arch: ArchNode };
let idCounter = 0;
const nextId = () => `n${++idCounter}`;

function makeNode(
  kind: ComponentKind,
  position: { x: number; y: number },
  simulating: boolean,
): Node {
  return {
    id: nextId(),
    type: "arch",
    position,
    data: {
      type: kind.type,
      label: kind.label,
      instances: 1,
      strategy: kind.strategies[0],
      cost: kind.cost,
      latency: kind.latency,
      liveLatency: kind.latency,
      cpu: 12 + Math.random() * 10,
      memory: 18 + Math.random() * 12,
      simulating,
    } satisfies NodeData,
  };
}

function CanvasPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    target: "node" | "edge";
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const addNode = useCallback(
    (kind: ComponentKind, position?: { x: number; y: number }) => {
      const pos = position ?? { x: 220 + Math.random() * 240, y: 120 + Math.random() * 240 };
      setNodes((ns) => ns.concat(makeNode(kind, pos, simulating)));
    },
    [setNodes, simulating],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/arch-node");
      const kind = KIND_BY_TYPE[type];
      if (!kind) return;
      addNode(kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [addNode, screenToFlowPosition],
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((es) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "var(--secondary)", strokeWidth: 2 },
          },
          es,
        ),
      ),
    [setEdges],
  );

  // Traffic simulation: live CPU / memory drift
  useEffect(() => {
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, simulating } })));
    if (!simulating) {
      const t = setTimeout(
        () =>
          setNodes((ns) =>
            ns.map((n) => ({
              ...n,
              data: {
                ...n.data,
                cpu: 12 + Math.random() * 10,
                memory: 18 + Math.random() * 12,
                liveLatency: n.data.latency,
              },
            })),
          ),
        200,
      );
      return () => clearTimeout(t);
    }
    const interval = setInterval(() => {
      setNodes((ns) =>
        ns.map((n) => {
          const d = n.data as unknown as NodeData;
          const demand = 30 + Math.random() * 65;
          const nextCpu = Math.min(
            99,
            Math.max(5, d.cpu + (demand - d.cpu) * 0.25 + (Math.random() - 0.5) * 14),
          );
          const nextMemory = Math.min(
            99,
            Math.max(8, d.memory + (demand * 0.85 - d.memory) * 0.2 + (Math.random() - 0.5) * 8),
          );
          return {
            ...n,
            data: {
              ...d,
              cpu: nextCpu,
              memory: nextMemory,
              liveLatency: Math.round(d.latency * (1 + nextCpu / 100) + Math.random() * 4),
            },
          };
        }),
      );
    }, 600);
    return () => clearInterval(interval);
  }, [simulating, setNodes]);

  const updateNode = useCallback(
    (id: string, patch: Partial<NodeData>) =>
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))),
    [setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.filter((n) => n.id !== id));
      setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
      setSelectedId(null);
    },
    [setNodes, setEdges],
  );

  const copyNode = useCallback(
    (id: string) => {
      setNodes((ns) => {
        const src = ns.find((n) => n.id === id);
        if (!src) return ns;
        return ns.concat({
          ...src,
          id: nextId(),
          position: { x: src.position.x + 40, y: src.position.y + 40 },
          data: {
            ...(src.data as object),
            cpu: 12 + Math.random() * 10,
            memory: 18 + Math.random() * 12,
          },
        });
      });
      setSelectedId(null);
    },
    [setNodes],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  const openMenuAt = useCallback((event: React.MouseEvent, target: "node" | "edge", id: string) => {
    event.preventDefault();
    const bounds = wrapper.current?.getBoundingClientRect();
    setMenu({
      target,
      id,
      x: bounds ? event.clientX - bounds.left : event.clientX,
      y: bounds ? event.clientY - bounds.top : event.clientY,
    });
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => openMenuAt(event, "node", node.id),
    [openMenuAt],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => openMenuAt(event, "edge", edge.id),
    [openMenuAt],
  );

  const deleteEdge = useCallback(
    (id: string) => setEdges((es) => es.filter((e) => e.id !== id)),
    [setEdges],
  );

  const toggleSimulate = useCallback(() => {
    if (simulating) {
      setSimulating(false);
      return;
    }
    const missing = missingRequired(
      nodes.map((n) => ({ id: n.id, type: (n.data as unknown as NodeData).type })),
      edges.map((e) => ({ source: e.source, target: e.target })),
    );
    if (missing.length > 0) {
      toast.error("Can't run traffic simulation", {
        description: `Add ${missing.join(" and ")}`,
      });
      return;
    }
    setSimulating(true);
  }, [simulating, nodes, edges]);

  const monthlyCost = useMemo(
    () =>
      nodes.reduce((sum, n) => {
        const d = n.data as unknown as NodeData;
        return sum + d.cost * d.instances * 730;
      }, 0),
    [nodes],
  );

  const selected = useMemo(() => {
    const n = nodes.find((x) => x.id === selectedId);
    return n ? { id: n.id, data: n.data as unknown as NodeData } : null;
  }, [nodes, selectedId]);

  const exportJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      estimatedMonthlyCost: Number(monthlyCost.toFixed(2)),
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, ...(n.data as object) })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <ControlBar
        monthlyCost={monthlyCost}
        simulating={simulating}
        nodeCount={nodes.length}
        onToggleSimulate={toggleSimulate}
        onClear={() => {
          setNodes([]);
          setEdges([]);
          setSelectedId(null);
        }}
        onExport={exportJson}
      />

      <div className="flex min-h-0 flex-1">
        <PaletteSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onAdd={(kind) => addNode(kind)}
        />

        <div className="relative min-w-0 flex-1" ref={wrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onNodeClick={(_, node) => {
              setSelectedId(node.id);
              closeMenu();
            }}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneClick={() => {
              setSelectedId(null);
              closeMenu();
            }}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#44474F" />
            <Controls className="rounded-2xl overflow-hidden border border-border" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-3xl border border-border bg-surface-1/80 px-6 py-4 text-sm text-muted-foreground">
                Drag a component from the left panel onto the canvas to start designing.
              </p>
            </div>
          )}

          <ConfigDrawer
            node={selected}
            onChange={updateNode}
            onClose={() => setSelectedId(null)}
            onDelete={deleteNode}
          />

          {menu && (
            <>
              <div className="fixed inset-0 z-30" onPointerDown={closeMenu} />
              <div
                className="absolute z-40 w-44 overflow-hidden rounded-2xl border border-border bg-surface-2 py-1.5 shadow-[var(--shadow-elev)]"
                style={{ left: menu.x, top: menu.y }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {menu.target === "node" ? (
                  <>
                    <MenuItem
                      icon={Copy}
                      label="Copy node"
                      onClick={() => {
                        copyNode(menu.id);
                        closeMenu();
                      }}
                    />
                    <MenuItem
                      icon={Pencil}
                      label="Update"
                      onClick={() => {
                        setSelectedId(menu.id);
                        closeMenu();
                      }}
                    />
                    <MenuItem
                      icon={Trash2}
                      label="Delete node"
                      danger
                      onClick={() => {
                        deleteNode(menu.id);
                        closeMenu();
                      }}
                    />
                  </>
                ) : (
                  <MenuItem
                    icon={Trash2}
                    label="Unlink"
                    danger
                    onClick={() => {
                      deleteEdge(menu.id);
                      closeMenu();
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`m3-ripple flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm ${
        danger ? "text-destructive" : "text-foreground hover:bg-surface-3"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
