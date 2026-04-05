import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  SERVER_URL: "@voice_vision/server_url",
  GITHUB_USERNAME: "@voice_vision/github_username",
  GITHUB_REPO: "@voice_vision/github_repo",
};

export default function SettingsScreen() {
  const [serverUrl, setServerUrl] = useState("http://bore.pub:23868");
  const [githubUsername, setGithubUsername] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
        const savedUsername = await AsyncStorage.getItem(
          STORAGE_KEYS.GITHUB_USERNAME
        );
        const savedRepo = await AsyncStorage.getItem(STORAGE_KEYS.GITHUB_REPO);

        if (savedUrl) setServerUrl(savedUrl);
        if (savedUsername) setGithubUsername(savedUsername);
        if (savedRepo) setGithubRepo(savedRepo);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, serverUrl);
      await AsyncStorage.setItem(STORAGE_KEYS.GITHUB_USERNAME, githubUsername);
      await AsyncStorage.setItem(STORAGE_KEYS.GITHUB_REPO, githubRepo);
      Alert.alert("Success", "Settings saved successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const url = serverUrl.trim().replace(/\/$/, "");
    const fullUrl = `${url}/health`;

    console.log("Testing connection to:", fullUrl);
    Alert.alert("Testing...", fullUrl);

    try {
      const response = await fetch(fullUrl);
      const data = await response.json();
      console.log("Server response:", data);

      if (data.status === "ok") {
        Alert.alert("Success", "Connected to server successfully!");
      } else {
        Alert.alert("Error", `Unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      console.error("Connection error:", error.name, error.message);
      Alert.alert(
        "Connection Failed",
        `URL: ${fullUrl}\n\nError: ${error.name}: ${error.message}`
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-dark">
      <View className="p-6">
        {/* Server Configuration */}
        <View className="mb-8">
          <Text className="text-gray-400 text-sm uppercase tracking-wider mb-4">
            Server Configuration
          </Text>

          <View className="bg-gray-900 rounded-xl p-4">
            <Text className="text-gray-300 text-sm mb-2">Server URL</Text>
            <TextInput
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://100.64.211.231:3001"
              placeholderTextColor="#6b7280"
              className="bg-gray-800 text-white p-3 rounded-lg font-mono text-sm"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Pressable
              onPress={handleTestConnection}
              className="mt-3 flex-row items-center justify-center py-2 bg-gray-800 rounded-lg active:bg-gray-700"
            >
              <Ionicons name="pulse" size={18} color="#6366f1" />
              <Text className="text-primary ml-2">Test Connection</Text>
            </Pressable>
          </View>
        </View>

        {/* GitHub Configuration */}
        <View className="mb-8">
          <Text className="text-gray-400 text-sm uppercase tracking-wider mb-4">
            GitHub
          </Text>

          <View className="bg-gray-900 rounded-xl p-4">
            <Text className="text-gray-300 text-sm mb-2">Username</Text>
            <TextInput
              value={githubUsername}
              onChangeText={setGithubUsername}
              placeholder="your-github-username"
              placeholderTextColor="#6b7280"
              className="bg-gray-800 text-white p-3 rounded-lg text-sm"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text className="text-gray-500 text-xs mt-2">
              Used for displaying repository information
            </Text>

            <Text className="text-gray-300 text-sm mb-2 mt-4">Target Repository</Text>
            <TextInput
              value={githubRepo}
              onChangeText={setGithubRepo}
              placeholder="owner/repo-name"
              placeholderTextColor="#6b7280"
              className="bg-gray-800 text-white p-3 rounded-lg text-sm font-mono"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text className="text-gray-500 text-xs mt-2">
              PRs will be created in this repo. Leave empty to create new repos.
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View className="mb-8">
          <Text className="text-gray-400 text-sm uppercase tracking-wider mb-4">
            About
          </Text>

          <View className="bg-gray-900 rounded-xl p-4">
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Build" value="Development" />
          </View>
        </View>

        {/* API Keys Note */}
        <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8">
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle"
              size={20}
              color="#f59e0b"
              style={{ marginTop: 2 }}
            />
            <View className="ml-3 flex-1">
              <Text className="text-amber-500 font-medium">API Keys</Text>
              <Text className="text-amber-500/80 text-sm mt-1 leading-5">
                API keys (Deepgram, Anthropic, GitHub, v0) are configured on the
                server. Contact your admin if you need to update them.
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          className={`py-4 rounded-xl items-center ${
            isSaving ? "bg-gray-700" : "bg-primary active:bg-primary/80"
          }`}
        >
          <Text className="text-white font-semibold text-lg">
            {isSaving ? "Saving..." : "Save Settings"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-800 last:border-b-0">
      <Text className="text-gray-400">{label}</Text>
      <Text className="text-white">{value}</Text>
    </View>
  );
}
