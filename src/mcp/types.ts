/**
 * What an MCP server is on this wire.
 *
 * `GET /v1/tools/mcp/servers` answers a REGISTRATION and nothing more: an id, the
 * org's label, the endpoint the fleet dials, and whether a credential is sealed
 * for it. No version, no prose, no icon, no tool count — so the rest is derived
 * from routes that do answer it, or it is absent.
 *
 * The id is what makes the derivation possible: it PREFIXES every tool the
 * server contributes (`id + "_" + name`, cut on the first underscore at
 * dispatch), so a server's tools are the `GET /v1/tools` rows whose name starts
 * with it, and activation is addressed by those same full names.
 *
 * Prose and version belong to the CATALOG, not to a registration — a server the
 * org enabled from a listing names it, and `GET /v1/tools/catalog/{id}` carries
 * the publisher's words. A server whose URL somebody typed has neither, and says
 * so by their absence.
 */
import type { Tool } from '@hanzo/ai'

export interface McpServer {
  id: string
  name: string
  /** The JSON-RPC endpoint the fleet reaches it at. */
  url: string
  /** Whether a credential is sealed in KMS for it. Never the credential. */
  hasSecret: boolean
  /** The catalog entry it was enabled from, when it came from one. */
  listing?: string
  /** The publisher's summary, when a catalog entry names one. */
  description?: string
  /** The publisher's version, when a catalog entry names one. */
  version?: string
  /**
   * `connected`  the fleet reached it and at least one of its tools is activated.
   * `disabled`   it contributed tools and not one of them is activated.
   * `silent`     it contributed no tool at all — nothing answered tools/list.
   */
  status: 'connected' | 'disabled' | 'silent'
  /** Its tools, as `/v1/tools` names them — the prefixed, dispatchable names. */
  tools: Tool[]
  /** `tools.length`, for a caller rendering a count without the list. */
  toolsCount: number
}
