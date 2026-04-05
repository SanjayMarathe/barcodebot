import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AgentAnalysis {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: "idle" | "analyzing" | "complete" | "error";
  findings: Finding[];
  summary?: string;
}

interface Finding {
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  file?: string;
  line?: number;
}

const AGENTS: AgentAnalysis[] = [
  {
    id: "security",
    name: "Security Scanner",
    icon: "shield-checkmark",
    color: "#ef4444",
    status: "idle",
    findings: [],
  },
  {
    id: "quality",
    name: "Code Quality",
    icon: "code-slash",
    color: "#8b5cf6",
    status: "idle",
    findings: [],
  },
  {
    id: "performance",
    name: "Performance",
    icon: "speedometer",
    color: "#f59e0b",
    status: "idle",
    findings: [],
  },
  {
    id: "architecture",
    name: "Architecture",
    icon: "git-network",
    color: "#3b82f6",
    status: "idle",
    findings: [],
  },
  {
    id: "dependencies",
    name: "Dependencies",
    icon: "cube",
    color: "#10b981",
    status: "idle",
    findings: [],
  },
  {
    id: "docs",
    name: "Documentation",
    icon: "document-text",
    color: "#6366f1",
    status: "idle",
    findings: [],
  },
];

export default function SentinelScreen() {
  const [agents, setAgents] = useState<AgentAnalysis[]>(AGENTS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [repoName, setRepoName] = useState<string>("");
  const [overallScore, setOverallScore] = useState<number | null>(null);

  useEffect(() => {
    loadRepoName();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const loadRepoName = async () => {
    const repo = await AsyncStorage.getItem("@voice_vision/github_repo");
    if (repo) setRepoName(repo);
  };

  const connectAndAnalyze = async () => {
    if (!repoName) {
      alert("Please set a target repository in Settings first");
      return;
    }

    setIsAnalyzing(true);
    setAgents(AGENTS.map((a) => ({ ...a, status: "idle", findings: [] })));
    setOverallScore(null);

    const serverUrl = "http://bore.pub:23868";
    const newSocket = io(serverUrl, {
      transports: ["polling", "websocket"],
      forceNew: true,
    });

    newSocket.on("connect", () => {
      console.log("Connected for sentinel analysis");
      newSocket.emit("sentinel_analyze", { targetRepo: repoName });
    });

    newSocket.on("sentinel_agent_start", (data: { agentId: string }) => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === data.agentId ? { ...a, status: "analyzing" } : a
        )
      );
    });

    newSocket.on(
      "sentinel_agent_complete",
      (data: { agentId: string; findings: Finding[]; summary: string }) => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === data.agentId
              ? { ...a, status: "complete", findings: data.findings, summary: data.summary }
              : a
          )
        );
      }
    );

    newSocket.on(
      "sentinel_agent_error",
      (data: { agentId: string; error: string }) => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === data.agentId ? { ...a, status: "error" } : a
          )
        );
      }
    );

    newSocket.on("sentinel_complete", (data: { score: number }) => {
      setOverallScore(data.score);
      setIsAnalyzing(false);
    });

    newSocket.on("sentinel_error", (error: string) => {
      console.error("Sentinel error:", error);
      setIsAnalyzing(false);
    });

    setSocket(newSocket);
  };

  const getSeverityColor = (severity: Finding["severity"]) => {
    switch (severity) {
      case "critical":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      case "success":
        return "#10b981";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-4 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text className="text-white text-xl font-bold">Code Sentinel</Text>
          <View className="w-10" />
        </View>

        {/* Score Card */}
        {overallScore !== null && (
          <View className="mx-6 mb-4 p-4 rounded-2xl bg-gray-900 border border-gray-800">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-gray-400 text-sm">Health Score</Text>
                <Text className="text-white text-lg font-semibold mt-1">
                  {repoName}
                </Text>
              </View>
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: getScoreColor(overallScore) + "20" }}
              >
                <Text
                  className="text-3xl font-bold"
                  style={{ color: getScoreColor(overallScore) }}
                >
                  {overallScore}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Repo Info */}
        {!overallScore && (
          <View className="mx-6 mb-4 p-4 rounded-2xl bg-gray-900 border border-gray-800">
            <Text className="text-gray-400 text-sm">Target Repository</Text>
            <Text className="text-white text-lg font-mono mt-1">
              {repoName || "Not configured"}
            </Text>
          </View>
        )}

        {/* Agents Grid */}
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <Text className="text-gray-400 text-sm uppercase tracking-wider mb-4">
            Analysis Agents
          </Text>

          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} getSeverityColor={getSeverityColor} />
          ))}

          <View className="h-8" />
        </ScrollView>

        {/* Analyze Button */}
        <View className="px-6 pb-6 pt-4">
          <Pressable
            onPress={connectAndAnalyze}
            disabled={isAnalyzing || !repoName}
            className={`py-4 rounded-2xl items-center flex-row justify-center ${
              isAnalyzing || !repoName
                ? "bg-gray-700"
                : "bg-primary active:bg-primary/80"
            }`}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-semibold text-lg ml-3">
                  Analyzing...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="scan" size={24} color="white" />
                <Text className="text-white font-semibold text-lg ml-3">
                  Run Analysis
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function AgentCard({
  agent,
  getSeverityColor,
}: {
  agent: AgentAnalysis;
  getSeverityColor: (s: Finding["severity"]) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  const criticalCount = agent.findings.filter((f) => f.severity === "critical").length;
  const warningCount = agent.findings.filter((f) => f.severity === "warning").length;

  return (
    <Pressable
      onPress={() => agent.findings.length > 0 && setExpanded(!expanded)}
      className="mb-3 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden"
    >
      <View className="p-4 flex-row items-center">
        {/* Icon */}
        <View
          className="w-12 h-12 rounded-xl items-center justify-center"
          style={{ backgroundColor: agent.color + "20" }}
        >
          {agent.status === "analyzing" ? (
            <ActivityIndicator color={agent.color} size="small" />
          ) : (
            <Ionicons name={agent.icon as any} size={24} color={agent.color} />
          )}
        </View>

        {/* Info */}
        <View className="flex-1 ml-4">
          <Text className="text-white font-semibold">{agent.name}</Text>
          <Text className="text-gray-500 text-sm mt-0.5">
            {agent.status === "idle" && "Waiting..."}
            {agent.status === "analyzing" && "Analyzing..."}
            {agent.status === "complete" &&
              (agent.findings.length === 0
                ? "No issues found"
                : `${agent.findings.length} findings`)}
            {agent.status === "error" && "Analysis failed"}
          </Text>
        </View>

        {/* Badges */}
        {agent.status === "complete" && agent.findings.length > 0 && (
          <View className="flex-row items-center">
            {criticalCount > 0 && (
              <View className="bg-red-500/20 px-2 py-1 rounded-lg mr-2">
                <Text className="text-red-500 text-xs font-semibold">
                  {criticalCount}
                </Text>
              </View>
            )}
            {warningCount > 0 && (
              <View className="bg-amber-500/20 px-2 py-1 rounded-lg mr-2">
                <Text className="text-amber-500 text-xs font-semibold">
                  {warningCount}
                </Text>
              </View>
            )}
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6b7280"
            />
          </View>
        )}

        {/* Status indicator */}
        {agent.status === "complete" && agent.findings.length === 0 && (
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
        )}
      </View>

      {/* Expanded findings */}
      {expanded && agent.findings.length > 0 && (
        <View className="px-4 pb-4 border-t border-gray-800 pt-3">
          {agent.summary && (
            <Text className="text-gray-400 text-sm mb-3">{agent.summary}</Text>
          )}
          {agent.findings.map((finding, idx) => (
            <View
              key={idx}
              className="mb-2 p-3 rounded-xl bg-gray-800/50"
              style={{ borderLeftWidth: 3, borderLeftColor: getSeverityColor(finding.severity) }}
            >
              <Text className="text-white text-sm font-medium">
                {finding.title}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                {finding.description}
              </Text>
              {finding.file && (
                <Text className="text-gray-500 text-xs mt-1 font-mono">
                  {finding.file}
                  {finding.line && `:${finding.line}`}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}
