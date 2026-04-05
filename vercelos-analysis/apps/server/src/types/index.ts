// Voice-Vision Type Definitions

export interface TranscriptEvent {
  text: string;
  is_final: boolean;
  confidence: number;
  words?: Word[];
}

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Intent {
  type: "generate_ui" | "modify_code" | "create_project" | "unknown";
  description: string;
  componentType?: string;
  filePath?: string;
  styling?: string[];
  context?: string;
  confidence: number;
}

export interface PipelineStatus {
  stage:
    | "idle"
    | "recording"
    | "transcribing"
    | "ready"
    | "analyzing"
    | "generating"
    | "creating_repo"
    | "pushing"
    | "creating_pr"
    | "complete"
    | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface GeneratedCode {
  code: string;
  language: string;
  filePath: string;
  explanation?: string;
}

export interface PRResult {
  url: string;
  number: number;
  title: string;
  previewUrl?: string;
  repoUrl: string;
}

export interface SessionState {
  id: string;
  transcript: string;
  intent: Intent | null;
  generatedCode: GeneratedCode | null;
  prResult: PRResult | null;
  status: PipelineStatus;
  createdAt: Date;
  targetRepo?: string | null;
}

// Socket.io Events
export interface ServerToClientEvents {
  transcript: (data: TranscriptEvent) => void;
  intent: (data: Intent) => void;
  status: (data: PipelineStatus) => void;
  code_generated: (data: GeneratedCode) => void;
  pr_created: (data: PRResult) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  audio: (data: ArrayBuffer) => void;
  start_session: (config?: SessionConfig) => void;
  end_session: () => void;
}

export interface SessionConfig {
  language?: string;
  targetRepo?: string;
  projectName?: string;
}

// v0 API Types
export interface V0GenerateRequest {
  prompt: string;
  model?: "v0-1.5-md" | "v0-1.5-lg" | "v0-1.0-md";
  stream?: boolean;
  context?: string;
}

export interface V0GenerateResponse {
  code: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// GitHub Types
export interface GitHubRepoConfig {
  name: string;
  description?: string;
  private?: boolean;
}

export interface GitHubFileCommit {
  path: string;
  content: string;
}
