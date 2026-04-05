import { View, Text, Pressable, SafeAreaView, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AudioWaveform } from "./AudioWaveform";
import { TranscriptDisplay } from "./TranscriptDisplay";
import { PRStatusCard } from "./PRStatusCard";
import type { SessionState } from "../hooks/useVoiceSession";

interface CallInterfaceProps {
  session: SessionState | null;
  isRecording: boolean;
  isProcessing: boolean;
  onStopRecording: () => void;
  onProcess: () => void;
  onCancel: () => void;
  isConnected: boolean;
}

export function CallInterface({
  session,
  isRecording,
  isProcessing,
  onStopRecording,
  onProcess,
  onCancel,
  isConnected,
}: CallInterfaceProps) {
  const [callDuration, setCallDuration] = useState(0);

  // Update call duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    if (!isConnected) return "#ef4444"; // red
    if (session?.status.stage === "error") return "#ef4444";
    if (session?.status.stage === "complete") return "#22c55e"; // green
    return "#6366f1"; // primary
  };

  return (
    <SafeAreaView className="flex-1 bg-darker">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row justify-between items-center">
            <View>
              <View className="flex-row items-center">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getStatusColor() }}
                />
                <Text className="text-gray-400 text-sm">
                  {isConnected ? "Connected" : "Connecting..."}
                </Text>
              </View>
              <View className="flex-row items-center mt-1">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: "#22c55e" }}
                />
                <Text className="text-gray-400 text-sm">
                  Vercel MCP server connected
                </Text>
              </View>
            </View>
            <Text className="text-gray-400 text-sm font-mono">
              {formatDuration(callDuration)}
            </Text>
          </View>
        </View>

        {/* Avatar & Waveform Section */}
        <View className="items-center py-8">
          {/* AI Avatar */}
          <View className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-purple-600 items-center justify-center mb-6 shadow-lg">
            <Ionicons name="sparkles" size={48} color="white" />
          </View>

          <Text className="text-white text-2xl font-semibold">v0 Assistant</Text>
          <Text className="text-gray-400 mt-1">
            {session?.status.message || "Listening..."}
          </Text>

          {/* Waveform */}
          <View className="mt-8 w-full px-8">
            <AudioWaveform isActive={isRecording} />
          </View>
        </View>

        {/* Transcript & Status Section */}
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Real-time Interim Transcript */}
          {session?.interimTranscript && !session?.transcript && (
            <View className="bg-gray-900/50 rounded-2xl p-4 mb-4 border border-gray-800">
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2" />
                <Text className="text-gray-400 text-xs uppercase tracking-wider">
                  Listening...
                </Text>
              </View>
              <Text className="text-gray-300 text-base italic">
                "{session.interimTranscript}"
              </Text>
            </View>
          )}

          {/* Final Transcript with Intent */}
          {session?.transcript && (
            <View className="mb-6">
              <TranscriptDisplay
                transcript={session.transcript}
                interimTranscript={session.interimTranscript}
                intent={session.intent}
              />
            </View>
          )}

          {/* PR Status Card */}
          {session?.status.stage &&
            session.status.stage !== "idle" &&
            session.status.stage !== "transcribing" && (
              <PRStatusCard
                status={session.status}
                prResult={session.prResult}
              />
            )}
        </ScrollView>

        {/* Action Buttons */}
        <View className="px-6 pb-8 pt-4">
          {isRecording ? (
            <View className="flex-row space-x-3">
              <Pressable
                onPress={onCancel}
                className="flex-1 py-4 rounded-2xl bg-gray-800 items-center justify-center flex-row active:bg-gray-700"
              >
                <Ionicons name="call" size={22} color="#ef4444" style={{ transform: [{ rotate: '135deg' }] }} />
              </Pressable>
              <Pressable
                onPress={onStopRecording}
                className="flex-[3] py-4 rounded-2xl bg-red-500 items-center justify-center flex-row active:bg-red-600"
              >
                <Ionicons name="stop" size={24} color="white" />
                <Text className="text-white text-lg font-semibold ml-2">
                  Stop Recording
                </Text>
              </Pressable>
            </View>
          ) : session?.transcript && !isProcessing ? (
            <>
              <Pressable
                onPress={onProcess}
                className="w-full py-4 rounded-2xl bg-primary items-center justify-center flex-row active:bg-primary/80 mb-3"
              >
                <Ionicons name="rocket" size={24} color="white" />
                <Text className="text-white text-lg font-semibold ml-2">
                  Generate PR
                </Text>
              </Pressable>
              <Pressable
                onPress={onCancel}
                className="w-full py-3 rounded-2xl bg-gray-800 items-center justify-center flex-row active:bg-gray-700"
              >
                <Ionicons name="call" size={20} color="#ef4444" style={{ transform: [{ rotate: '135deg' }], marginRight: 8 }} />
                <Text className="text-gray-300 text-base">Hang Up</Text>
              </Pressable>
            </>
          ) : isProcessing || session?.status.stage === "analyzing" || session?.status.stage === "generating" ? (
            <>
              <View className="py-4 items-center mb-3">
                <Text className="text-gray-400 text-base">
                  {session?.status.message || "Processing..."}
                </Text>
              </View>
              <Pressable
                onPress={onCancel}
                className="w-full py-3 rounded-2xl bg-gray-800 items-center justify-center flex-row active:bg-gray-700"
              >
                <Ionicons name="call" size={20} color="#ef4444" style={{ transform: [{ rotate: '135deg' }], marginRight: 8 }} />
                <Text className="text-gray-300 text-base">Hang Up</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={onCancel}
              className="w-full py-4 rounded-2xl bg-gray-800 items-center justify-center flex-row active:bg-gray-700"
            >
              <Ionicons name="call" size={22} color="#ef4444" style={{ transform: [{ rotate: '135deg' }], marginRight: 8 }} />
              <Text className="text-gray-300 text-base">Hang Up</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
