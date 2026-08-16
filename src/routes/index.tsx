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
import { FlowEdge } from "@/components/canvas/FlowEdge";
import { PaletteSidebar } from "@/components/canvas/PaletteSidebar";
import {
  KIND_BY_TYPE,
  TUNING_BY_TYPE,
  edgeHandleKeys,
  missingRequired,
  newEdgeData,
  simulateTick,
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
const edgeTypes = { flow: FlowEdge };
const nextId = () => crypto.randomUUID();

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
      storage: kind.category === "Database & Cache" ? 20 + Math.random() * 15 : 0,
      users: kind.category === "Traffic" ? 100 + Math.random() * 400 : 0,
      liveUsers: kind.category === "Traffic" ? 100 + Math.random() * 400 : 0,
      tuning: TUNING_BY_TYPE[kind.type]?.def ?? 0,
      status: "healthy",
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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    target: "node" | "edge";
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const addNode = useCallback(
    (kind: ComponentKind, position?: { x: number; y: number }) => {
      const pos = position ?? { x: 220 + Math.random() * 240, y: 120 + Math.random() * 240 };
      setNodes((ns) => ns.concat(makeNode(kind, pos, simulating)));
    },
    [setNodes, simulating],
  );

  const applyTemplate = useCallback(
    (template: ArchTemplate) => {
      const idMap = new Map<string, string>();
      const posMap = new Map<string, { x: number; y: number }>();
      const newNodes = template.nodes.map((t) => {
        const kind = KIND_BY_TYPE[t.type];
        if (!kind) return null;
        const id = nextId();
        idMap.set(t.id, id);
        posMap.set(t.id, t.position);
        return {
          id,
          type: "arch",
          position: t.position,
          data: {
            type: kind.type,
            label: t.label ?? kind.label,
            instances: t.instances ?? 1,
            strategy: kind.strategies[0],
            cost: kind.cost,
            latency: kind.latency,
            liveLatency: kind.latency,
            cpu: 12 + Math.random() * 10,
            memory: 18 + Math.random() * 12,
            storage: kind.category === "Database & Cache" ? 20 + Math.random() * 15 : 0,
            users: kind.category === "Traffic" ? 100 + Math.random() * 400 : 0,
            liveUsers: kind.category === "Traffic" ? 100 + Math.random() * 400 : 0,
            tuning: TUNING_BY_TYPE[kind.type]?.def ?? 0,
            status: "healthy",
            simulating,
          } satisfies NodeData,
        } as Node;
      });
      const newEdges = template.edges
        .map((e) => {
          const source = idMap.get(e.source);
          const target = idMap.get(e.target);
          const sPos = posMap.get(e.source);
          const tPos = posMap.get(e.target);
          if (!source || !target || !sPos || !tPos) return null;
          const handles = edgeHandleKeys(sPos, tPos);
          return {
            id: nextId(),
            source,
            target,
            sourceHandle: handles.sourceHandle,
            targetHandle: handles.targetHandle,
          };
        })
        .filter(
          (
            e,
          ): e is {
            id: string;
            source: string;
            target: string;
            sourceHandle: string;
            targetHandle: string;
          } => !!e,
        )
        .map((e) => ({
          ...e,
          type: "flow",
          animated: true,
          data: newEdgeData(),
          style: { stroke: "var(--secondary)", strokeWidth: 2 },
        })) as Edge[];
      setSimulating(false);
      setNodes(newNodes.filter((n): n is Node => !!n));
      setEdges(newEdges);
      setSelectedId(null);
      setMenu(null);
    },
    [setNodes, setEdges, simulating],
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
      setEdges((es) => {
        const src = nodes.find((n) => n.id === params.source);
        const tgt = nodes.find((n) => n.id === params.target);
        const handles = src && tgt ? edgeHandleKeys(src.position, tgt.position) : null;
        return addEdge(
          {
            ...params,
            type: "flow",
            animated: true,
            sourceHandle: params.sourceHandle ?? handles?.sourceHandle,
            targetHandle: params.targetHandle ?? handles?.targetHandle,
            data: newEdgeData(),
            style: { stroke: "var(--secondary)", strokeWidth: 2 },
          },
          es,
        );
      }),
    [setEdges, nodes],
  );

  // Traffic simulation: live CPU / memory drift
  useEffect(() => {
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, simulating } })));
    if (!simulating) {
      const t = setTimeout(() => {
        setNodes((ns) =>
          ns.map((n) => {
            const kind = KIND_BY_TYPE[(n.data as unknown as NodeData).type];
            return {
              ...n,
              data: {
                ...(n.data as object),
                cpu: 12 + Math.random() * 10,
                memory: 18 + Math.random() * 12,
                storage: kind?.category === "Database & Cache" ? 20 + Math.random() * 15 : 0,
                users: kind?.category === "Traffic" ? 100 + Math.random() * 400 : 0,
                liveUsers: kind?.category === "Traffic" ? 100 + Math.random() * 400 : 0,
                liveLatency: n.data.latency,
              },
            };
          }),
        );
        setEdges((es) => es.map((e) => ({ ...e, data: { ...(e.data as object), rps: 0 } })));
      }, 200);
      return () => clearTimeout(t);
    }
    const interval = setInterval(() => {
      const { nodePatches, edgePatches } = simulateTick(
        nodesRef.current.map((n) => ({
          id: n.id,
          type: (n.data as unknown as NodeData).type,
          data: n.data as unknown as NodeData,
        })),
        edgesRef.current.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      );
      setNodes((ns) =>
        ns.map((n) => {
          const patch = nodePatches.get(n.id);
          return patch ? { ...n, data: { ...(n.data as object), ...patch } } : n;
        }),
      );
      setEdges((es) =>
        es.map((e) => {
          const patch = edgePatches.get(e.id);
          return patch ? { ...e, data: { ...(e.data as object), ...patch } } : e;
        }),
      );
    }, 600);
    return () => clearInterval(interval);
  }, [simulating, setNodes, setEdges]);

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

  const getStatus = (id: string): NodeData["status"] =>
    nodes.find((n) => n.id === id)?.data.status ?? "healthy";

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

  const selectedPath = useMemo(() => {
    if (!selectedEdgeId) return null;
    const e = edges.find((x) => x.id === selectedEdgeId);
    if (!e) return null;
    const latencyById = new Map(
      nodes.map((n) => [n.id, (n.data as unknown as NodeData).liveLatency]),
    );
    const adj = new Map<string, { to: string; id: string }[]>();
    for (const edge of edges) {
      for (const [f, t] of [
        [edge.source, edge.target],
        [edge.target, edge.source],
      ]) {
        const list = adj.get(f) ?? [];
        list.push({ to: t, id: edge.id });
        adj.set(f, list);
      }
    }
    const prev = new Map<string, { id: string; node: string }>();
    const seen = new Set<string>([e.source]);
    const queue = [e.source];
    while (queue.length && !seen.has(e.target)) {
      const cur = queue.shift()!;
      for (const { to, id } of adj.get(cur) ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        prev.set(to, { id, node: cur });
        queue.push(to);
      }
    }
    if (!seen.has(e.target)) return null;
    const pathIds: string[] = [];
    const pathNodes: string[] = [];
    let cur = e.target;
    while (cur !== e.source) {
      const p = prev.get(cur)!;
      pathIds.unshift(p.id);
      pathNodes.unshift(p.node);
      cur = p.node;
    }
    pathNodes.push(e.target);
    const ms = pathNodes.reduce((s, n) => s + (latencyById.get(n) ?? 0), 0);
    const hops = pathIds.length;
    return { hops, ms };
  }, [edges, nodes, selectedEdgeId]);

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

  const importArchitecture = async (file: File) => {
    try {
      const raw = await file.text();
      const json = JSON.parse(raw) as {
        nodes?: Array<{ id?: string; position?: { x?: number; y?: number }; data?: NodeData }>;
        edges?: Array<{ id?: string; source?: string; target?: string }>;
      };
      if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
        toast.error("Invalid file", { description: "Expected an exported architecture.json" });
        return;
      }
      const posMap = new Map<string, { x: number; y: number }>();
      const newNodes = (json.nodes ?? [])
        .filter((n) => n.data && TUNING_BY_TYPE[n.data.type])
        .map((n) => {
          const data = n.data as NodeData;
          const x = n.position?.x ?? 100 + Math.random() * 200;
          const y = n.position?.y ?? 100 + Math.random() * 200;
          posMap.set(n.id ?? "", { x, y });
          return {
            id: n.id ?? nextId(),
            type: "arch",
            position: { x, y },
            data: {
              ...data,
              liveLatency: data.latency ?? 0,
              liveUsers: data.users ?? 0,
              status: data.status ?? "healthy",
              simulating: false,
            } satisfies NodeData,
          } as Node;
        });
      const positions = newNodes.reduce<Record<string, { x: number; y: number }>>(
        (m, n) => ((m[n.id] = n.position), m),
        {},
      );
      const newEdges = (json.edges ?? [])
        .map((e) => {
          if (!e.source || !e.target) return null;
          const sPos = positions[e.source] ?? posMap.get(e.source ?? "");
          const tPos = positions[e.target] ?? posMap.get(e.target ?? "");
          const handles = sPos && tPos ? edgeHandleKeys(sPos, tPos) : undefined;
          return {
            id: e.id ?? nextId(),
            source: e.source,
            target: e.target,
            sourceHandle: handles?.sourceHandle,
            targetHandle: handles?.targetHandle,
            type: "flow",
            animated: true,
            data: newEdgeData(),
            style: { stroke: "var(--secondary)", strokeWidth: 2 },
          } as Edge;
        })
        .filter((e): e is Edge => !!e);
      setSimulating(false);
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedId(null);
      setMenu(null);
      toast.success(`Imported ${newNodes.length} nodes, ${newEdges.length} edges`);
    } catch {
      toast.error("Import failed", { description: "Could not parse architecture.json" });
    }
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
        onImport={importArchitecture}
      />

      <div className="flex min-h-0 flex-1">
        <PaletteSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onAdd={(kind) => addNode(kind)}
          onApplyTemplate={applyTemplate}
        />

        <div className="relative min-w-0 flex-1" ref={wrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
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
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              closeMenu();
            }}
            connectionMode="loose"
            onPaneClick={() => {
              setSelectedId(null);
              setSelectedEdgeId(null);
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

          {selectedPath && (
            <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-center shadow-[var(--shadow-elev)]">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Path latency
              </p>
              <p className="text-lg font-semibold text-foreground">
                {selectedPath.ms.toFixed(1)} ms
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {selectedPath.hops} hop{selectedPath.hops === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          )}

          {menu && (
            <>
              <div className="fixed inset-0 z-30" onPointerDown={closeMenu} />
              <div
                className="absolute z-40 w-48 overflow-hidden rounded-2xl border border-border bg-surface-2 py-1.5 shadow-[var(--shadow-elev)]"
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
                    <div className="my-1 h-px bg-border" />
                    <p className="px-4 pb-1 pt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Status
                    </p>
                    <StatusMenuItem
                      label="Healthy"
                      active={getStatus(menu.id) === "healthy"}
                      onClick={() => {
                        updateNode(menu.id, { status: "healthy" });
                        closeMenu();
                      }}
                    />
                    <StatusMenuItem
                      label="Degraded"
                      active={getStatus(menu.id) === "degraded"}
                      onClick={() => {
                        updateNode(menu.id, { status: "degraded" });
                        closeMenu();
                      }}
                    />
                    <StatusMenuItem
                      label="Down"
                      danger
                      active={getStatus(menu.id) === "down"}
                      onClick={() => {
                        updateNode(menu.id, { status: "down" });
                        closeMenu();
                      }}
                    />
                    <div className="my-1 h-px bg-border" />
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

function StatusMenuItem({
  label,
  danger,
  active,
  onClick,
}: {
  label: string;
  danger?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const dot = danger ? "bg-destructive" : label === "Degraded" ? "bg-secondary" : "bg-primary";
  return (
    <button
      onClick={onClick}
      className={`m3-ripple flex w-full items-center gap-2.5 px-4 py-1.5 text-left text-sm ${
        active ? "bg-surface-3" : "text-muted-foreground hover:bg-surface-3"
      }`}
    >
      <span className={`ml-0.5 h-2 w-2 rounded-full ${dot}`} />
      {label}
    </button>
  );
}
