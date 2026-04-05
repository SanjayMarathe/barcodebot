// MCP Client for Vercel MCP Server
// Uses remote HTTP transport to connect to https://mcp.vercel.com

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

interface VercelMCPConfig {
  accessToken?: string;
  teamSlug?: string;
  projectSlug?: string;
}

export class VercelMCPClient {
  private client: Client;
  private connected: boolean = false;
  private config: VercelMCPConfig;

  constructor(config: VercelMCPConfig = {}) {
    this.config = config;
    this.client = new Client({
      name: "voice-vision",
      version: "1.0.0",
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    // Build URL based on config
    let url = "https://mcp.vercel.com";
    if (this.config.teamSlug && this.config.projectSlug) {
      url = `https://mcp.vercel.com/${this.config.teamSlug}/${this.config.projectSlug}`;
    }

    const transport = new StreamableHTTPClientTransport(new URL(url));

    await this.client.connect(transport);
    this.connected = true;
  }

  async searchDocumentation(
    topic: string,
    tokens: number = 2500
  ): Promise<string> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "search_documentation",
      arguments: { topic, tokens },
    });

    return JSON.stringify(result);
  }

  async listTeams(): Promise<unknown[]> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "list_teams",
      arguments: {},
    });

    return result.content as unknown[];
  }

  async listProjects(teamId: string): Promise<unknown[]> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "list_projects",
      arguments: { teamId },
    });

    return result.content as unknown[];
  }

  async getProject(projectId: string, teamId: string): Promise<unknown> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "get_project",
      arguments: { projectId, teamId },
    });

    return result.content;
  }

  async listDeployments(
    projectId: string,
    teamId: string
  ): Promise<unknown[]> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "list_deployments",
      arguments: { projectId, teamId },
    });

    return result.content as unknown[];
  }

  async getShareableLink(url: string): Promise<string> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "get_access_to_vercel_url",
      arguments: { url },
    });

    return JSON.stringify(result.content);
  }

  async deployToVercel(): Promise<unknown> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "deploy_to_vercel",
      arguments: {},
    });

    return result.content;
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
}

// Factory function to create MCP client
export function createVercelMCPClient(
  config?: VercelMCPConfig
): VercelMCPClient {
  return new VercelMCPClient(config);
}
