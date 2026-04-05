import Anthropic from "@anthropic-ai/sdk";
import type { Intent } from "../types/index.js";

export interface SentinelFinding {
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  file?: string;
  line?: number;
}

export interface SentinelAgentResult {
  agentId: string;
  findings: SentinelFinding[];
  summary: string;
  score: number;
}

const SENTINEL_AGENTS = {
  security: {
    name: "Security Scanner",
    prompt: `You are a security expert analyzing code for vulnerabilities. Look for:
- SQL injection, XSS, CSRF vulnerabilities
- Hardcoded secrets, API keys, passwords
- Insecure authentication/authorization patterns
- Input validation issues
- Dependency vulnerabilities
- Insecure data storage
- Missing encryption

Respond with JSON: { "findings": [{ "severity": "critical"|"warning"|"info"|"success", "title": "string", "description": "string", "file": "optional path", "line": "optional number" }], "summary": "1-2 sentence summary", "score": 0-100 }`,
  },
  quality: {
    name: "Code Quality",
    prompt: `You are a code quality expert. Analyze for:
- Code duplication and DRY violations
- Complex functions that should be refactored
- Missing error handling
- Poor naming conventions
- Dead code or unused imports
- Inconsistent coding style
- Missing type annotations (for TS)

Respond with JSON: { "findings": [{ "severity": "critical"|"warning"|"info"|"success", "title": "string", "description": "string", "file": "optional path", "line": "optional number" }], "summary": "1-2 sentence summary", "score": 0-100 }`,
  },
  performance: {
    name: "Performance Analyzer",
    prompt: `You are a performance optimization expert. Look for:
- Memory leaks and inefficient memory usage
- N+1 query problems
- Missing caching opportunities
- Expensive operations in loops
- Unnecessary re-renders (React)
- Large bundle sizes
- Unoptimized assets

Respond with JSON: { "findings": [{ "severity": "critical"|"warning"|"info"|"success", "title": "string", "description": "string", "file": "optional path", "line": "optional number" }], "summary": "1-2 sentence summary", "score": 0-100 }`,
  },
  architecture: {
    name: "Architecture Reviewer",
    prompt: `You are a software architect. Evaluate:
- Separation of concerns
- Module dependencies and coupling
- Design pattern usage
- API design consistency
- Scalability concerns
- Testing architecture
- Folder structure organization

Respond with JSON: { "findings": [{ "severity": "critical"|"warning"|"info"|"success", "title": "string", "description": "string", "file": "optional path", "line": "optional number" }], "summary": "1-2 sentence summary", "score": 0-100 }`,
  },
  dependencies: {
    name: "Dependency Auditor",
    prompt: `You are a dependency management expert. Check for:
- Outdated packages
- Known vulnerabilities in dependencies
- Unnecessary dependencies
- Missing peer dependencies
- Version conflicts
- License compatibility issues
- Bundle size impact

Respond with JSON: { "findings": [{ "severity": "critical"|"warning"|"info"|"success", "title": "string", "description": "string", "file": "optional path", "line": "optional number" }], "summary": "1-2 sentence summary", "score": 0-100 }`,
  },
  docs: {
    name: "Documentation Checker",
    prompt: `You are a documentation expert. Evaluate:
- README completeness
- API documentation
- Code comments quality
- JSDoc/TSDoc coverage
- Setup instructions
- Contributing guidelines
- Changelog maintenance

Respond with JSON: { "findings": [{ "severity": "critical"|"warning"|"info"|"success", "title": "string", "description": "string", "file": "optional path", "line": "optional number" }], "summary": "1-2 sentence summary", "score": 0-100 }`,
  },
};

const SYSTEM_PROMPT = `You are an AI assistant that analyzes voice commands from developers to extract their intent for code generation.

Your task is to:
1. Identify the type of request (generate_ui, modify_code, create_project, or unknown)
2. Extract key details about what component or feature they want
3. Identify any styling preferences (dark mode, specific colors, Tailwind classes, etc.)
4. Determine the appropriate file path for the generated code

Respond ONLY with valid JSON in this exact format:
{
  "type": "generate_ui" | "modify_code" | "create_project" | "unknown",
  "description": "A clear, concise description of what to build",
  "componentType": "The type of component (e.g., 'Button', 'LoginForm', 'DarkModeToggle')",
  "filePath": "Suggested file path (e.g., 'src/components/DarkModeToggle.tsx')",
  "styling": ["Array of styling hints like 'dark mode', 'rounded corners', 'gradient background'"],
  "context": "Any additional context about the request",
  "confidence": 0.0 to 1.0
}

Examples:
- "Add a dark mode toggle to the header" -> generate_ui, DarkModeToggle
- "Create a login page with email and password" -> generate_ui, LoginForm
- "Make the button blue and add hover effects" -> modify_code, Button styling
- "Hello, how are you?" -> unknown, not a code request`;

export class ClaudeAgent {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeIntent(transcript: string): Promise<Intent> {
    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analyze this voice command and extract the developer's intent:\n\n"${transcript}"`,
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      // Parse JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse intent from response");
      }

      const intent = JSON.parse(jsonMatch[0]) as Intent;
      return intent;
    } catch (error) {
      console.error("Claude analysis error:", error);

      // Return unknown intent on error
      return {
        type: "unknown",
        description: transcript,
        confidence: 0,
      };
    }
  }

  async refinePrompt(intent: Intent): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Based on this intent, create a detailed prompt for v0 to generate the UI component:

Intent:
- Type: ${intent.type}
- Description: ${intent.description}
- Component Type: ${intent.componentType || "Not specified"}
- Styling: ${intent.styling?.join(", ") || "Default styling"}
- Context: ${intent.context || "None"}

Create a detailed, specific prompt that v0 can use to generate production-ready React code with Tailwind CSS. Include specific requirements for:
1. Component structure
2. Props and state
3. Styling with Tailwind classes
4. Accessibility considerations
5. Responsive design

Return only the prompt text, no explanations.`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return textContent.text;
  }

  async generateCodeChanges(
    userRequest: string,
    codebaseContent: string,
    intent: Intent
  ): Promise<{
    files: Array<{ path: string; content: string; action: "create" | "modify" }>;
    summary: string;
    explanation: string;
  }> {
    const systemPrompt = `You are an expert software engineer. Your task is to analyze an existing codebase and generate specific code changes based on the user's request.

IMPORTANT RULES:
1. You MUST understand the existing codebase structure, patterns, and conventions before making changes
2. Match the existing code style (indentation, naming conventions, patterns)
3. If modifying an existing file, include the COMPLETE new file content
4. If creating a new file, ensure it integrates properly with existing imports/exports
5. Consider where new components should be placed based on the existing folder structure
6. Use existing dependencies and patterns from the codebase
7. Make minimal, focused changes - don't refactor unrelated code

Respond with JSON only in this exact format:
{
  "files": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "complete file content here",
      "action": "create" | "modify"
    }
  ],
  "summary": "Brief description of changes for PR title",
  "explanation": "Detailed explanation of what was changed and why"
}`;

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `## User Request
"${userRequest}"

## Analyzed Intent
- Type: ${intent.type}
- Description: ${intent.description}
- Component Type: ${intent.componentType || "Not specified"}
- Styling hints: ${intent.styling?.join(", ") || "None"}

## Existing Codebase
${codebaseContent}

## Task
Based on the user's request and the existing codebase above, generate the necessary code changes. Make sure your changes integrate properly with the existing code structure and patterns.`,
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse code changes from response");
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        files: result.files || [],
        summary: result.summary || intent.description,
        explanation: result.explanation || "Code changes generated based on request",
      };
    } catch (error) {
      console.error("Code generation error:", error);
      throw error;
    }
  }

  async analyzeSentinel(
    agentId: string,
    repoContent: string
  ): Promise<SentinelAgentResult> {
    const agent = SENTINEL_AGENTS[agentId as keyof typeof SENTINEL_AGENTS];
    if (!agent) {
      throw new Error(`Unknown sentinel agent: ${agentId}`);
    }

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: agent.prompt,
        messages: [
          {
            role: "user",
            content: `Analyze this codebase:\n\n${repoContent}`,
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse sentinel response");
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        agentId,
        findings: result.findings || [],
        summary: result.summary || "Analysis complete",
        score: result.score || 50,
      };
    } catch (error) {
      console.error(`Sentinel ${agentId} error:`, error);
      return {
        agentId,
        findings: [
          {
            severity: "warning",
            title: "Analysis Error",
            description: `Failed to complete ${agent.name} analysis: ${(error as Error).message}`,
          },
        ],
        summary: "Analysis encountered an error",
        score: 0,
      };
    }
  }

  static getAgentIds(): string[] {
    return Object.keys(SENTINEL_AGENTS);
  }
}
