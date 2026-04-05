"use client";

import { AGENT_LABELS } from "@/lib/types";

interface AgentCardProps {
  name: string;
  status?: string;
  liveViewUrl?: string;
  sessionId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-zinc-700 text-zinc-400",
  running: "bg-blue-500/20 text-blue-400",
  searching: "bg-cyan-500/20 text-cyan-400",
  ranking: "bg-purple-500/20 text-purple-400",
  "adding to cart": "bg-yellow-500/20 text-yellow-400",
  success: "bg-green-500/20 text-green-400",
  done: "bg-green-500/20 text-green-400",
  approved: "bg-green-500/20 text-green-400",
  complete: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
};

const AGENT_ICONS: Record<string, string> = {
  orchestrator: "🎯",
  search: "🔍",
  ranker: "📊",
  treasury: "💰",
  buyer_a: "🛒",
  buyer_b: "🛒",
  buyer_c: "🛒",
  buyer_d: "🛒",
  buyer_e: "🛒",
};

const isActive = (status?: string) =>
  status &&
  !["idle", "done", "success", "approved", "complete", "failed", undefined].includes(status);

export function AgentCard({ name, status, liveViewUrl, sessionId }: AgentCardProps) {
  const label = AGENT_LABELS[name] || name;
  const icon = AGENT_ICONS[name] || "🤖";
  const colorClass = STATUS_COLORS[status || "idle"] || STATUS_COLORS.idle;
  const active = isActive(status);

  return (
    <div className={`rounded-lg border p-3 transition-all duration-300 ${active ? "border-blue-500/50 bg-zinc-800/80" : "border-zinc-700/50 bg-zinc-900/50"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold text-zinc-100">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {active && (
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 status-dot-active" />
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
            {status || "idle"}
          </span>
        </div>
      </div>

      {sessionId && (
        <p className="text-xs text-zinc-500 font-mono truncate">
          session: {sessionId.slice(0, 16)}...
        </p>
      )}

      {liveViewUrl && (
        <a
          href={liveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>↗</span> Live view
        </a>
      )}
    </div>
  );
}
