import { View, Text, Pressable, SafeAreaView, Image } from "react-native";
import { useState, useCallback } from "react";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CallInterface } from "../components/CallInterface";
import { useVoiceSession } from "../hooks/useVoiceSession";

export default function HomeScreen() {
  const [isInSession, setIsInSession] = useState(false);
  const {
    session,
    isRecording,
    isProcessing,
    startSession,
    stopRecording,
    processSession,
    cancelSession,
    isConnected,
  } = useVoiceSession();

  const handleStartCall = useCallback(async () => {
    setIsInSession(true);
    await startSession();
  }, [startSession]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  const handleProcess = useCallback(() => {
    processSession();
  }, [processSession]);

  const handleCancel = useCallback(() => {
    cancelSession();
    setIsInSession(false);
  }, [cancelSession]);

  if (isInSession) {
    return (
      <CallInterface
        session={session}
        isRecording={isRecording}
        isProcessing={isProcessing}
        onStopRecording={handleStopRecording}
        onProcess={handleProcess}
        onCancel={handleCancel}
        isConnected={isConnected}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <View className="flex-1 px-6 pt-8">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-12">
          <View>
            <Text className="text-white text-3xl font-bold">VercelOS</Text>
            <Text className="text-gray-400 text-base mt-1">
              Voice-to-PR Developer Tool
            </Text>
          </View>
          <View className="flex-row items-center">
            <Link href="/sentinel" asChild>
              <Pressable className="p-2 rounded-full bg-gray-800 mr-2">
                <Ionicons name="shield-checkmark" size={24} color="#6366f1" />
              </Pressable>
            </Link>
            <Link href="/settings" asChild>
              <Pressable className="p-2 rounded-full bg-gray-800">
                <Ionicons name="settings-outline" size={24} color="#9ca3af" />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Main Content */}
        <View className="flex-1 justify-center items-center">
          {/* Call Button */}
          <Pressable
            onPress={handleStartCall}
            className="w-32 h-32 rounded-full bg-primary items-center justify-center shadow-lg active:scale-95"
            style={{
              shadowColor: "#6366f1",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}
          >
            <Image
              source={require("../images/logo.png")}
              style={{ width: 64, height: 64 }}
              resizeMode="contain"
            />
          </Pressable>

          <Text className="text-white text-xl font-semibold mt-8">
            Tap to Start
          </Text>
          <Text className="text-gray-400 text-center mt-3 px-8 leading-6">
            Speak your feature request and I'll generate the code and create a
            PR for you
          </Text>
        </View>

        {/* Features List */}
        <View className="mb-8">
          <Text className="text-gray-500 text-sm uppercase tracking-wider mb-4">
            What I can do
          </Text>
          <View className="space-y-3">
            <FeatureItem
              icon="code-slash"
              text="Generate React components with Tailwind"
            />
            <FeatureItem
              icon="git-branch-outline"
              text="Create branches and push code"
            />
            <FeatureItem
              icon="git-pull-request-outline"
              text="Open pull requests automatically"
            />
            <FeatureItem
              icon="shield-checkmark"
              text="Analyze codebase with Code Sentinel"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center py-2">
      <View className="w-8 h-8 rounded-lg bg-gray-800 items-center justify-center mr-3">
        <Ionicons name={icon as any} size={18} color="#6366f1" />
      </View>
      <Text className="text-gray-300 flex-1">{text}</Text>
    </View>
  );
}
