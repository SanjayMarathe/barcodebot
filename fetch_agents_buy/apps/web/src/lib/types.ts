// TypeScript types matching packages/shared_py/schemas.py

export interface ShoppingItem {
  name: string;
  max_price: number;
  quantity: number;
  search_query: string;
}

export interface SearchCandidate {
  title: string;
  price: number;
  rating?: number;
  review_count?: number;
  url: string;
  asin?: string;
  thumbnail?: string;
}

export interface BuyResult {
  item_name: string;
  status: "success" | "failed" | "skipped";
  final_price?: number;
  quantity: number;
  screenshot_url?: string;
  live_view_url?: string;
  session_id?: string;
  agent_name?: string;
  error?: string;
  completed_at?: string;
}

export interface AgentEvent {
  run_id: string;
  agent_name: string;
  event_type: string;
  timestamp: string;
  payload: Record<string, unknown>;
  // Client-side type flag (used for ping filtering)
  type?: string;
}

export interface RunStatus {
  run_id: string;
  instruction: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  items: ShoppingItem[];
  events: AgentEvent[];
  results: BuyResult[];
  total_budget: number;
  total_spent: number;
  created_at: string;
  updated_at?: string;
}

export interface BrowserSessionMeta {
  session_id: string;
  run_id: string;
  agent_name: string;
  live_view_url?: string;
  debugger_url?: string;
  status: string;
  created_at: string;
}

export interface ScreenshotMeta {
  id: number;
  run_id: string;
  item_name: string;
  file_url: string;
  timestamp: string;
}

export interface ModeConfig {
  treasury_mode: "mock" | "stripe";
  browser_mode: "browser_use" | "local";
  checkout_mode: "add_to_cart" | "checkout_ready";
}

export interface AgentInfo {
  name: string;
  address: string;
  port: number;
  role: string;
  status: string;
}

export interface AgentRegistry {
  agents: AgentInfo[];
  fastapi_url: string;
  updated_at: string;
}

export interface HealthResponse {
  status: string;
  db: string;
  agents_reachable: boolean;
  version: string;
  mode: ModeConfig;
}

export interface CreateRunResponse {
  run_id: string;
  status: string;
}

// Agent name to display label mapping
export const AGENT_LABELS: Record<string, string> = {
  orchestrator: "Orchestrator",
  search: "Search",
  ranker: "Ranker",
  treasury: "Treasury",
  buyer_a: "Buyer A",
  buyer_b: "Buyer B",
  buyer_c: "Buyer C",
  buyer_d: "Buyer D",
  buyer_e: "Buyer E",
};

// Event type to human-readable label
export const EVENT_LABELS: Record<string, string> = {
  run_started: "Run started",
  parsing_done: "Items parsed",
  search_started: "Searching Amazon",
  item_searched: "Item searched",
  search_complete: "Search complete",
  session_created: "Browser session opened",
  ranking_done: "Product ranked",
  ranking_failed: "Ranking failed",
  budget_request_received: "Budget request received",
  budget_approved: "Budget approved",
  buy_dispatched: "Buy task dispatched",
  buy_started: "Adding to cart",
  buy_done: "Cart action complete",
  screenshot_saved: "Screenshot captured",
  run_complete: "Run complete",
  run_failed: "Run failed",
  ping: "Keep-alive",
};
