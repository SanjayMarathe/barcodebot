import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Intent {
  type: string;
  description: string;
  componentType?: string;
  confidence: number;
}

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript?: string;
  intent: Intent | null;
}

export function TranscriptDisplay({
  transcript,
  interimTranscript,
  intent,
}: TranscriptDisplayProps) {
  return (
    <View className="bg-gray-900 rounded-2xl p-4">
      {/* Transcript Header */}
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center mr-2">
          <Ionicons name="mic" size={16} color="#6366f1" />
        </View>
        <Text className="text-gray-400 text-sm">Your voice command</Text>
      </View>

      {/* Transcript Text */}
      <Text className="text-white text-base leading-6 mb-4">
        "{transcript}
        {interimTranscript && (
          <Text className="text-gray-400 italic"> {interimTranscript}</Text>
        )}
        "
      </Text>

      {/* Intent Analysis */}
      {intent && intent.type !== "unknown" && (
        <View className="border-t border-gray-800 pt-4 mt-2">
          <View className="flex-row items-center mb-2">
            <Ionicons name="sparkles" size={16} color="#22c55e" />
            <Text className="text-gray-400 text-sm ml-2">
              Detected Intent
            </Text>
            <View className="ml-auto flex-row items-center">
              <Text className="text-gray-500 text-xs">
                {(intent.confidence * 100).toFixed(0)}% confident
              </Text>
            </View>
          </View>

          <View className="bg-gray-800 rounded-xl p-3 mt-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-primary text-sm font-medium uppercase">
                {intent.type.replace("_", " ")}
              </Text>
              {intent.componentType && (
                <View className="bg-primary/20 px-2 py-1 rounded">
                  <Text className="text-primary text-xs">
                    {intent.componentType}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-gray-300 text-sm leading-5">
              {intent.description}
            </Text>
          </View>
        </View>
      )}

      {/* Unknown Intent Warning */}
      {intent && intent.type === "unknown" && (
        <View className="border-t border-gray-800 pt-4 mt-2">
          <View className="flex-row items-center">
            <Ionicons name="warning" size={16} color="#f59e0b" />
            <Text className="text-amber-500 text-sm ml-2">
              Could not understand the request. Try being more specific.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
