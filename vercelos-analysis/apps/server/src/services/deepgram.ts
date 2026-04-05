import {
  createClient,
  type DeepgramClient,
} from "@deepgram/sdk";
import { EventEmitter } from "events";
import type { TranscriptEvent } from "../types/index.js";

export class DeepgramService extends EventEmitter {
  private client: DeepgramClient;
  private audioChunks: Buffer[] = [];

  constructor(apiKey: string) {
    super();
    this.client = createClient(apiKey);
  }

  async connect(): Promise<void> {
    // For pre-recorded API, we just initialize - no persistent connection needed
    console.log("Deepgram service ready (pre-recorded mode)");
    this.audioChunks = [];
  }

  sendAudio(audioData: ArrayBuffer | Buffer): void {
    let buffer: Buffer;
    if (Buffer.isBuffer(audioData)) {
      buffer = audioData;
    } else {
      buffer = Buffer.from(new Uint8Array(audioData));
    }
    console.log(`[DEEPGRAM] Buffering ${buffer.byteLength} bytes`);
    this.audioChunks.push(buffer);
  }

  async transcribeBufferedAudio(): Promise<string> {
    if (this.audioChunks.length === 0) {
      console.log("[DEEPGRAM] No audio to transcribe");
      return "";
    }

    // Combine all audio chunks
    const audioBuffer = Buffer.concat(this.audioChunks);
    console.log(`[DEEPGRAM] Transcribing ${audioBuffer.byteLength} bytes of audio`);

    try {
      // Use pre-recorded API - it auto-detects format from file header
      const { result, error } = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: "nova-2",
          language: "en-US",
          smart_format: true,
          punctuate: true,
        }
      );

      if (error) {
        console.error("[DEEPGRAM] Transcription error:", error);
        this.emit("error", error);
        return "";
      }

      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

      console.log(`[DEEPGRAM] Transcript: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);

      if (transcript) {
        const event: TranscriptEvent = {
          text: transcript,
          is_final: true,
          confidence: confidence,
        };
        this.emit("transcript", event);
      }

      return transcript;
    } catch (err) {
      console.error("[DEEPGRAM] Transcription failed:", err);
      this.emit("error", err);
      return "";
    }
  }

  async close(): Promise<void> {
    // Transcribe any buffered audio before closing
    if (this.audioChunks.length > 0) {
      await this.transcribeBufferedAudio();
    }
    this.audioChunks = [];
    console.log("Deepgram service closed");
  }
}
