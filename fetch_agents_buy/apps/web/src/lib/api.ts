// Typed API client for the FastAPI backend.
// All calls go through Next.js rewrites (/api/* → http://localhost:8000/*).

import type {
  AgentRegistry,
  BrowserSessionMeta,
  CreateRunResponse,
  HealthResponse,
  ModeConfig,
  RunStatus,
  ScreenshotMeta,
  UpdateModesRequest,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function createRun(
  instruction: string,
  total_budget = 200.0
): Promise<CreateRunResponse> {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify({ instruction, total_budget }),
  });
}

export async function listRuns(limit = 20): Promise<unknown[]> {
  return request(`/tasks?limit=${limit}`);
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function getRun(runId: string): Promise<RunStatus> {
  return request(`/runs/${runId}`);
}

export async function getRunScreenshots(runId: string): Promise<ScreenshotMeta[]> {
  return request(`/runs/${runId}/screenshots`);
}

export async function getRunSessions(runId: string): Promise<BrowserSessionMeta[]> {
  return request(`/runs/${runId}/sessions`);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function listSessions(limit = 50): Promise<BrowserSessionMeta[]> {
  return request(`/sessions?limit=${limit}`);
}

// ---------------------------------------------------------------------------
// Health & registry
// ---------------------------------------------------------------------------

export async function getHealth(): Promise<HealthResponse> {
  return request("/health");
}

export async function getRegistry(): Promise<AgentRegistry> {
  return request("/registry");
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

export async function getModes(): Promise<ModeConfig> {
  return request("/modes");
}

export async function updateModes(modes: Partial<ModeConfig>): Promise<ModeConfig> {
  return request("/modes", {
    method: "PUT",
    body: JSON.stringify(modes),
  });
}

// ---------------------------------------------------------------------------
// SSE URL helper (used by useSSE hook)
// ---------------------------------------------------------------------------

export function getSSEUrl(runId: string): string {
  // SSE must connect directly to the FastAPI backend, not through the
  // Next.js rewrite proxy which buffers chunked/streaming responses.
  const backendOrigin =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`
      : "http://localhost:8000";
  return `${backendOrigin}/runs/${runId}/events`;
}
