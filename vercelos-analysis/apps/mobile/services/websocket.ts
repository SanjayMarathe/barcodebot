import { io, Socket } from "socket.io-client";

export interface SocketConfig {
  url: string;
  autoConnect?: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private url: string;

  constructor(config?: Partial<SocketConfig>) {
    this.url =
      config?.url ||
      process.env.EXPO_PUBLIC_SERVER_URL ||
      "http://100.64.211.231:3001";
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(this.url, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      console.log("[WebSocket] Connected to server");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("[WebSocket] Not connected, cannot emit:", event);
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    this.socket?.off(event, callback);
  }
}

// Singleton instance
export const websocketService = new WebSocketService();

export default WebSocketService;
