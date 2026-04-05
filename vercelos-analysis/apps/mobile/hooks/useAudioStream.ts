import { useState, useCallback, useRef, useEffect } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

interface UseAudioStreamOptions {
  onAudioData?: (data: ArrayBuffer) => void;
  sampleRate?: number;
  channels?: number;
}

interface UseAudioStreamReturn {
  isRecording: boolean;
  hasPermission: boolean | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

// Helper to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useAudioStream(
  options: UseAudioStreamOptions = {}
): UseAudioStreamReturn {
  const { onAudioData, sampleRate = 16000, channels = 1 } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === "granted";
      setHasPermission(granted);

      if (!granted) {
        setError("Microphone permission denied");
      }

      return granted;
    } catch (err) {
      setError(`Permission error: ${(err as Error).message}`);
      return false;
    }
  }, []);

  // Check permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check permission
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      console.log("Starting recording...");

      // Use LOW_QUALITY preset - optimized for speech, smaller files, faster upload
      // Produces AAC audio which Deepgram handles well
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      console.log("Recording started");
    } catch (err) {
      console.error("Recording error:", err);
      setError(`Recording error: ${(err as Error).message}`);
      setIsRecording(false);
    }
  }, [hasPermission, requestPermission, sampleRate, channels]);

  // Stop recording and send audio
  const stopRecording = useCallback(async () => {
    try {
      console.log("Stopping recording...");

      if (!recordingRef.current) {
        console.log("No active recording");
        setIsRecording(false);
        return;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      console.log("Recording stopped, URI:", uri);

      recordingRef.current = null;
      setIsRecording(false);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Read and send the audio file
      if (onAudioData && uri) {
        try {
          console.log("Reading audio file from:", uri);
          const fileInfo = await FileSystem.getInfoAsync(uri);

          if (fileInfo.exists) {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log(`Read ${base64.length} base64 chars`);

            const arrayBuffer = base64ToArrayBuffer(base64);
            console.log(`Sending ${arrayBuffer.byteLength} bytes to server`);
            onAudioData(arrayBuffer);
          } else {
            console.error("Audio file does not exist");
          }
        } catch (readErr) {
          console.error("Error reading audio:", readErr);
          setError(`Audio read error: ${(readErr as Error).message}`);
        }
      }
    } catch (err) {
      console.error("Stop recording error:", err);
      setError(`Stop recording error: ${(err as Error).message}`);
      setIsRecording(false);
    }
  }, [onAudioData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  return {
    isRecording,
    hasPermission,
    error,
    startRecording,
    stopRecording,
    requestPermission,
  };
}
