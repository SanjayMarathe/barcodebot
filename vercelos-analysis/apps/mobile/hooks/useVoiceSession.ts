import { useState, useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioStream } from "./useAudioStream";

const DEFAULT_SERVER_URL = "http://100.64.211.231:3001";
const STORAGE_KEY = "@voice_vision/server_url";
const REPO_STORAGE_KEY = "@voice_vision/github_repo";

export interface TranscriptEvent {
  text: string;
  is_final: boolean;
  confidence: number;
}

export interface Intent {
  type: string;
  description: string;
  componentType?: string;
  filePath?: string;
  styling?: string[];
  confidence: number;
}

export interface PipelineStatus {
  stage: string;
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
  transcript: string;
  interimTranscript: string;
  intent: Intent | null;
  generatedCode: GeneratedCode | null;
  prResult: PRResult | null;
  status: PipelineStatus;
  error: string | null;
}

interface UseVoiceSessionReturn {
  session: SessionState | null;
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  startSession: () => Promise<void>;
  stopRecording: () => Promise<void>;
  processSession: () => void;
  cancelSession: () => void;
  error: string | null;
}

export function useVoiceSession(): UseVoiceSessionReturn {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Handle audio data from recording
  const handleAudioData = useCallback((data: ArrayBuffer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("audio", data);
    }
  }, []);

  const {
    isRecording,
    startRecording,
    stopRecording,
    error: audioError,
  } = useAudioStream({
    onAudioData: handleAudioData,
  });

  // Initialize socket connection
  const initializeSocket = useCallback(async () => {
    // Always disconnect existing socket to use fresh URL
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // HARDCODED FOR TESTING - use bore tunnel
    const serverUrl = "http://bore.pub:23868";
    console.log("Connecting to server:", serverUrl);

    const socket = io(serverUrl, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError(`Connection error: ${err.message}`);
    });

    // Handle transcript events
    socket.on("transcript", (data: TranscriptEvent) => {
      setSession((prev) => {
        if (!prev) return prev;

        if (data.is_final) {
          return {
            ...prev,
            transcript: prev.transcript
              ? `${prev.transcript} ${data.text}`.trim()
              : data.text,
            interimTranscript: "",
          };
        } else {
          return {
            ...prev,
            interimTranscript: data.text,
          };
        }
      });
    });

    // Handle intent analysis
    socket.on("intent", (data: Intent) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              intent: data,
            }
          : prev
      );
    });

    // Handle status updates
    socket.on("status", (data: PipelineStatus) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: data,
            }
          : prev
      );
    });

    // Handle generated code
    socket.on("code_generated", (data: GeneratedCode) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              generatedCode: data,
            }
          : prev
      );
    });

    // Handle PR creation
    socket.on("pr_created", (data: PRResult) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              prResult: data,
            }
          : prev
      );
    });

    // Handle errors
    socket.on("error", (message: string) => {
      setError(message);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              error: message,
              status: { stage: "error", message },
            }
          : prev
      );
    });

    socketRef.current = socket;
  }, []);

  // Start a new voice session
  const startSession = useCallback(async () => {
    setError(null);

    // Initialize socket if needed
    await initializeSocket();

    // Wait for connection
    if (!socketRef.current?.connected) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        socketRef.current?.once("connect", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    // Initialize session state
    setSession({
      transcript: "",
      interimTranscript: "",
      intent: null,
      generatedCode: null,
      prResult: null,
      status: { stage: "idle", message: "Starting session..." },
      error: null,
    });

    // Get target repo from settings
    const targetRepo = await AsyncStorage.getItem(REPO_STORAGE_KEY);
    console.log("Target repo from settings:", targetRepo);

    // Tell server to start session with target repo
    socketRef.current?.emit("start_session", {
      targetRepo: targetRepo || null,
    });

    // Start recording
    await startRecording();
  }, [initializeSocket, startRecording]);

  // Stop recording and get transcript (but don't process yet)
  const handleStopRecording = useCallback(async () => {
    // Stop recording - this sends audio to server
    await stopRecording();

    // Update status
    setSession((prev) =>
      prev
        ? {
            ...prev,
            status: { stage: "transcribing", message: "Getting transcript..." },
          }
        : prev
    );

    // Small delay to ensure audio buffer is sent
    await new Promise(resolve => setTimeout(resolve, 500));

    // Tell server to transcribe (but not process pipeline yet)
    console.log("Sending get_transcript event");
    socketRef.current?.emit("get_transcript");
  }, [stopRecording]);

  // Process the session (run the pipeline)
  const processSession = useCallback(() => {
    setIsProcessing(true);
    console.log("Sending process_session event");
    socketRef.current?.emit("process_session");
  }, []);

  // Cancel and reset
  const cancelSession = useCallback(() => {
    setIsProcessing(false);
    setSession(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Combine errors
  useEffect(() => {
    if (audioError) {
      setError(audioError);
    }
  }, [audioError]);

  return {
    session,
    isConnected,
    isRecording,
    isProcessing,
    startSession,
    stopRecording: handleStopRecording,
    processSession,
    cancelSession,
    error,
  };
}
