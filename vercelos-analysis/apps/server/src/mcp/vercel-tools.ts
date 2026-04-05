// Vercel MCP Tool Definitions
// These wrap the Vercel MCP server tools for use in the Voice Vision pipeline

import { z } from "zod";

// Tool Schemas
export const searchDocumentationSchema = z.object({
  topic: z.string().describe("Topic to search in Vercel documentation"),
  tokens: z
    .number()
    .optional()
    .default(2500)
    .describe("Maximum tokens to return"),
});

export const listTeamsSchema = z.object({});

export const listProjectsSchema = z.object({
  teamId: z.string().describe("Team ID or slug"),
});

export const getProjectSchema = z.object({
  projectId: z.string().describe("Project ID or slug"),
  teamId: z.string().describe("Team ID or slug"),
});

export const listDeploymentsSchema = z.object({
  projectId: z.string().describe("Project ID"),
  teamId: z.string().describe("Team ID"),
  since: z.number().optional().describe("Get deployments after this timestamp"),
  until: z
    .number()
    .optional()
    .describe("Get deployments before this timestamp"),
});

export const getDeploymentSchema = z.object({
  idOrUrl: z.string().describe("Deployment ID or URL"),
  teamId: z.string().describe("Team ID"),
});

export const getAccessToVercelUrlSchema = z.object({
  url: z.string().url().describe("Full URL of the Vercel deployment"),
});

export const deployToVercelSchema = z.object({});

// Tool Definitions for AI SDK integration
export const vercelTools = {
  search_documentation: {
    description: "Search Vercel documentation for specific topics",
    schema: searchDocumentationSchema,
  },
  list_teams: {
    description: "List all teams the authenticated user is a member of",
    schema: listTeamsSchema,
  },
  list_projects: {
    description: "List all Vercel projects for a team",
    schema: listProjectsSchema,
  },
  get_project: {
    description: "Get detailed information about a specific project",
    schema: getProjectSchema,
  },
  list_deployments: {
    description: "List deployments for a project",
    schema: listDeploymentsSchema,
  },
  get_deployment: {
    description: "Get detailed information about a specific deployment",
    schema: getDeploymentSchema,
  },
  get_access_to_vercel_url: {
    description: "Create a shareable link for a protected Vercel deployment",
    schema: getAccessToVercelUrlSchema,
  },
  deploy_to_vercel: {
    description: "Deploy the current project to Vercel",
    schema: deployToVercelSchema,
  },
};

export type VercelToolName = keyof typeof vercelTools;
