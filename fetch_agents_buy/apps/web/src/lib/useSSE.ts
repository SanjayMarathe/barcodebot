"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent } from "./types";
import { getSSEUrl } from "./api";

export interface SSEState {
  events: AgentEvent[];
  connected: boolean;
  error: string | null;
}

/**
 * React hook that subscribes to the SSE event stream for a run.
 * Returns all events received so far, connection status, and any error.
 *
 * Usage:
 *   const { events, connected } = useSSE(runId)
 */
export function useSSE(runId: string | null): SSEState {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!runId) return;

    const url = getSSEUrl(runId);
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (e) => {
      try {
        const event: AgentEvent = JSON.parse(e.data);
        // Filter out keep-alive pings
        if (event.type === "ping" || event.event_type === "ping") return;
        setEvents((prev) => [...prev, event]);
      } catch {
        // Ignore parse errors for malformed messages
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError("SSE connection lost. Retrying...");
      es.close();
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };
  }, [runId]);

  useEffect(() => {
    if (!runId) {
      setEvents([]);
      setConnected(false);
      return;
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [runId, connect]);

  return { events, connected, error };
}

/**
 * Derive per-agent status from event stream.
 * Returns a map of agentName -> latest status label.
 */
export function useAgentStatuses(events: AgentEvent[]): Record<string, string> {
  const statuses: Record<string, string> = {};

  for (const event of events) {
    const agent = event.agent_name;
    switch (event.event_type) {
      case "run_started":
        statuses["orchestrator"] = "running";
        break;
      case "parsing_done":
        statuses["orchestrator"] = "parsed";
        break;
      case "search_started":
        statuses["search"] = "searching";
        break;
      case "session_created":
        statuses[agent] = "browsing";
        break;
      case "item_searched":
        statuses["search"] = "searching";
        break;
      case "search_complete":
        statuses["search"] = "done";
        break;
      case "ranking_started":
        statuses["ranker"] = "ranking";
        break;
      case "ranking_done":
        statuses["ranker"] = "done";
        break;
      case "budget_requested":
        statuses["treasury"] = "reviewing";
        break;
      case "budget_approved":
        statuses["treasury"] = "approved";
        break;
      case "buy_dispatched":
        statuses[agent] = "dispatched";
        break;
      case "buy_started":
        statuses[agent] = "buying";
        break;
      case "buy_done":
        statuses[agent] = (event.payload as { status?: string }).status === "success" ? "success" : "failed";
        break;
      case "run_complete":
        statuses["orchestrator"] = "complete";
        break;
      case "run_failed":
        statuses["orchestrator"] = "failed";
        break;
    }
  }

  return statuses;
}
