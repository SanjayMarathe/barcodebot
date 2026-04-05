import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { DeepgramService } from "./services/deepgram.js";
import { ClaudeAgent, type SentinelFinding } from "./services/claude-agent.js";
import { MCPOrchestrator } from "./services/mcp-orchestrator.js";
import type {
  SessionState,
  PipelineStatus,
} from "./types/index.js";

// Extended Socket.io event types
interface ServerToClientEvents {
  transcript: (data: { text: string; is_final: boolean; confidence: number }) => void;
  intent: (data: any) => void;
  status: (data: PipelineStatus) => void;
  code_generated: (data: any) => void;
  pr_created: (data: any) => void;
  error: (message: string) => void;
  sentinel_agent_start: (data: { agentId: string }) => void;
  sentinel_agent_complete: (data: { agentId: string; findings: SentinelFinding[]; summary: string }) => void;
  sentinel_agent_error: (data: { agentId: string; error: string }) => void;
  sentinel_complete: (data: { score: number }) => void;
  sentinel_error: (message: string) => void;
}

interface ClientToServerEvents {
  audio: (data: ArrayBuffer) => void;
  start_session: (config?: { targetRepo?: string }) => void;
  end_session: () => void;
  get_transcript: () => void;
  process_session: () => void;
  sentinel_analyze: (data: { targetRepo: string }) => void;
}

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS for Socket.io
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e8, // 100MB for audio chunks
  transports: ["polling", "websocket"],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Store active sessions
const sessions = new Map<string, SessionState>();

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  let deepgramService: DeepgramService | null = null;
  let claudeAgent: ClaudeAgent | null = null;
  let orchestrator: MCPOrchestrator | null = null;
  let accumulatedTranscript = "";

  // Initialize services
  const initializeServices = () => {
    // Initialize Deepgram
    deepgramService = new DeepgramService(process.env.DEEPGRAM_API_KEY!);

    // Initialize Claude Agent
    claudeAgent = new ClaudeAgent(process.env.ANTHROPIC_API_KEY!);

    // Initialize MCP Orchestrator
    orchestrator = new MCPOrchestrator({
      githubToken: process.env.GITHUB_TOKEN!,
      v0ApiKey: process.env.V0_API_KEY!,
      vercelToken: process.env.VERCEL_TOKEN,
    });
  };

  // Handle session start
  socket.on("start_session", async (config) => {
    console.log(`Starting session for ${socket.id}`, config);

    try {
      initializeServices();

      // Extract targetRepo from config
      const targetRepo = config?.targetRepo || null;
      console.log(`[SESSION] Target repo: ${targetRepo || "none (will create new)"}`);

      // Create session state
      const session: SessionState = {
        id: socket.id,
        transcript: "",
        intent: null,
        generatedCode: null,
        prResult: null,
        status: { stage: "idle", message: "Session started" },
        createdAt: new Date(),
        targetRepo: targetRepo,
      };
      sessions.set(socket.id, session);

      // Initialize Deepgram (pre-recorded mode - just buffers audio)
      await deepgramService!.connect();

      updateStatus(socket, {
        stage: "recording",
        message: "Recording... Tap to stop.",
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      socket.emit(
        "error",
        `Failed to start session: ${(error as Error).message}`
      );
    }
  });

  // Handle audio data
  let audioChunkCount = 0;
  let totalBytesReceived = 0;
  socket.on("audio", async (data: ArrayBuffer) => {
    audioChunkCount++;
    const byteLength = data.byteLength || 0;
    totalBytesReceived += byteLength;

    // Log every audio chunk for debugging
    console.log(`[AUDIO] Chunk #${audioChunkCount}: ${byteLength} bytes (total: ${totalBytesReceived} bytes)`);

    // Log first few bytes to verify WAV header
    if (audioChunkCount === 1 && byteLength > 0) {
      const arr = new Uint8Array(data);
      const header = Array.from(arr.slice(0, 12)).map(b => String.fromCharCode(b)).join('');
      console.log(`[AUDIO] First bytes (expecting RIFF...WAVE): "${header}"`);
    }

    if (deepgramService) {
      // Ensure we're sending as Buffer for Deepgram
      const buffer = Buffer.from(new Uint8Array(data));
      deepgramService.sendAudio(buffer);
    }
  });

  // Handle get_transcript - transcribe audio but don't process
  socket.on("get_transcript", async () => {
    console.log(`Getting transcript for ${socket.id}`);

    try {
      // Transcribe the buffered audio using pre-recorded API
      let transcript = "";
      if (deepgramService) {
        console.log("[DEEPGRAM] Transcribing buffered audio...");
        transcript = await deepgramService.transcribeBufferedAudio();
        accumulatedTranscript = transcript;
      }

      console.log(`[TRANSCRIPT] Final: "${transcript}"`);

      const session = sessions.get(socket.id);
      if (session) {
        session.transcript = transcript;
      }

      // Send transcript to client
      socket.emit("transcript", { text: transcript, is_final: true, confidence: 1 });

      updateStatus(socket, {
        stage: "ready",
        message: transcript ? "Ready to process" : "No speech detected",
      });
    } catch (error) {
      console.error("Transcription error:", error);
      socket.emit("error", `Transcription error: ${(error as Error).message}`);
    }
  });

  // Handle process_session - run the full pipeline
  socket.on("process_session", async () => {
    console.log(`Processing session for ${socket.id}`);

    try {
      const session = sessions.get(socket.id);
      if (!session || !accumulatedTranscript.trim()) {
        console.log("[ERROR] No transcript to process");
        socket.emit("error", "No transcript to process. Please speak clearly and try again.");
        return;
      }

      // Analyze intent with Claude
      console.log(`\n[TOOL CALL] Claude analyzeIntent`);
      console.log(`[INPUT] Transcript: "${accumulatedTranscript}"`);
      updateStatus(socket, {
        stage: "analyzing",
        message: "Analyzing your request...",
      });

      const intent = await claudeAgent!.analyzeIntent(accumulatedTranscript);
      console.log(`[TOOL RESULT] Intent:`, JSON.stringify(intent, null, 2));
      session.intent = intent;
      socket.emit("intent", intent);

      if (intent.type === "unknown" || intent.confidence < 0.5) {
        console.log(`[ERROR] Intent not understood or low confidence`);
        updateStatus(socket, {
          stage: "error",
          message: "Could not understand the request. Please try again.",
        });
        return;
      }

      // Run the pipeline
      console.log(`\n[PIPELINE] Starting code generation pipeline`);
      await runPipeline(socket, session, orchestrator!);
    } catch (error) {
      console.error("Pipeline error:", error);
      socket.emit("error", `Pipeline error: ${(error as Error).message}`);
      updateStatus(socket, {
        stage: "error",
        message: (error as Error).message,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    sessions.delete(socket.id);
    if (deepgramService) {
      deepgramService.close();
    }
  });

  // Handle Code Sentinel analysis
  socket.on("sentinel_analyze", async (data: { targetRepo: string }) => {
    console.log(`[SENTINEL] Starting analysis for ${data.targetRepo}`);

    try {
      const parts = data.targetRepo.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        socket.emit("sentinel_error", `Invalid repository format: "${data.targetRepo}". Expected "owner/repo"`);
        return;
      }

      const [owner, repo] = parts;

      // Create orchestrator to fetch repo contents
      const sentinelOrchestrator = new MCPOrchestrator({
        githubToken: process.env.GITHUB_TOKEN!,
        v0ApiKey: process.env.V0_API_KEY!,
        vercelToken: process.env.VERCEL_TOKEN,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Fetch repository contents
      console.log(`[SENTINEL] Fetching repository contents for ${owner}/${repo}`);
      const repoContent = await sentinelOrchestrator.getRepositoryContents(owner, repo);

      if (!repoContent.trim()) {
        socket.emit("sentinel_error", "Could not fetch repository contents");
        return;
      }

      console.log(`[SENTINEL] Fetched ${repoContent.length} chars of content`);

      // Create Claude agent for sentinel analysis
      const sentinelAgent = new ClaudeAgent(process.env.ANTHROPIC_API_KEY!);
      const agentIds = ClaudeAgent.getAgentIds();
      const scores: number[] = [];

      // Run each agent analysis
      for (const agentId of agentIds) {
        console.log(`[SENTINEL] Starting ${agentId} agent`);
        socket.emit("sentinel_agent_start", { agentId });

        try {
          const result = await sentinelAgent.analyzeSentinel(agentId, repoContent);
          scores.push(result.score);

          console.log(`[SENTINEL] ${agentId} complete: ${result.findings.length} findings, score: ${result.score}`);
          socket.emit("sentinel_agent_complete", {
            agentId: result.agentId,
            findings: result.findings,
            summary: result.summary,
          });
        } catch (error) {
          console.error(`[SENTINEL] ${agentId} error:`, error);
          socket.emit("sentinel_agent_error", {
            agentId,
            error: (error as Error).message,
          });
        }
      }

      // Calculate overall score (average of all agents)
      const overallScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      console.log(`[SENTINEL] Analysis complete. Overall score: ${overallScore}`);
      socket.emit("sentinel_complete", { score: overallScore });

    } catch (error) {
      console.error("[SENTINEL] Error:", error);
      socket.emit("sentinel_error", (error as Error).message);
    }
  });
});

// Run the Voice-to-PR pipeline
async function runPipeline(
  socket: ReturnType<typeof io.sockets.sockets.get>,
  session: SessionState,
  orchestrator: MCPOrchestrator
) {
  if (!socket) return;

  try {
    let owner: string;
    let repoName: string;
    let codebaseContent = "";
    let filesToPush: Array<{ path: string; content: string }> = [];
    let prSummary = session.intent!.description;
    let prExplanation = "";

    // Check if using existing repo or creating new one
    if (session.targetRepo) {
      // Parse targetRepo (format: "owner/repo")
      const parts = session.targetRepo.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`Invalid repository format: "${session.targetRepo}". Expected "owner/repo"`);
      }
      owner = parts[0];
      repoName = parts[1];
      console.log(`[REPO] Using existing repository: ${owner}/${repoName}`);

      // Step 1: Fetch existing codebase
      console.log(`\n[TOOL CALL] github.getRepositoryContents`);
      updateStatus(socket, {
        stage: "analyzing",
        message: "Reading existing codebase...",
      });

      codebaseContent = await orchestrator.getRepositoryContents(owner, repoName);
      console.log(`[TOOL RESULT] Fetched ${codebaseContent.length} chars of codebase`);

      if (!codebaseContent.trim()) {
        console.log("[WARNING] Empty codebase, will create new files");
      }

      // Step 2: Use Claude to generate contextual code changes
      console.log(`\n[TOOL CALL] claude.generateCodeChanges`);
      console.log(`[INPUT] Request: "${session.transcript}"`);
      updateStatus(socket, {
        stage: "generating",
        message: "Analyzing codebase and generating changes...",
      });

      const claudeAgent = new ClaudeAgent(process.env.ANTHROPIC_API_KEY!);
      const codeChanges = await claudeAgent.generateCodeChanges(
        session.transcript,
        codebaseContent,
        session.intent!
      );

      console.log(`[TOOL RESULT] Generated ${codeChanges.files.length} file changes`);
      for (const file of codeChanges.files) {
        console.log(`  - ${file.action}: ${file.path} (${file.content.length} chars)`);
      }

      filesToPush = codeChanges.files.map((f) => ({ path: f.path, content: f.content }));
      prSummary = codeChanges.summary;
      prExplanation = codeChanges.explanation;

      // Emit code generated event with first file
      if (codeChanges.files.length > 0) {
        const firstFile = codeChanges.files[0];
        session.generatedCode = {
          code: firstFile.content,
          language: "typescript",
          filePath: firstFile.path,
          explanation: codeChanges.explanation,
        };
        socket.emit("code_generated", session.generatedCode);
      }

      updateStatus(socket, {
        stage: "creating_repo",
        message: `Preparing changes for ${owner}/${repoName}...`,
      });

    } else {
      // Create new repository (fallback behavior for no target repo)
      console.log(`\n[TOOL CALL] github.createRepository`);
      repoName = `voice-vision-${Date.now()}`;
      console.log(`[INPUT] Name: ${repoName}`);
      updateStatus(socket, {
        stage: "creating_repo",
        message: "Creating GitHub repository...",
      });

      const repo = await orchestrator.createRepository({
        name: repoName,
        description: `Generated by VercelOS: ${session.intent!.description}`,
        private: true,
      });
      owner = repo.owner;
      console.log(`[TOOL RESULT] Created repo: ${owner}/${repoName}`);

      // For new repos, use v0/Claude to generate initial code
      console.log(`\n[TOOL CALL] Generating initial code for new repo`);
      updateStatus(socket, {
        stage: "generating",
        message: "Generating code...",
      });

      const generatedCode = await orchestrator.generateCode({
        prompt: session.intent!.description,
        componentType: session.intent!.componentType,
        styling: session.intent!.styling,
      });

      session.generatedCode = generatedCode;
      socket.emit("code_generated", generatedCode);

      // Push initial README to main branch
      console.log(`\n[TOOL CALL] github.pushFiles (README to main)`);
      updateStatus(socket, {
        stage: "pushing",
        message: "Setting up repository...",
      });

      await orchestrator.pushFiles({
        owner: owner,
        repo: repoName,
        branch: "main",
        message: "chore: initial commit",
        files: [
          {
            path: "README.md",
            content: `# ${repoName}\n\nGenerated by VercelOS\n`,
          },
        ],
      });

      filesToPush = [
        { path: generatedCode.filePath, content: generatedCode.code },
        {
          path: "package.json",
          content: JSON.stringify(
            {
              name: repoName,
              version: "1.0.0",
              dependencies: {
                react: "^19.0.0",
                "react-dom": "^19.0.0",
                tailwindcss: "^3.4.0",
              },
            },
            null,
            2
          ),
        },
      ];
    }

    // Create feature branch with unique name
    console.log(`\n[TOOL CALL] github.createBranch`);
    const branchName = session.targetRepo
      ? `feature/voice-generated-${Date.now()}`
      : "feature/voice-generated";
    console.log(`[INPUT] Branch: ${branchName}`);
    await orchestrator.createBranch({
      owner: owner,
      repo: repoName,
      branch: branchName,
      fromBranch: "main",
    });
    console.log(`[TOOL RESULT] Created branch: ${branchName}`);

    // Push code changes to feature branch
    if (filesToPush.length === 0) {
      throw new Error("No files to push. Code generation may have failed.");
    }

    console.log(`\n[TOOL CALL] github.pushFiles (code to feature branch)`);
    console.log(`[INPUT] Files: ${filesToPush.map((f) => f.path).join(", ")}`);
    updateStatus(socket, {
      stage: "pushing",
      message: `Pushing ${filesToPush.length} file(s)...`,
    });

    await orchestrator.pushFiles({
      owner: owner,
      repo: repoName,
      branch: branchName,
      message: `feat: ${prSummary}`,
      files: filesToPush,
    });
    console.log(`[TOOL RESULT] Pushed ${filesToPush.length} files to feature branch`);

    // Create Pull Request
    console.log(`\n[TOOL CALL] github.createPullRequest`);
    console.log(`[INPUT] Title: ${prSummary}`);
    updateStatus(socket, {
      stage: "creating_pr",
      message: "Creating pull request...",
    });

    const filesList = filesToPush.map((f) => `- \`${f.path}\``).join("\n");
    const prResult = await orchestrator.createPullRequest({
      owner: owner,
      repo: repoName,
      title: prSummary,
      body: `## VercelOS Generated PR

**Voice Command:** "${session.transcript}"

${prExplanation ? `### What Changed\n${prExplanation}\n` : ""}
### Files Changed
${filesList}

---
*Generated by [VercelOS](https://github.com/voice-vision) - Voice-to-PR with codebase context*`,
      head: branchName,
      base: "main",
    });
    console.log(`[TOOL RESULT] Created PR #${prResult.number}: ${prResult.url}`);

    session.prResult = prResult;
    socket.emit("pr_created", prResult);

    updateStatus(socket, {
      stage: "complete",
      message: "Pull request created successfully!",
      data: { prUrl: prResult.url, repoUrl: prResult.repoUrl },
    });
    console.log(`\n[PIPELINE COMPLETE] PR created successfully!`);
  } catch (error) {
    console.error("[PIPELINE ERROR]", error);
    throw error;
  }
}

function updateStatus(
  socket: ReturnType<typeof io.sockets.sockets.get>,
  status: PipelineStatus
) {
  if (socket) {
    socket.emit("status", status);
    const session = sessions.get(socket.id);
    if (session) {
      session.status = status;
    }
  }
}

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

httpServer.listen(Number(PORT), HOST, () => {
  console.log(`Voice Vision server running on http://${HOST}:${PORT}`);
  console.log(`WebSocket ready for connections`);
});
