import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

interface PipelineStatus {
  stage: string;
  message: string;
  data?: Record<string, unknown>;
}

interface PRResult {
  url: string;
  number: number;
  title: string;
  previewUrl?: string;
  repoUrl: string;
}

interface PRStatusCardProps {
  status: PipelineStatus;
  prResult: PRResult | null;
}

const STAGES = [
  { key: "analyzing", label: "Analyzing", icon: "search" },
  { key: "generating", label: "Generating Code", icon: "code-slash" },
  { key: "creating_repo", label: "Creating Repo", icon: "folder" },
  { key: "pushing", label: "Pushing Code", icon: "cloud-upload" },
  { key: "creating_pr", label: "Creating PR", icon: "git-pull-request" },
  { key: "complete", label: "Complete", icon: "checkmark-circle" },
];

export function PRStatusCard({ status, prResult }: PRStatusCardProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.key === status.stage);
  const isError = status.stage === "error";
  const isComplete = status.stage === "complete";

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="bg-gray-900 rounded-2xl p-4 mb-4"
    >
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            isError
              ? "bg-red-500/20"
              : isComplete
                ? "bg-green-500/20"
                : "bg-primary/20"
          }`}
        >
          <Ionicons
            name={
              isError
                ? "close-circle"
                : isComplete
                  ? "checkmark-circle"
                  : "rocket"
            }
            size={24}
            color={isError ? "#ef4444" : isComplete ? "#22c55e" : "#6366f1"}
          />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-white font-semibold">
            {isError
              ? "Error"
              : isComplete
                ? "PR Created!"
                : "Processing..."}
          </Text>
          <Text className="text-gray-400 text-sm">{status.message}</Text>
        </View>
      </View>

      {/* Progress Steps */}
      {!isError && (
        <View className="mb-4">
          {STAGES.map((stage, index) => (
            <StepIndicator
              key={stage.key}
              label={stage.label}
              icon={stage.icon}
              status={
                index < currentStageIndex
                  ? "complete"
                  : index === currentStageIndex
                    ? "active"
                    : "pending"
              }
              isLast={index === STAGES.length - 1}
            />
          ))}
        </View>
      )}

      {/* PR Result */}
      {isComplete && prResult && (
        <View className="border-t border-gray-800 pt-4 mt-2">
          <Text className="text-gray-400 text-sm mb-3">Pull Request</Text>

          <Pressable
            onPress={() => Linking.openURL(prResult.url)}
            className="bg-gray-800 rounded-xl p-4 flex-row items-center active:bg-gray-700"
          >
            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
              <Ionicons
                name="git-pull-request"
                size={20}
                color="#6366f1"
              />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white font-medium" numberOfLines={1}>
                {prResult.title}
              </Text>
              <Text className="text-gray-400 text-sm">
                #{prResult.number} opened
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#9ca3af" />
          </Pressable>

          {/* Preview URL */}
          {prResult.previewUrl && (
            <Pressable
              onPress={() => Linking.openURL(prResult.previewUrl!)}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-3 flex-row items-center active:bg-green-500/20"
            >
              <Ionicons name="eye" size={20} color="#22c55e" />
              <Text className="text-green-500 font-medium ml-2 flex-1">
                View Preview
              </Text>
              <Ionicons name="open-outline" size={16} color="#22c55e" />
            </Pressable>
          )}

          {/* Repo Link */}
          <Pressable
            onPress={() => Linking.openURL(prResult.repoUrl)}
            className="flex-row items-center justify-center mt-4"
          >
            <Ionicons name="logo-github" size={16} color="#9ca3af" />
            <Text className="text-gray-400 text-sm ml-2">View Repository</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

interface StepIndicatorProps {
  label: string;
  icon: string;
  status: "pending" | "active" | "complete";
  isLast: boolean;
}

function StepIndicator({ label, icon, status, isLast }: StepIndicatorProps) {
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (status === "active") {
      pulseOpacity.value = withRepeat(
        withTiming(0.5, { duration: 800 }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [status, pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: status === "active" ? pulseOpacity.value : 1,
  }));

  const getIconColor = () => {
    switch (status) {
      case "complete":
        return "#22c55e";
      case "active":
        return "#6366f1";
      default:
        return "#4b5563";
    }
  };

  return (
    <View className="flex-row items-start">
      {/* Icon & Line */}
      <View className="items-center mr-3">
        <Animated.View
          style={animatedStyle}
          className={`w-8 h-8 rounded-full items-center justify-center ${
            status === "complete"
              ? "bg-green-500/20"
              : status === "active"
                ? "bg-primary/20"
                : "bg-gray-800"
          }`}
        >
          <Ionicons
            name={status === "complete" ? "checkmark" : (icon as any)}
            size={16}
            color={getIconColor()}
          />
        </Animated.View>
        {!isLast && (
          <View
            className={`w-0.5 h-4 ${
              status === "complete" ? "bg-green-500/50" : "bg-gray-700"
            }`}
          />
        )}
      </View>

      {/* Label */}
      <View className="flex-1 pb-4">
        <Text
          className={`${
            status === "complete"
              ? "text-green-500"
              : status === "active"
                ? "text-white"
                : "text-gray-500"
          } font-medium`}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
