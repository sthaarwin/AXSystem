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
  simulating: boolean;
};
