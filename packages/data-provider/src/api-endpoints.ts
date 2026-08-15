/**
 * Hanzo Chat API Endpoints (Chat-native backend under /v1/chat/*).
 *
 * Single source of truth for all REST URLs. The SPA is served by, and talks to,
 * its own origin (e.g. https://hanzo.chat): BASE_URL is derived from the <base>
 * element / relative path, with an optional explicit override via setApiBaseUrl().
 */
import type { AssistantsEndpoint } from './schemas';
import * as q from './types/queries';
import { ResourceType } from './accessPermissions';

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

/** Explicit API base URL (set via setApiBaseUrl(), e.g. for SSR/tests) */
let _explicitBaseUrl: string | undefined;

/**
 * Resolve the API base URL.
 * Priority: explicit override > <base> element > relative ''
 */
function resolveBaseUrl(): string {
  if (_explicitBaseUrl !== undefined) {
    return _explicitBaseUrl;
  }

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

/** Runtime override for API base URL (SSR/tests) */
export function setApiBaseUrl(url: string) {
  _explicitBaseUrl = url.replace(/\/$/, '');
  BASE_URL = _explicitBaseUrl;
}

export const apiBaseUrl = () => BASE_URL;

/** ZAP WebSocket URL (derived from API base; retained for compat). */
export function zapUrl(): string {
  const base = BASE_URL || '';
  return base.replace(/^http/, 'ws') + '/zap';
}
// Testing this buildQuery function
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

export const health = () => `${BASE_URL}/v1/chat/health`;

/**
 * Where chat serves the images it writes (generated images and avatars). A
 * stored image filepath IS this URL — one string, written by
 * `Files/Local/crud`, read by `<img src>`.
 *
 * Conversations written before the namespace move hold the bare `/images/…`
 * prefix. That is immutable history, not a second API: the server answers it
 * with one permanent redirect here, and `isServedImage` recognises both.
 */
export const imagesRoute = '/v1/chat/images';
const storedImagesRoute = '/images/';

/** True when `path` is an image this server stores and serves. */
export const isServedImage = (path?: string | null): boolean =>
  typeof path === 'string' &&
  (path.startsWith(`${imagesRoute}/`) || path.startsWith(storedImagesRoute));
export const user = () => `${BASE_URL}/v1/chat/user`;

export const balance = () => `${BASE_URL}/v1/chat/balance`;

export const usage = () => `${BASE_URL}/v1/chat/usage`;

// Canonical cloud AI usage (GET /v1/get-cloud-usages, proxied on-behalf-of). A
// SEPARATE concern from `usage` above (the Mongo token-credit tab): this is the
// shared @hanzo/usage `CloudUsageOverview` every Hanzo surface renders.
export const cloudUsage = (params?: { range?: string }) =>
  `${BASE_URL}/v1/chat/cloud-usage${params?.range ? `?range=${encodeURIComponent(params.range)}` : ''}`;

export const routingDefaults = () => `${BASE_URL}/v1/chat/routing-defaults`;

export const userPlugins = () => `${BASE_URL}/v1/chat/user/plugins`;

export const deleteUser = () => `${BASE_URL}/v1/chat/user/delete`;

const messagesRoot = `${BASE_URL}/v1/chat/messages`;

export const messages = (params: q.MessagesListParams) => {
  const { conversationId, messageId, ...rest } = params;

  if (conversationId && messageId) {
    return `${messagesRoot}/${conversationId}/${messageId}`;
  }

  if (conversationId) {
    return `${messagesRoot}/${conversationId}`;
  }

  return `${messagesRoot}${buildQuery(rest)}`;
};

export const messagesArtifacts = (messageId: string) => `${messagesRoot}/artifact/${messageId}`;

export const messagesBranch = () => `${messagesRoot}/branch`;

const shareRoot = `${BASE_URL}/v1/chat/share`;
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

const keysEndpoint = `${BASE_URL}/v1/chat/keys`;

export const keys = () => keysEndpoint;

export const userKeyQuery = (name: string) => `${keysEndpoint}?name=${name}`;

export const revokeUserKey = (name: string) => `${keysEndpoint}/${name}`;

export const revokeAllUserKeys = () => `${keysEndpoint}?all=true`;

const apiKeysEndpoint = `${BASE_URL}/v1/chat/api-keys`;

export const apiKeys = () => apiKeysEndpoint;

export const apiKeyById = (id: string) => `${apiKeysEndpoint}/${id}`;

export const conversationsRoot = `${BASE_URL}/v1/chat/convos`;

export const conversations = (params: q.ConversationListParams) => {
  return `${conversationsRoot}${buildQuery(params)}`;
};

export const conversationById = (id: string) => `${conversationsRoot}/${id}`;

export const genTitle = (conversationId: string) =>
  `${conversationsRoot}/gen_title/${encodeURIComponent(conversationId)}`;

export const updateConversation = () => `${conversationsRoot}/update`;

export const archiveConversation = () => `${conversationsRoot}/archive`;

export const deleteConversation = () => `${conversationsRoot}`;

export const deleteAllConversation = () => `${conversationsRoot}/all`;

export const importConversation = () => `${conversationsRoot}/import`;

export const forkConversation = () => `${conversationsRoot}/fork`;

export const duplicateConversation = () => `${conversationsRoot}/duplicate`;

export const search = (q: string, cursor?: string | null) =>
  `${BASE_URL}/v1/chat/search?q=${q}${cursor ? `&cursor=${cursor}` : ''}`;

export const searchEnabled = () => `${BASE_URL}/v1/chat/search/enable`;

export const presets = () => `${BASE_URL}/v1/chat/presets`;

export const deletePreset = () => `${BASE_URL}/v1/chat/presets/delete`;

export const aiEndpoints = () => `${BASE_URL}/v1/chat/endpoints`;

export const models = () => `${BASE_URL}/v1/chat/models`;

export const tokenizer = () => `${BASE_URL}/v1/chat/tokenizer`;

/** Where the app sends a visitor who needs to sign in. */
export const loginPage = () => `${BASE_URL}/login`;

export const plugins = () => `${BASE_URL}/v1/chat/plugins`;

export const mcpReinitialize = (serverName: string) =>
  `${BASE_URL}/v1/chat/mcp/${serverName}/reinitialize`;
export const mcpConnectionStatus = () => `${BASE_URL}/v1/chat/mcp/connection/status`;
export const mcpServerConnectionStatus = (serverName: string) =>
  `${BASE_URL}/v1/chat/mcp/connection/status/${serverName}`;
export const mcpAuthValues = (serverName: string) => {
  return `${BASE_URL}/v1/chat/mcp/${serverName}/auth-values`;
};

export const cancelMCPOAuth = (serverName: string) => {
  return `${BASE_URL}/v1/chat/mcp/oauth/cancel/${serverName}`;
};

export const mcpOAuthBind = (serverName: string) =>
  `${BASE_URL}/v1/chat/mcp/${serverName}/oauth/bind`;

export const actionOAuthBind = (actionId: string) =>
  `${BASE_URL}/v1/chat/actions/${actionId}/oauth/bind`;

export const config = () => `${BASE_URL}/v1/chat/config`;

export const prompts = () => `${BASE_URL}/v1/chat/prompts`;

export const addPromptToGroup = (groupId: string) =>
  `${BASE_URL}/v1/chat/prompts/groups/${groupId}/prompts`;

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
  let url =
    isAvatar === true ? `${images()}/assistants` : `${BASE_URL}/v1/chat/assistants/v${version}`;

  if (path && path !== '') {
    url += `/${path}`;
  }

  if (endpoint) {
    options = {
      ...(options ?? {}),
      endpoint,
    };
  }

  if (options && Object.keys(options).length > 0) {
    const queryParams = new URLSearchParams(options as Record<string, string>).toString();
    url += `?${queryParams}`;
  }

  return url;
};

export const agents = ({ path = '', options }: { path?: string; options?: object }) => {
  let url = `${BASE_URL}/v1/chat/agents`;

  if (path && path !== '') {
    url += `/${path}`;
  }

  if (options && Object.keys(options).length > 0) {
    const queryParams = new URLSearchParams(options as Record<string, string>).toString();
    url += `?${queryParams}`;
  }

  return url;
};

export const activeJobs = () => `${BASE_URL}/v1/chat/agents/chat/active`;

/**
 * Canonical Hanzo Cloud agents (`/v1/agents`), proxied server-side through the
 * chat backend at `/v1/chat/agents/cloud` so the user's hanzo.id token never reaches
 * the browser. `name` is a cloud agent handle; empty for the list.
 */
export const cloudAgents = (name = '') =>
  `${BASE_URL}/v1/chat/agents/cloud${name ? `/${encodeURIComponent(name)}` : ''}`;

export const cloudAgentRun = (name: string) =>
  `${BASE_URL}/v1/chat/agents/cloud/${encodeURIComponent(name)}/run`;

export const mcp = {
  tools: `${BASE_URL}/v1/chat/mcp/tools`,
  servers: `${BASE_URL}/v1/chat/mcp/servers`,
};

export const mcpServer = (serverName: string) => `${BASE_URL}/v1/chat/mcp/servers/${serverName}`;

export const revertAgentVersion = (agent_id: string) => `${agents({ path: `${agent_id}/revert` })}`;

export const files = () => `${BASE_URL}/v1/chat/files`;
export const fileUpload = () => `${BASE_URL}/v1/chat/files`;
export const fileDelete = () => `${BASE_URL}/v1/chat/files`;
export const fileDownload = (userId: string, fileId: string) =>
  `${BASE_URL}/v1/chat/files/download/${userId}/${fileId}`;
export const fileConfig = () => `${BASE_URL}/v1/chat/files/config`;
export const agentFiles = (agentId: string) => `${BASE_URL}/v1/chat/files/agent/${agentId}`;

export const images = () => `${files()}/images`;

export const avatar = () => `${images()}/avatar`;

export const speech = () => `${files()}/speech`;

export const speechToText = () => `${speech()}/stt`;

export const textToSpeech = () => `${speech()}/tts`;

export const textToSpeechManual = () => `${textToSpeech()}/manual`;

export const textToSpeechVoices = () => `${textToSpeech()}/voices`;

export const getCustomConfigSpeech = () => `${speech()}/config/get`;

export const getPromptGroup = (_id: string) => `${prompts()}/groups/${_id}`;

export const getPromptGroupsWithFilters = (filter: object) => {
  let url = `${prompts()}/groups`;
  // Filter out undefined/null values
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

export const deletePrompt = ({ _id, groupId }: { _id: string; groupId: string }) => {
  return `${prompts()}/${_id}?groupId=${groupId}`;
};

export const getCategories = () => `${BASE_URL}/v1/chat/categories`;

export const getAllPromptGroups = () => `${prompts()}/all`;

/* Roles */
export const roles = () => `${BASE_URL}/v1/chat/roles`;
export const getRole = (roleName: string) => `${roles()}/${roleName.toLowerCase()}`;
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

/* Conversation Tags */
export const conversationTags = (tag?: string) =>
  `${BASE_URL}/v1/chat/tags${tag != null && tag ? `/${encodeURIComponent(tag)}` : ''}`;

export const conversationTagsList = (pageNumber: string, sort?: string, order?: string) =>
  `${conversationTags()}/list?pageNumber=${pageNumber}${sort ? `&sort=${sort}` : ''}${
    order ? `&order=${order}` : ''
  }`;

export const addTagToConversation = (conversationId: string) =>
  `${conversationTags()}/convo/${conversationId}`;

export const userTerms = () => `${BASE_URL}/v1/chat/user/terms`;
export const acceptUserTerms = () => `${BASE_URL}/v1/chat/user/terms/accept`;
export const banner = () => `${BASE_URL}/v1/chat/banner`;

// Message Feedback
export const feedback = (conversationId: string, messageId: string) =>
  `${BASE_URL}/v1/chat/messages/${conversationId}/${messageId}/feedback`;

/* Memories */
export const memories = () => `${BASE_URL}/v1/chat/memories`;
export const memory = (key: string) => `${memories()}/${encodeURIComponent(key)}`;
export const memoryPreferences = () => `${memories()}/preferences`;

export const searchPrincipals = (params: q.PrincipalSearchParams) => {
  const { q: query, limit, types } = params;
  let url = `${BASE_URL}/v1/chat/permissions/search-principals?q=${encodeURIComponent(query)}`;

  if (limit !== undefined) {
    url += `&limit=${limit}`;
  }

  if (types && types.length > 0) {
    url += `&types=${types.join(',')}`;
  }

  return url;
};

export const getAccessRoles = (resourceType: ResourceType) =>
  `${BASE_URL}/v1/chat/permissions/${resourceType}/roles`;

export const getResourcePermissions = (resourceType: ResourceType, resourceId: string) =>
  `${BASE_URL}/v1/chat/permissions/${resourceType}/${resourceId}`;

export const updateResourcePermissions = (resourceType: ResourceType, resourceId: string) =>
  `${BASE_URL}/v1/chat/permissions/${resourceType}/${resourceId}`;

export const getEffectivePermissions = (resourceType: ResourceType, resourceId: string) =>
  `${BASE_URL}/v1/chat/permissions/${resourceType}/${resourceId}/effective`;

export const getAllEffectivePermissions = (resourceType: ResourceType) =>
  `${BASE_URL}/v1/chat/permissions/${resourceType}/effective/all`;
