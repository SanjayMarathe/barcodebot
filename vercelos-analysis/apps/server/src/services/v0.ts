import type { V0GenerateRequest, V0GenerateResponse } from "../types/index.js";

const V0_API_BASE = "https://api.v0.dev/v1";

export class V0Service {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = V0_API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generateUI(request: V0GenerateRequest): Promise<V0GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: request.model || "v0-1.5-md",
        stream: false,
        context: request.context,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`v0 API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data as V0GenerateResponse;
  }

  async chat(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    model: string = "v0-1.5-md"
  ): Promise<V0GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        messages,
        model,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`v0 Chat API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data as V0GenerateResponse;
  }
}

// Fallback code generation using Claude if v0 is not available
export function generateFallbackCode(
  componentType: string,
  description: string,
  styling: string[] = []
): string {
  const stylingClasses = styling
    .map((s) => {
      if (s.includes("dark")) return "dark:bg-gray-800 dark:text-white";
      if (s.includes("rounded")) return "rounded-lg";
      if (s.includes("gradient"))
        return "bg-gradient-to-r from-purple-500 to-pink-500";
      return "";
    })
    .filter(Boolean)
    .join(" ");

  return `"use client";

import { useState } from "react";

interface ${componentType}Props {
  className?: string;
}

export function ${componentType}({ className = "" }: ${componentType}Props) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className={\`p-4 ${stylingClasses} \${className}\`}>
      {/* ${description} */}
      <button
        onClick={() => setIsActive(!isActive)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        {isActive ? "Active" : "Click Me"}
      </button>
    </div>
  );
}

export default ${componentType};
`;
}
