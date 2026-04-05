import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

interface PreviewLinkProps {
  url: string;
  title?: string;
  type?: "pr" | "preview" | "repo";
}

export function PreviewLink({
  url,
  title,
  type = "preview",
}: PreviewLinkProps) {
  const handlePress = () => {
    Linking.openURL(url);
  };

  const getIcon = () => {
    switch (type) {
      case "pr":
        return "git-pull-request";
      case "repo":
        return "logo-github";
      default:
        return "eye";
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "pr":
        return "bg-primary/10 border-primary/20";
      case "repo":
        return "bg-gray-800 border-gray-700";
      default:
        return "bg-green-500/10 border-green-500/20";
    }
  };

  const getTextColor = () => {
    switch (type) {
      case "pr":
        return "text-primary";
      case "repo":
        return "text-gray-300";
      default:
        return "text-green-500";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "pr":
        return "#6366f1";
      case "repo":
        return "#9ca3af";
      default:
        return "#22c55e";
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(300)}>
      <Pressable
        onPress={handlePress}
        className={`border rounded-xl p-4 flex-row items-center ${getBackgroundColor()} active:opacity-70`}
      >
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            type === "preview" ? "bg-green-500/20" : "bg-gray-700"
          }`}
        >
          <Ionicons name={getIcon() as any} size={20} color={getIconColor()} />
        </View>

        <View className="flex-1 ml-3">
          <Text className={`font-medium ${getTextColor()}`} numberOfLines={1}>
            {title || getDefaultTitle(type)}
          </Text>
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {formatUrl(url)}
          </Text>
        </View>

        <Ionicons name="open-outline" size={18} color="#6b7280" />
      </Pressable>
    </Animated.View>
  );
}

function getDefaultTitle(type: string): string {
  switch (type) {
    case "pr":
      return "View Pull Request";
    case "repo":
      return "View Repository";
    default:
      return "Open Preview";
  }
}

function formatUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname;
  } catch {
    return url;
  }
}
