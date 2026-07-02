/**
 * Types for the canonical Hanzo Cloud agents surface (`/v1/agents`), reached
 * through the chat backend proxy at `/api/agents/cloud`. These mirror cloud's
 * published response shapes (github.com/hanzoai/cloud, clients/agents/agents.go):
 * agentView, agentDetail, runView, RunResult.
 */

/** One cloud agent as returned by list/create (cloud's agentView). */
export type CloudAgent = {
  id: string;
  name: string;
  model: string;
  description?: string;
  tools: string[];
  status: string;
  runs: number;
  createdAt: string;
  updatedAt: string;
};

/** One recorded run of a cloud agent (cloud's runView / RunResult). */
export type CloudAgentRun = {
  id: string;
  status: string;
  model: string;
  input: string;
  output?: string;
  error?: string;
  durationMs: number;
  createdAt: string;
};

/** Full agent detail: the agent, its instructions, and recent runs. */
export type CloudAgentDetail = CloudAgent & {
  instructions: string;
  recentRuns: CloudAgentRun[];
};

/**
 * The list response from the chat proxy. `enabled` is false when cloud agents
 * are not configured for the deployment (empty agents, no error).
 */
export type CloudAgentsListResponse = {
  agents: CloudAgent[];
  enabled: boolean;
};

export type CloudAgentRunParams = {
  name: string;
  input: string;
};
