"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AgentCard } from "@/components/AgentCard";
import { BrowserFrame } from "@/components/BrowserFrame";
import { EventLog } from "@/components/EventLog";
import { ResultSummary } from "@/components/ResultSummary";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { getRun, getRunScreenshots, getRunSessions } from "@/lib/api";
import { useSSE, useAgentStatuses } from "@/lib/useSSE";
import type { AgentEvent, BrowserSessionMeta, RunStatus, ScreenshotMeta } from "@/lib/types";

const AGENT_NAMES = ["orchestrator", "search", "ranker", "treasury", "buyer_a", "buyer_b", "buyer_c", "buyer_d", "buyer_e"];

function eventKey(e: AgentEvent): string {
  return `${e.agent_name}|${e.event_type}|${e.timestamp}`;
}

/** Persisted events from GET /runs/{id} plus live SSE (EventSource does not replay past events). */
function mergeRunEvents(fromDb: AgentEvent[] | undefined, fromSse: AgentEvent[]): AgentEvent[] {
  const db = fromDb ?? [];
  const seen = new Set(db.map(eventKey));
  const out = [...db];
  for (const e of fromSse) {
    if (!seen.has(eventKey(e))) {
      seen.add(eventKey(e));
      out.push(e);
    }
  }
  out.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return out;
}

export default function RunPage() {
  const { id: runId } = useParams<{ id: string }>();
  const router = useRouter();

  const [run, setRun] = useState<RunStatus | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotMeta[]>([]);
  const [sessions, setSessions] = useState<BrowserSessionMeta[]>([]);
  const [activeTab, setActiveTab] = useState<"agents" | "events" | "results" | "screenshots" | "browsers">("agents");

  const { events: sseEvents, connected } = useSSE(runId);

  const displayEvents = useMemo(
    () => mergeRunEvents(run?.events, sseEvents),
    [run?.events, sseEvents]
  );

  const agentStatuses = useAgentStatuses(displayEvents);

  // Fetch run state on mount and poll every 3s while the run is still active
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    const fetchRun = () => {
      getRun(runId)
        .then((r) => {
          if (cancelled) return;
          setRun(r);
          if (r.status === "completed" || r.status === "failed") {
            getRunScreenshots(runId).then((s) => !cancelled && setScreenshots(s));
            getRunSessions(runId).then((s) => !cancelled && setSessions(s));
          }
        })
        .catch(console.error);
    };

    fetchRun();
    const interval = setInterval(() => {
      if (run && (run.status === "completed" || run.status === "failed")) return;
      fetchRun();
    }, 3000);

    return () => { cancelled = true; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Live SSE tail only (avoid looping when mergeRunEvents + getRun refresh `run`)
  useEffect(() => {
    if (!runId || sseEvents.length === 0) return;
    const last = sseEvents[sseEvents.length - 1];

    if (last.event_type === "run_complete" || last.event_type === "run_failed") {
      getRun(runId).then(setRun);
      getRunScreenshots(runId).then(setScreenshots);
      getRunSessions(runId).then(setSessions);
    }
    if (last.event_type === "screenshot_saved") {
      getRunScreenshots(runId).then(setScreenshots);
    }
    if (last.event_type === "session_created") {
      getRunSessions(runId).then(setSessions);
    }
  }, [runId, sseEvents]);

  // Get live view URLs from events (faster than DB poll)
  const liveSessions: Record<string, { url: string; sessionId: string }> = {};
  for (const e of displayEvents) {
    if (e.event_type === "session_created") {
      const p = e.payload as { live_view_url?: string; session_id?: string };
      if (p.live_view_url && p.session_id) {
        liveSessions[e.agent_name] = { url: p.live_view_url, sessionId: p.session_id };
      }
    }
  }

  const isRunning = !displayEvents.some((e) => ["run_complete", "run_failed"].includes(e.event_type));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push("/")}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              ← New run
            </button>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-400 text-sm font-mono">{runId?.slice(0, 8)}...</span>
          </div>
          {run && (
            <p className="text-zinc-300 text-sm max-w-xl">{run.instruction}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {connected && isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 status-dot-active" />
              Live
            </span>
          )}
          {run && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              run.status === "completed" ? "bg-green-500/20 text-green-400" :
              run.status === "failed" ? "bg-red-500/20 text-red-400" :
              run.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
              "bg-zinc-700 text-zinc-400"
            }`}>
              {run.status}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800">
        {(["agents", "events", "results", "screenshots", "browsers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? "text-white border-b-2 border-blue-500 -mb-px"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab}
            {tab === "screenshots" && screenshots.length > 0 && (
              <span className="ml-1 text-xs bg-zinc-700 px-1.5 py-0.5 rounded-full">
                {screenshots.length}
              </span>
            )}
            {tab === "events" && displayEvents.length > 0 && (
              <span className="ml-1 text-xs bg-zinc-700 px-1.5 py-0.5 rounded-full">
                {displayEvents.filter((e) => e.event_type !== "ping").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {AGENT_NAMES.map((name) => (
              <AgentCard
                key={name}
                name={name}
                status={agentStatuses[name]}
                liveViewUrl={liveSessions[name]?.url}
                sessionId={liveSessions[name]?.sessionId}
              />
            ))}
          </div>

          {/* Live browser views inline */}
          {Object.keys(liveSessions).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">Live Browser Views</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(liveSessions).map(([agent, { url, sessionId }]) => (
                  <BrowserFrame
                    key={sessionId}
                    liveViewUrl={url}
                    agentName={agent}
                    title={`${agent} — ${sessionId.slice(0, 12)}...`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "events" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 max-h-96 overflow-y-auto">
          <EventLog events={displayEvents} />
        </div>
      )}

      {activeTab === "results" && run && (
        <ResultSummary
          results={run.results}
          totalBudget={run.total_budget}
          totalSpent={run.total_spent}
        />
      )}

      {activeTab === "screenshots" && (
        <ScreenshotGallery screenshots={screenshots} />
      )}

      {activeTab === "browsers" && (
        <div className="space-y-4">
          {Object.keys(liveSessions).length === 0 ? (
            <div className="text-zinc-500 text-sm text-center py-8">
              No active browser sessions
            </div>
          ) : (
            Object.entries(liveSessions).map(([agent, { url, sessionId }]) => (
              <BrowserFrame
                key={sessionId}
                liveViewUrl={url}
                agentName={agent}
                title={`${agent} — ${sessionId.slice(0, 12)}...`}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
