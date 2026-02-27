/**
 * Hanzo Cloud Gateway API Endpoints
 *
 * Single source of truth for all API URLs.
 * The cloud gateway at api.hanzo.ai provides:
 *   - REST endpoints for CRUD (chats, messages, files, auth)
 *   - OpenAI/Anthropic-compatible LLM endpoints
 *   - ZAP WebSocket for streaming & MCP tools
 *
 * No backward compat, no adapter layers. One way to do everything.
 */
import type { AssistantsEndpoint } from './schemas';
import * as q from './types/queries';
import { ResourceType } from './accessPermissions';

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

/** Explicit API base URL (set via VITE_HANZO_API_URL env var or setApiBaseUrl()) */
let _explicitBaseUrl: string | undefined;

/**
 * Resolve the API base URL.
 * Priority: explicit > env var > <base> element > relative ''
 */
function resolveBaseUrl(): string {
  if (_explicitBaseUrl !== undefined) {
    return _explicitBaseUrl;
  }

  // Check Vite env var (available at build time)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_HANZO_API_URL) {
    return ((import.meta as any).env.VITE_HANZO_API_URL as string).replace(/\/$/, '');
  }

  // Fallback: <base> element or relative path
  if (
    typeof process === 'undefined' ||
    (process as typeof process & { browser?: boolean }).browser === true
  ) {
    const baseEl = document.querySelector('base');
    const href = baseEl?.getAttribute('href') || '/';
    return href.endsWith('/') ? href.slice(0, -1) : href;
  }

  return '';
}

let BASE_URL = resolveBaseUrl();

/** Runtime override for API base URL */
export function setApiBaseUrl(url: string) {
  _explicitBaseUrl = url.replace(/\/$/, '');
  BASE_URL = _explicitBaseUrl;
}

export const apiBaseUrl = () => BASE_URL;

/** ZAP WebSocket URL (derived from API base, or explicit) */
export function zapUrl(): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_HANZO_ZAP_URL) {
    return (import.meta as any).env.VITE_HANZO_ZAP_URL as string;
  }
  // Convert http(s):// to ws(s)://
  const base = BASE_URL || 'https://api.hanzo.ai';
  return base.replace(/^http/, 'ws') + '/zap';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildQuery = (params: Record<string, unknown>): string => {
  const query = Object.entries(params)
    .filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    })
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v) => `${key}=${encodeURIComponent(v)}`).join('&');
      }
      return `${key}=${encodeURIComponent(String(value))}`;
    })
    .join('&');
  return query ? `?${query}` : '';
};

// ---------------------------------------------------------------------------
// Health & System
// ---------------------------------------------------------------------------

export const health = () => `${BASE_URL}/api/health`;
export const systemInfo = () => `${BASE_URL}/api/get-system-info`;
export const versionInfo = () => `${BASE_URL}/api/get-version-info`;

// ---------------------------------------------------------------------------
// Auth (Hanzo IAM via Cloud Gateway)
// ---------------------------------------------------------------------------

/** Sign in via hanzo.id OAuth code exchange */
export const signin = (code: string, state: string) =>
  `${BASE_URL}/api/signin?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

/** Sign out */
export const signout = () => `${BASE_URL}/api/signout`;

/** Get current account (session-based) */
export const getAccount = () => `${BASE_URL}/api/get-account`;

// Legacy aliases for frontend compatibility
export const login = () => `${BASE_URL}/api/signin`;
export const logout = () => `${BASE_URL}/api/signout`;
export const register = () => `${BASE_URL}/api/signin`; // No separate registration — IAM handles it
export const refreshToken = (retry?: boolean) => `${BASE_URL}/api/get-account`;
export const user = () => `${BASE_URL}/api/get-account`;

// Auth page URLs (client-side navigation)
export const loginPage = () => `${BASE_URL}/login`;
export const registerPage = () => `${BASE_URL}/register`;

// Social login (handled by IAM redirect, not gateway)
export const loginFacebook = () => `${BASE_URL}/api/signin`;
export const loginGoogle = () => `${BASE_URL}/api/signin`;

// Email verification (handled by IAM)
export const verifyEmail = () => `${BASE_URL}/api/get-account`;
export const resendVerificationEmail = () => `${BASE_URL}/api/get-account`;
export const requestPasswordReset = () => `${BASE_URL}/api/get-account`;
export const resetPassword = () => `${BASE_URL}/api/get-account`;

// 2FA (handled by IAM directly)
export const enableTwoFactor = () => `${BASE_URL}/api/get-account`;
export const verifyTwoFactor = () => `${BASE_URL}/api/get-account`;
export const confirmTwoFactor = () => `${BASE_URL}/api/get-account`;
export const disableTwoFactor = () => `${BASE_URL}/api/get-account`;
export const regenerateBackupCodes = () => `${BASE_URL}/api/get-account`;
export const verifyTwoFactorTemp = () => `${BASE_URL}/api/get-account`;

// ---------------------------------------------------------------------------
// User & Balance
// ---------------------------------------------------------------------------

export const balance = () => `${BASE_URL}/api/get-usages`;
export const userPlugins = () => `${BASE_URL}/api/get-account`;
export const deleteUser = () => `${BASE_URL}/api/get-account`;

// ---------------------------------------------------------------------------
// Conversations (Chats)
// ---------------------------------------------------------------------------

export const conversationsRoot = `${BASE_URL}/api`;

export const conversations = (params: q.ConversationListParams) => {
  return `${BASE_URL}/api/get-chats${buildQuery(params)}`;
};

export const conversationById = (id: string) =>
  `${BASE_URL}/api/get-chat?id=${encodeURIComponent(id)}`;

export const genTitle = (conversationId: string) =>
  `${BASE_URL}/api/get-answer?provider=&question=${encodeURIComponent('Generate a short title for this conversation')}`;

export const updateConversation = () => `${BASE_URL}/api/update-chat`;

export const archiveConversation = () => `${BASE_URL}/api/update-chat`;

export const deleteConversation = () => `${BASE_URL}/api/delete-chat`;

export const deleteAllConversation = () => `${BASE_URL}/api/delete-chat`;

export const importConversation = () => `${BASE_URL}/api/add-chat`;

export const forkConversation = () => `${BASE_URL}/api/add-chat`;

export const duplicateConversation = () => `${BASE_URL}/api/add-chat`;

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const messagesRoot = `${BASE_URL}/api`;

export const messages = (params: q.MessagesListParams) => {
  const { conversationId, messageId, ...rest } = params;

  if (conversationId && messageId) {
    return `${BASE_URL}/api/get-message?id=${encodeURIComponent(messageId)}`;
  }

  if (conversationId) {
    return `${BASE_URL}/api/get-messages?chat=${encodeURIComponent(conversationId)}`;
  }

  return `${BASE_URL}/api/get-messages${buildQuery(rest)}`;
};

export const messagesArtifacts = (messageId: string) =>
  `${BASE_URL}/api/get-message?id=${encodeURIComponent(messageId)}`;

export const messagesBranch = () => `${BASE_URL}/api/add-message`;

// ---------------------------------------------------------------------------
// Shares
// ---------------------------------------------------------------------------

const shareRoot = `${BASE_URL}/api/share`;
export const shareMessages = (shareId: string) => `${shareRoot}/${shareId}`;
export const getSharedLink = (conversationId: string) => `${shareRoot}/link/${conversationId}`;
export const getSharedLinks = (
  pageSize: number,
  isPublic: boolean,
  sortBy: 'title' | 'createdAt',
  sortDirection: 'asc' | 'desc',
  search?: string,
  cursor?: string,
) =>
  `${shareRoot}?pageSize=${pageSize}&isPublic=${isPublic}&sortBy=${sortBy}&sortDirection=${sortDirection}${
    search ? `&search=${search}` : ''
  }${cursor ? `&cursor=${cursor}` : ''}`;
export const createSharedLink = (conversationId: string) => `${shareRoot}/${conversationId}`;
export const updateSharedLink = (shareId: string) => `${shareRoot}/${shareId}`;

// ---------------------------------------------------------------------------
// API Keys (pk- / sk- via LLM gateway)
// ---------------------------------------------------------------------------

const keysEndpoint = `${BASE_URL}/api/keys`;
export const keys = () => keysEndpoint;
export const userKeyQuery = (name: string) => `${keysEndpoint}?name=${name}`;
export const revokeUserKey = (name: string) => `${keysEndpoint}/${name}`;
export const revokeAllUserKeys = () => `${keysEndpoint}?all=true`;

const apiKeysEndpoint = `${BASE_URL}/api/api-keys`;
export const apiKeys = () => apiKeysEndpoint;
export const apiKeyById = (id: string) => `${apiKeysEndpoint}/${id}`;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const search = (q: string, cursor?: string | null) =>
  `${BASE_URL}/api/get-global-chats?field=messages&value=${encodeURIComponent(q)}${cursor ? `&cursor=${cursor}` : ''}`;

export const searchEnabled = () => `${BASE_URL}/api/health`;

// ---------------------------------------------------------------------------
// Presets & Config
// ---------------------------------------------------------------------------

export const presets = () => `${BASE_URL}/api/presets`;
export const deletePreset = () => `${BASE_URL}/api/presets/delete`;
export const plugins = () => `${BASE_URL}/api/get-providers`;
export const config = () => `${BASE_URL}/api/get-account`;
export const aiEndpoints = () => `${BASE_URL}/api/get-providers`;

// ---------------------------------------------------------------------------
// Models (OpenAI-compatible, pk- key accessible)
// ---------------------------------------------------------------------------

export const models = () => `${BASE_URL}/api/models`;

export const tokenizer = () => `${BASE_URL}/api/tokenizer`;

// ---------------------------------------------------------------------------
// LLM Completions (OpenAI + Anthropic compatible)
// ---------------------------------------------------------------------------

export const chatCompletions = () => `${BASE_URL}/api/chat/completions`;
export const anthropicMessages = () => `${BASE_URL}/api/messages`;

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export const providers = () => `${BASE_URL}/api/get-providers`;
export const provider = (id: string) => `${BASE_URL}/api/get-provider?id=${encodeURIComponent(id)}`;

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export const files = () => `${BASE_URL}/api/get-files`;
export const fileUpload = () => `${BASE_URL}/api/upload-file`;
export const fileDelete = () => `${BASE_URL}/api/delete-file`;
export const fileDownload = (userId: string, fileId: string) =>
  `${BASE_URL}/api/get-file?id=${encodeURIComponent(fileId)}`;
export const fileConfig = () => `${BASE_URL}/api/get-files`;
export const agentFiles = (agentId: string) =>
  `${BASE_URL}/api/get-files?agent=${encodeURIComponent(agentId)}`;

export const images = () => `${BASE_URL}/api/get-files`;
export const avatar = () => `${BASE_URL}/api/upload-file`;

// ---------------------------------------------------------------------------
// Speech (TTS / STT)
// ---------------------------------------------------------------------------

export const speech = () => `${BASE_URL}/api`;
export const speechToText = () => `${BASE_URL}/api/process-speech-to-text`;
export const textToSpeech = () => `${BASE_URL}/api/generate-text-to-speech-audio`;
export const textToSpeechManual = () => `${BASE_URL}/api/generate-text-to-speech-audio`;
export const textToSpeechVoices = () => `${BASE_URL}/api/generate-text-to-speech-audio`;
export const getCustomConfigSpeech = () => `${BASE_URL}/api/get-providers`;

// ---------------------------------------------------------------------------
// Assistants & Agents
// ---------------------------------------------------------------------------

export const assistants = ({
  path = '',
  options,
  version,
  endpoint,
  isAvatar,
}: {
  path?: string;
  options?: object;
  endpoint?: AssistantsEndpoint;
  version: number | string;
  isAvatar?: boolean;
}) => {
  let url = isAvatar === true ? `${images()}/assistants` : `${BASE_URL}/api/assistants/v${version}`;
  if (path && path !== '') {
    url += `/${path}`;
  }
  if (endpoint) {
    options = { ...(options ?? {}), endpoint };
  }
  if (options && Object.keys(options).length > 0) {
    const queryParams = new URLSearchParams(options as Record<string, string>).toString();
    url += `?${queryParams}`;
  }
  return url;
};

export const agents = ({ path = '', options }: { path?: string; options?: object }) => {
  let url = `${BASE_URL}/api/agents`;
  if (path && path !== '') {
    url += `/${path}`;
  }
  if (options && Object.keys(options).length > 0) {
    const queryParams = new URLSearchParams(options as Record<string, string>).toString();
    url += `?${queryParams}`;
  }
  return url;
};

export const activeJobs = () => `${BASE_URL}/api/agents/chat/active`;

export const revertAgentVersion = (agent_id: string) => `${agents({ path: `${agent_id}/revert` })}`;

// ---------------------------------------------------------------------------
// MCP (Model Context Protocol) — via REST or ZAP
// ---------------------------------------------------------------------------

export const mcp = {
  tools: `${BASE_URL}/api/mcp/tools`,
  servers: `${BASE_URL}/api/mcp/servers`,
};

export const mcpServer = (serverName: string) => `${BASE_URL}/api/mcp/servers/${serverName}`;
export const mcpReinitialize = (serverName: string) =>
  `${BASE_URL}/api/mcp/${serverName}/reinitialize`;
export const mcpConnectionStatus = () => `${BASE_URL}/api/mcp/connection/status`;
export const mcpServerConnectionStatus = (serverName: string) =>
  `${BASE_URL}/api/mcp/connection/status/${serverName}`;
export const mcpAuthValues = (serverName: string) =>
  `${BASE_URL}/api/mcp/${serverName}/auth-values`;
export const cancelMCPOAuth = (serverName: string) =>
  `${BASE_URL}/api/mcp/oauth/cancel/${serverName}`;
export const mcpOAuthBind = (serverName: string) => `${BASE_URL}/api/mcp/${serverName}/oauth/bind`;
export const actionOAuthBind = (actionId: string) =>
  `${BASE_URL}/api/actions/${actionId}/oauth/bind`;

// MCP tool refresh (cloud gateway native)
export const refreshMcpTools = () => `${BASE_URL}/api/refresh-mcp-tools`;

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export const prompts = () => `${BASE_URL}/api/prompts`;
export const addPromptToGroup = (groupId: string) =>
  `${BASE_URL}/api/prompts/groups/${groupId}/prompts`;
export const getPromptGroup = (_id: string) => `${prompts()}/groups/${_id}`;
export const getPromptGroupsWithFilters = (filter: object) => {
  let url = `${prompts()}/groups`;
  const cleanedFilter = Object.entries(filter).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );
  if (Object.keys(cleanedFilter).length > 0) {
    const queryParams = new URLSearchParams(cleanedFilter).toString();
    url += `?${queryParams}`;
  }
  return url;
};
export const getPromptsWithFilters = (filter: object) => {
  let url = prompts();
  if (Object.keys(filter).length > 0) {
    const queryParams = new URLSearchParams(filter as Record<string, string>).toString();
    url += `?${queryParams}`;
  }
  return url;
};
export const getPrompt = (_id: string) => `${prompts()}/${_id}`;
export const getRandomPrompts = (limit: number, skip: number) =>
  `${prompts()}/random?limit=${limit}&skip=${skip}`;
export const postPrompt = prompts;
export const updatePromptGroup = getPromptGroup;
export const updatePromptLabels = (_id: string) => `${getPrompt(_id)}/labels`;
export const updatePromptTag = (_id: string) => `${getPrompt(_id)}/tags/production`;
export const deletePromptGroup = getPromptGroup;
export const deletePrompt = ({ _id, groupId }: { _id: string; groupId: string }) =>
  `${prompts()}/${_id}?groupId=${groupId}`;
export const getCategories = () => `${BASE_URL}/api/categories`;
export const getAllPromptGroups = () => `${prompts()}/all`;

// ---------------------------------------------------------------------------
// Roles & Permissions
// ---------------------------------------------------------------------------

export const roles = () => `${BASE_URL}/api/get-permissions`;
export const getRole = (roleName: string) => `${BASE_URL}/api/get-permission?id=${roleName.toLowerCase()}`;
export const updatePromptPermissions = (roleName: string) => `${getRole(roleName)}/prompts`;
export const updateMemoryPermissions = (roleName: string) => `${getRole(roleName)}/memories`;
export const updateAgentPermissions = (roleName: string) => `${getRole(roleName)}/agents`;
export const updatePeoplePickerPermissions = (roleName: string) =>
  `${getRole(roleName)}/people-picker`;
export const updateMCPServersPermissions = (roleName: string) => `${getRole(roleName)}/mcp-servers`;
export const updateRemoteAgentsPermissions = (roleName: string) =>
  `${getRole(roleName)}/remote-agents`;
export const updateMarketplacePermissions = (roleName: string) =>
  `${getRole(roleName)}/marketplace`;

// ---------------------------------------------------------------------------
// Conversation Tags
// ---------------------------------------------------------------------------

export const conversationTags = (tag?: string) =>
  `${BASE_URL}/api/tags${tag != null && tag ? `/${encodeURIComponent(tag)}` : ''}`;
export const conversationTagsList = (pageNumber: string, sort?: string, order?: string) =>
  `${conversationTags()}/list?pageNumber=${pageNumber}${sort ? `&sort=${sort}` : ''}${
    order ? `&order=${order}` : ''
  }`;
export const addTagToConversation = (conversationId: string) =>
  `${conversationTags()}/convo/${conversationId}`;

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const userTerms = () => `${BASE_URL}/api/user/terms`;
export const acceptUserTerms = () => `${BASE_URL}/api/user/terms/accept`;
export const banner = () => `${BASE_URL}/api/banner`;

// Message Feedback
export const feedback = (conversationId: string, messageId: string) =>
  `${BASE_URL}/api/update-message?id=${encodeURIComponent(messageId)}`;

// Memories
export const memories = () => `${BASE_URL}/api/memories`;
export const memory = (key: string) => `${memories()}/${encodeURIComponent(key)}`;
export const memoryPreferences = () => `${memories()}/preferences`;

// Permissions search
export const searchPrincipals = (params: q.PrincipalSearchParams) => {
  const { q: query, limit, types } = params;
  let url = `${BASE_URL}/api/permissions/search-principals?q=${encodeURIComponent(query)}`;
  if (limit !== undefined) {
    url += `&limit=${limit}`;
  }
  if (types && types.length > 0) {
    url += `&types=${types.join(',')}`;
  }
  return url;
};

export const getAccessRoles = (resourceType: ResourceType) =>
  `${BASE_URL}/api/permissions/${resourceType}/roles`;
export const getResourcePermissions = (resourceType: ResourceType, resourceId: string) =>
  `${BASE_URL}/api/permissions/${resourceType}/${resourceId}`;
export const updateResourcePermissions = (resourceType: ResourceType, resourceId: string) =>
  `${BASE_URL}/api/permissions/${resourceType}/${resourceId}`;
export const getEffectivePermissions = (resourceType: ResourceType, resourceId: string) =>
  `${BASE_URL}/api/permissions/${resourceType}/${resourceId}/effective`;
export const getAllEffectivePermissions = (resourceType: ResourceType) =>
  `${BASE_URL}/api/permissions/${resourceType}/effective/all`;

// SharePoint Graph API Token (IAM-managed)
export const graphToken = (scopes: string) =>
  `${BASE_URL}/api/auth/graph-token?scopes=${encodeURIComponent(scopes)}`;

// ---------------------------------------------------------------------------
// Knowledge Stores (RAG)
// ---------------------------------------------------------------------------

export const stores = () => `${BASE_URL}/api/get-stores`;
export const store = (id: string) => `${BASE_URL}/api/get-store?id=${encodeURIComponent(id)}`;
export const addStore = () => `${BASE_URL}/api/add-store`;
export const updateStore = () => `${BASE_URL}/api/update-store`;
export const deleteStore = () => `${BASE_URL}/api/delete-store`;
export const refreshStoreVectors = () => `${BASE_URL}/api/refresh-store-vectors`;

// ---------------------------------------------------------------------------
// Vectors (Embeddings)
// ---------------------------------------------------------------------------

export const vectors = () => `${BASE_URL}/api/get-vectors`;
export const addVector = () => `${BASE_URL}/api/add-vector`;
export const deleteVector = () => `${BASE_URL}/api/delete-vector`;

// ---------------------------------------------------------------------------
// Workflows & Tasks
// ---------------------------------------------------------------------------

export const workflows = () => `${BASE_URL}/api/get-workflows`;
export const tasks = () => `${BASE_URL}/api/get-tasks`;
