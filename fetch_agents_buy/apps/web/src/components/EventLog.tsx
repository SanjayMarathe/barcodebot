"use client";

import type { AgentEvent } from "@/lib/types";
import { EVENT_LABELS, AGENT_LABELS } from "@/lib/types";

interface EventLogProps {
  events: AgentEvent[];
  maxItems?: number;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

const EVENT_COLORS: Record<string, string> = {
  run_started: "text-blue-400",
  run_complete: "text-green-400",
  run_failed: "text-red-400",
  buy_done: "text-yellow-400",
  budget_approved: "text-emerald-400",
  session_created: "text-cyan-400",
  screenshot_saved: "text-purple-400",
};

export function EventLog({ events, maxItems = 100 }: EventLogProps) {
  const visible = events
    .filter((e) => e.event_type !== "ping")
    .slice(-maxItems);

  if (visible.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-8">
        Waiting for agent events...
      </div>
    );
  }

  return (
    <div className="space-y-1 font-mono text-xs">
      {visible.map((event, i) => (
        <div
          key={i}
          className="flex items-start gap-2 py-1 px-2 rounded hover:bg-zinc-800/50 transition-colors"
        >
          <span className="text-zinc-600 shrink-0 tabular-nums">
            {formatTime(event.timestamp)}
          </span>
          <span className="text-zinc-500 shrink-0 w-20 truncate" title={event.agent_name}>
            [{AGENT_LABELS[event.agent_name] || event.agent_name}]
          </span>
          <span className={`${EVENT_COLORS[event.event_type] || "text-zinc-300"}`}>
            {EVENT_LABELS[event.event_type] || event.event_type}
          </span>
          {event.event_type === "item_searched" && (
            <span className="text-zinc-500 truncate">
              — {String((event.payload as Record<string, unknown>).item_name || "")}
            </span>
          )}
          {event.event_type === "buy_done" && (
            <span className={(event.payload as Record<string, unknown>).status === "success" ? "text-green-400" : "text-red-400"}>
              — {String((event.payload as Record<string, unknown>).status || "")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
