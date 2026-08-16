import {
  Boxes,
  Cpu,
  Database,
  GitBranch,
  HardDrive,
  Layers,
  Network,
  Radio,
  Server,
  Shuffle,
  Split,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ComponentKind = {
  type: string;
  label: string;
  icon: LucideIcon;
  category: string;
  strategyLabel: string;
  strategies: string[];
  cost: number;
  latency: number;
};

export const CATALOG: { category: string; items: ComponentKind[] }[] = [
  {
    category: "Traffic",
    items: [
      {
        type: "client",
        label: "Clients / Users",
        icon: Users,
        category: "Traffic",
        strategyLabel: "Source",
        strategies: ["Web", "Mobile", "API", "IoT"],
        cost: 0,
        latency: 0,
      },
    ],
  },
  {
    category: "Compute",
    items: [
      {
        type: "monolith",
        label: "Monolith",
        icon: Boxes,
        category: "Compute",
        strategyLabel: "Deployment",
        strategies: ["Blue / Green", "Rolling", "Canary"],
        cost: 0.42,
        latency: 40,
      },
      {
        type: "microservice",
        label: "Microservice Node",
        icon: Cpu,
        category: "Compute",
        strategyLabel: "Scaling",
        strategies: ["Horizontal Auto", "Fixed", "Spot Fleet"],
        cost: 0.18,
        latency: 12,
      },
      {
        type: "worker",
        label: "Stateless Worker",
        icon: Zap,
        category: "Compute",
        strategyLabel: "Concurrency",
        strategies: ["Burst", "Reserved", "Queue Driven"],
        cost: 0.09,
        latency: 8,
      },
      {
        type: "stateful",
        label: "Stateful Server",
        icon: Server,
        category: "Compute",
        strategyLabel: "Session",
        strategies: ["Sticky Session", "Shared Store"],
        cost: 0.31,
        latency: 18,
      },
    ],
  },
  {
    category: "Networking",
    items: [
      {
        type: "lb",
        label: "Load Balancer (L4/L7)",
        icon: Split,
        category: "Networking",
        strategyLabel: "Algorithm",
        strategies: ["Round Robin", "Least Connections", "IP Hash", "Weighted"],
        cost: 0.12,
        latency: 4,
      },
      {
        type: "gateway",
        label: "API Gateway",
        icon: Network,
        category: "Networking",
        strategyLabel: "Policy",
        strategies: ["Rate Limit", "JWT Auth", "Passthrough"],
        cost: 0.15,
        latency: 9,
      },
      {
        type: "proxy",
        label: "Reverse Proxy",
        icon: Shuffle,
        category: "Networking",
        strategyLabel: "Mode",
        strategies: ["Caching", "TLS Termination", "Streaming"],
        cost: 0.07,
        latency: 3,
      },
    ],
  },
  {
    category: "Database & Cache",
    items: [
      {
        type: "sql",
        label: "SQL Master",
        icon: Database,
        category: "Database & Cache",
        strategyLabel: "Consistency",
        strategies: ["Strong", "Read Committed", "Snapshot"],
        cost: 0.55,
        latency: 25,
      },
      {
        type: "replica",
        label: "Read Replica",
        icon: GitBranch,
        category: "Database & Cache",
        strategyLabel: "Replication",
        strategies: ["Async", "Semi-Sync", "Sync"],
        cost: 0.28,
        latency: 15,
      },
      {
        type: "redis",
        label: "Redis Cache",
        icon: HardDrive,
        category: "Database & Cache",
        strategyLabel: "Eviction",
        strategies: ["LRU", "LFU", "TTL", "Random"],
        cost: 0.2,
        latency: 2,
      },
      {
        type: "shard",
        label: "Sharded Cluster",
        icon: Layers,
        category: "Database & Cache",
        strategyLabel: "Sharding",
        strategies: ["Hash Range", "Directory", "Geo"],
        cost: 0.86,
        latency: 22,
      },
    ],
  },
  {
    category: "Queue",
    items: [
      {
        type: "queue",
        label: "Kafka / RabbitMQ Queue",
        icon: Radio,
        category: "Queue",
        strategyLabel: "Delivery",
        strategies: ["At Least Once", "Exactly Once", "At Most Once"],
        cost: 0.24,
        latency: 6,
      },
    ],
  },
];

export const KIND_BY_TYPE: Record<string, ComponentKind> = Object.fromEntries(
  CATALOG.flatMap((g) => g.items).map((i) => [i.type, i]),
);

// Edges with no explicit handle default to the node's first (top) handle,
// which is why template edges all left from the top. Pick the side that faces
// the peer so lines leave/enter the nearest edge instead.
export function edgeHandleKeys(
  source: { x: number; y: number },
  target: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const s = dx >= 0 ? "r" : "l";
    return { sourceHandle: s, targetHandle: s === "r" ? "l" : "r" };
  }
  const s = dy >= 0 ? "b" : "t";
  return { sourceHandle: s, targetHandle: s === "b" ? "t" : "b" };
}

// A system can't serve traffic without at least one compute node, one
// database (not cache), and a connected path between them. Caches, networking
// and queues are optional, so a Redis node alone doesn't satisfy storage.
export function missingRequired(
  nodes: { id: string; type: string }[],
  edges: { source: string; target: string }[],
): string[] {
  const kinds = nodes.map((n) => ({ ...n, kind: KIND_BY_TYPE[n.type] })).filter((n) => n.kind);
  const missing: string[] = [];
  if (!kinds.some((n) => n.kind.category === "Compute")) missing.push("a Compute node");
  const hasDb = kinds.some(
    (n) => n.kind.category === "Database & Cache" && n.kind.type !== "redis",
  );
  if (!hasDb) missing.push("a database");
  if (missing.length > 0) return missing;

  const adj = new Map<string, string[]>();
  for (const n of kinds) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }

  // Any compute node talking to any database is a working system, so flood
  // from every compute node and require at least one db to be reached.
  const seen = new Set<string>();
  const queue = kinds.filter((n) => n.kind.category === "Compute").map((n) => n.id);
  if (queue.length > 0) {
    seen.add(...queue);
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const next of adj.get(id) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
  }
  const dbReachable = kinds.some(
    (n) => n.kind.category === "Database & Cache" && n.kind.type !== "redis" && seen.has(n.id),
  );
  if (!dbReachable) missing.push("a connection between compute and database");
  return missing;
}

export type NodeData = {
  type: string;
  label: string;
  instances: number;
  strategy: string;
  cost: number;
  latency: number;
  liveLatency: number;
  cpu: number;
  memory: number;
  storage: number;
  users: number;
  liveUsers: number;
  tuning: number;
  status: "healthy" | "degraded" | "down";
  simulating: boolean;
};

export type NodeStatus = NodeData["status"];

// One tunable knob per node type (shown in the config drawer). `def` scales
// capacity 1:1 for most types; for caches (redis/proxy) the value is a TTL and
// controls how much demand is forwarded downstream (hit rate).
export type Tuning = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  def: number;
};

export const TUNING_BY_TYPE: Record<string, Tuning> = {
  monolith: { label: "Max connections", unit: "conn", min: 50, max: 10000, step: 50, def: 2000 },
  microservice: {
    label: "Concurrency limit",
    unit: "req",
    min: 10,
    max: 5000,
    step: 10,
    def: 1000,
  },
  worker: { label: "Worker parallelism", unit: "", min: 1, max: 100, step: 1, def: 20 },
  stateful: { label: "Session capacity", unit: "", min: 50, max: 5000, step: 50, def: 1000 },
  lb: { label: "Max connections", unit: "conn", min: 50, max: 50000, step: 50, def: 10000 },
  gateway: { label: "Rate limit", unit: "req/s", min: 50, max: 50000, step: 50, def: 10000 },
  proxy: { label: "Cache TTL", unit: "s", min: 1, max: 600, step: 5, def: 60 },
  sql: { label: "Connection pool", unit: "conn", min: 10, max: 1000, step: 10, def: 100 },
  replica: { label: "Replication lag", unit: "ms", min: 0, max: 1000, step: 10, def: 50 },
  redis: { label: "Cache TTL", unit: "s", min: 1, max: 600, step: 5, def: 60 },
  shard: { label: "Shard count", unit: "", min: 2, max: 64, step: 1, def: 8 },
  queue: { label: "Partitions", unit: "", min: 1, max: 64, step: 1, def: 6 },
};

export type EdgeData = {
  rps: number;
  response: number;
};

export function newEdgeData(): EdgeData {
  return { rps: 0, response: 0 };
}

// Rough per-instance headroom (concurrent users served before saturating).
// Load % = incoming demand / (capacity * instances). Traffic nodes have no
// capacity — they generate demand.
const CAPACITY_BY_TYPE: Record<string, number> = {
  monolith: 800,
  microservice: 400,
  worker: 300,
  stateful: 500,
  lb: 2000,
  gateway: 1500,
  proxy: 1800,
  sql: 700,
  replica: 1000,
  redis: 3000,
  shard: 900,
  queue: 1500,
  client: 0,
};

// Traffic enters at client nodes (their live user count) and flows downstream.
// Only networking nodes (LB/gateway/proxy) balance demand across their
// targets — weighted by remaining headroom, like least-connections. Everything
// else forwards its full demand onward; caches forward only misses. FIFO
// propagation forwards each node's current total once; a back-edge contributes
// but is not re-forwarded, so cycles can't compound.
// ponytail: single FIFO sweep, not a solver — forks/branches resolve, exotic
// topologies approximate. Proper flow simulation would be overkill here.
export function simulateTick(
  nodes: { id: string; type: string; data: NodeData }[],
  edges: { id: string; source: string; target: string }[],
): { nodePatches: Map<string, Partial<NodeData>>; edgePatches: Map<string, Partial<EdgeData>> } {
  const out = new Map<string, { id: string; source: string; target: string }[]>();
  for (const e of edges) {
    const list = out.get(e.source) ?? [];
    list.push(e);
    out.set(e.source, list);
  }
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Caches only forward misses downstream: longer TTL = more hits = less demand.
  const isCacheType = (type: string) => type === "redis" || type === "proxy";
  const isCache = (id: string) => isCacheType(nodeById.get(id)?.type ?? "");
  const isNetworking = (id: string) =>
    KIND_BY_TYPE[nodeById.get(id)?.type ?? ""]?.category === "Networking";

  // TTL knobs (cache types) don't add capacity — they change hit rate only.
  const capFor = (n: { type: string; data: NodeData }) => {
    const tuning = TUNING_BY_TYPE[n.type];
    const base = CAPACITY_BY_TYPE[n.type] ?? 500;
    let cap = base * Math.max(1, n.data.instances);
    if (tuning && !isCacheType(n.type)) cap *= (n.data.tuning || tuning.def) / tuning.def;
    return cap;
  };
  // Eviction strategy shapes the TTL's hit rate: LRU keeps hot keys alive
  // (fewer misses), Random evicts arbitrarily (more misses).
  const evictionMiss = { LRU: 0.6, LFU: 0.75, TTL: 1, Random: 1.4 };
  const missFactor = (n: { type: string; data: NodeData }) => {
    const tuning = TUNING_BY_TYPE[n.type];
    if (!tuning) return 1;
    const ttl = n.data.tuning || tuning.def;
    const base = Math.min(1, Math.max(0.05, 60 / ttl));
    const ev = evictionMiss[n.data.strategy as keyof typeof evictionMiss] ?? 1;
    return Math.min(1.4, base * ev);
  };

  const flow = new Map<string, { demand: number; done: boolean }>();
  const queue: string[] = [];
  for (const n of nodes) {
    if (KIND_BY_TYPE[n.type]?.category === "Traffic" && n.data.status !== "down") {
      flow.set(n.id, { demand: n.data.liveUsers, done: false });
      queue.push(n.id);
    }
  }

  const edgeFlow = new Map<string, number>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    const cur = flow.get(id);
    if (!cur || cur.done) continue;
    cur.done = true;
    const src = nodeById.get(id);
    const outs = out.get(id);
    if (!src || src.data.status === "down" || !outs?.length) continue;

    // Networking nodes balance across targets by their strategy; everything
    // else forwards its full demand onward. Unhealthy targets get no traffic.
    let shares: number[];
    const kind = KIND_BY_TYPE[src.type];
    const miss = isCache(id) ? missFactor(src) : 1;
    if (isNetworking(id)) {
      const weights = outs.map((e) => {
        const t = nodeById.get(e.target);
        if (!t || t.data.status === "down") return 0;
        const degrade = t.data.status === "degraded" ? 0.5 : 1;
        // Strategy-aware: least-connections uses headroom, Round Robin is even,
        // weighted/ip-hash spread by capacity.
        switch (src.data.strategy) {
          case "Least Connections":
            return Math.max(0.05, 1 - (t.data.cpu ?? 0) / 100) * capFor(t) * degrade;
          case "Weighted":
            return capFor(t) * degrade;
          case "IP Hash":
          case "Round Robin":
            return degrade;
          default:
            return Math.max(0.05, 1 - (t.data.cpu ?? 0) / 100) * capFor(t) * degrade;
        }
      });
      const total = weights.reduce((a, b) => a + b, 0) || 1;
      shares = weights.map((w, i) => (total === 0 ? 0 : cur.demand * (w / total)));
      // gateway rate-limit: carve demand at the limit
      if (kind?.type === "gateway" && src.data.strategy === "Rate Limit") {
        const limit = src.data.tuning || TUNING_BY_TYPE.gateway.def;
        const scale = Math.min(1, limit / (cur.demand || 1));
        shares = shares.map((s) => s * scale);
      }
    } else {
      shares = outs.map(() => cur.demand * miss);
    }

    for (let i = 0; i < outs.length; i++) {
      const e = outs[i];
      if (!shares[i]) continue;
      edgeFlow.set(e.id, shares[i]);
      let tgt = flow.get(e.target);
      if (!tgt) {
        tgt = { demand: 0, done: false };
        flow.set(e.target, tgt);
        queue.push(e.target);
      }
      tgt.demand += shares[i];
    }
  }

  const nodePatches = new Map<string, Partial<NodeData>>();
  for (const n of nodes) {
    const d = n.data;
    const kind = KIND_BY_TYPE[n.type];
    const isTraffic = kind?.category === "Traffic";
    const isQueue = kind?.category === "Queue";
    if (isTraffic) {
      nodePatches.set(n.id, {
        liveUsers: Math.max(
          0,
          Math.round(
            d.liveUsers + (d.users - d.liveUsers) * 0.4 + (Math.random() - 0.5) * d.users * 0.06,
          ),
        ),
      });
      continue;
    }
    // Auto-scaling: horizontal/burst strategies add instances when saturated,
    // drop them when idle. Interactive/manual deploy strategies hold count.
    const isCompute = kind?.category === "Compute";
    const autoScale =
      isCompute &&
      (d.strategy === "Horizontal Auto" || d.strategy === "Burst" || d.strategy === "Spot Fleet");
    const tend = (cur: number, target: number, k: number, j: number) =>
      Math.min(100, Math.max(0, cur + (target - cur) * k + (Math.random() - 0.5) * j));
    const loadPct = Math.min(120, ((flow.get(n.id)?.demand ?? 0) / capFor(n)) * 100);
    const instances = autoScale
      ? Math.max(1, Math.min(20, d.instances + (loadPct > 70 ? 1 : loadPct < 25 ? -1 : 0)))
      : d.instances;
    if (d.status !== "healthy") {
      // Unhealthy nodes stop serving: drain demand, escalate storage-freeze,
      // instances hold. Fully down nodes get full red state set in the UI.
      nodePatches.set(n.id, {
        instances,
        cpu: d.status === "down" ? 100 : Math.min(100, d.cpu + (Math.random() - 0.5) * 6),
        memory: d.status === "down" ? 100 : Math.min(100, d.memory + (Math.random() - 0.5) * 4),
        liveUsers: isQueue ? Math.round(tend(d.liveUsers, loadPct * 1.4, 0.15, 4)) : d.liveUsers,
        liveLatency: d.status === "down" ? Math.round(d.latency * 1.6) : d.liveLatency,
      });
      continue;
    }
    const nextCpu = tend(d.cpu, loadPct, 0.22, 4);
    nodePatches.set(n.id, {
      instances,
      cpu: nextCpu,
      memory: tend(d.memory, loadPct * 0.85, 0.16, 3),
      storage:
        kind?.category === "Database & Cache"
          ? Math.min(99, d.storage + (loadPct / 120) * 0.08 + (Math.random() - 0.5) * 0.06)
          : d.storage,
      liveUsers: isQueue ? Math.round(tend(d.liveUsers, loadPct * 1.4, 0.15, 4)) : d.liveUsers,
      liveLatency: Math.round(
        d.latency * (1 + nextCpu / 100) + (nextCpu > 90 ? Math.random() * 12 : Math.random() * 4),
      ),
    });
  }

  const edgePatches = new Map<string, Partial<EdgeData>>();
  for (const e of edges) {
    const rate = edgeFlow.get(e.id) ?? 0;
    edgePatches.set(e.id, { rps: Math.round(rate), response: Math.round(rate * 0.9) });
  }

  return { nodePatches, edgePatches };
}

// Each node type shows different live metrics: compute uses CPU/memory,
// databases use CPU/storage, and the client node counts users/traffic.
export type MeterKey = "cpu" | "memory" | "storage" | "users";
export type MeterDef = { key: MeterKey; label: string };

export function metersFor(kind: ComponentKind): MeterDef[] {
  if (kind.category === "Traffic") return [{ key: "users", label: "USERS" }];
  if (kind.category === "Database & Cache") {
    return [
      { key: "cpu", label: "CPU" },
      { key: "storage", label: "STORE" },
    ];
  }
  if (kind.category === "Queue")
    return [
      { key: "cpu", label: "CPU" },
      { key: "users", label: "BACKLOG" },
    ];
  return [
    { key: "cpu", label: "CPU" },
    { key: "memory", label: "MEM" },
  ];
}

export type ArchTemplateNode = {
  id: string;
  type: string;
  label?: string;
  instances?: number;
  position: { x: number; y: number };
};

export type ArchTemplate = {
  id: string;
  name: string;
  tagline: string;
  complexity: number;
  nodes: ArchTemplateNode[];
  edges: { source: string; target: string }[];
};

// Ordered from simplest to most complex. `nodes`/`edges` use symbolic ids
// (e.g. "lb", "db") resolved to real node ids when applied.
export const TEMPLATES: ArchTemplate[] = [
  {
    id: "single-server",
    name: "Single Server",
    tagline: "One app + one database. Start here.",
    complexity: 1,
    nodes: [
      { id: "client", type: "client", label: "Users", position: { x: -280, y: 100 } },
      { id: "app", type: "monolith", label: "App Server", position: { x: 0, y: 100 } },
      { id: "db", type: "sql", label: "Database", position: { x: 280, y: 100 } },
    ],
    edges: [
      { source: "client", target: "app" },
      { source: "app", target: "db" },
    ],
  },
  {
    id: "cache",
    name: "Monolith + Cache",
    tagline: "Read-heavy? Add Redis in front.",
    complexity: 2,
    nodes: [
      { id: "client", type: "client", label: "Users", position: { x: -280, y: 100 } },
      { id: "app", type: "monolith", label: "App Server", position: { x: 0, y: 100 } },
      { id: "cache", type: "redis", label: "Cache", position: { x: 280, y: 0 } },
      { id: "db", type: "sql", label: "Database", position: { x: 280, y: 200 } },
    ],
    edges: [
      { source: "client", target: "app" },
      { source: "app", target: "cache" },
      { source: "cache", target: "db" },
    ],
  },
  {
    id: "scaled-monolith",
    name: "Scaled Monolith",
    tagline: "Buying time: more instances behind a load balancer.",
    complexity: 3,
    nodes: [
      { id: "client", type: "client", label: "Users", position: { x: -280, y: 100 } },
      { id: "lb", type: "lb", label: "Load Balancer", position: { x: 0, y: 100 } },
      { id: "a", type: "monolith", label: "Instance A", position: { x: 300, y: 0 } },
      { id: "b", type: "monolith", label: "Instance B", position: { x: 300, y: 200 } },
      { id: "db", type: "sql", label: "Shared Database", position: { x: 600, y: 100 } },
    ],
    edges: [
      { source: "client", target: "lb" },
      { source: "lb", target: "a" },
      { source: "lb", target: "b" },
      { source: "a", target: "db" },
      { source: "b", target: "db" },
    ],
  },
  {
    id: "microservices",
    name: "Microservices",
    tagline: "Split domains + async work via a queue.",
    complexity: 4,
    nodes: [
      { id: "client", type: "client", label: "Users", position: { x: -280, y: 100 } },
      { id: "gateway", type: "gateway", label: "API Gateway", position: { x: 0, y: 100 } },
      { id: "a", type: "microservice", label: "Service A", position: { x: 300, y: 0 } },
      { id: "b", type: "microservice", label: "Service B", position: { x: 300, y: 200 } },
      { id: "queue", type: "queue", label: "Queue", position: { x: 600, y: 200 } },
      { id: "db", type: "sql", label: "Database", position: { x: 900, y: 0 } },
      { id: "worker", type: "worker", label: "Worker", position: { x: 900, y: 200 } },
    ],
    edges: [
      { source: "client", target: "gateway" },
      { source: "gateway", target: "a" },
      { source: "gateway", target: "b" },
      { source: "a", target: "db" },
      { source: "b", target: "queue" },
      { source: "queue", target: "worker" },
      { source: "worker", target: "db" },
    ],
  },
  {
    id: "distributed",
    name: "Fully Distributed",
    tagline: "Scale + reads + heavy writes across shards.",
    complexity: 5,
    nodes: [
      { id: "client", type: "client", label: "Users", position: { x: -280, y: 150 } },
      { id: "lb", type: "lb", label: "Load Balancer", position: { x: 0, y: 150 } },
      { id: "gateway", type: "gateway", label: "API Gateway", position: { x: 300, y: 150 } },
      { id: "a", type: "microservice", label: "Service A", position: { x: 600, y: 0 } },
      { id: "b", type: "microservice", label: "Service B", position: { x: 600, y: 300 } },
      { id: "cache", type: "redis", label: "Cache", position: { x: 900, y: 0 } },
      { id: "queue", type: "queue", label: "Queue", position: { x: 900, y: 300 } },
      { id: "sql", type: "sql", label: "Write Master", position: { x: 1200, y: 0 } },
      { id: "replica", type: "replica", label: "Read Replica", position: { x: 1200, y: 150 } },
      { id: "shard", type: "shard", label: "Shard Cluster", position: { x: 1200, y: 300 } },
      { id: "worker", type: "worker", label: "Worker", position: { x: 1500, y: 300 } },
    ],
    edges: [
      { source: "client", target: "lb" },
      { source: "lb", target: "gateway" },
      { source: "gateway", target: "a" },
      { source: "gateway", target: "b" },
      { source: "a", target: "cache" },
      { source: "a", target: "sql" },
      { source: "sql", target: "replica" },
      { source: "b", target: "queue" },
      { source: "queue", target: "worker" },
      { source: "worker", target: "shard" },
    ],
  },
];
