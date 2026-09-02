/**
 * Model Context Protocol (MCP) Server & Skill definitions.
 */
export interface McpServer {
  id: string
  name: string
  description: string
  version: string
  status: 'connected' | 'connecting' | 'disabled'
  category: 'System' | 'Database' | 'DevOps' | 'Search' | 'Cloud'
  icon: 'terminal' | 'database' | 'github' | 'globe' | 'cloud' | 'shield'
  toolsCount: number
  tools: readonly {
    name: string
    description: string
  }[]
  envRequired?: string[]
}

export const DEFAULT_MCP_SERVERS: readonly McpServer[] = [
  {
    id: 'filesystem',
    name: 'Local Filesystem MCP',
    description: 'Read, write, edit files and traverse local workspace directories.',
    version: '1.4.0',
    status: 'connected',
    category: 'System',
    icon: 'terminal',
    toolsCount: 5,
    tools: [
      { name: 'read_file', description: 'Read file contents from local disk' },
      { name: 'write_file', description: 'Create or overwrite local project files' },
      { name: 'list_directory', description: 'List files and folders in directory' },
      { name: 'grep_search', description: 'Search regex patterns across project' },
      { name: 'find_by_name', description: 'Find files matching glob patterns' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub & Git MCP',
    description: 'Create branches, commit diffs, inspect PRs and dispatch workflows.',
    version: '2.1.0',
    status: 'connected',
    category: 'DevOps',
    icon: 'github',
    toolsCount: 6,
    tools: [
      { name: 'github_create_pr', description: 'Open pull request with branch changes' },
      { name: 'github_get_issue', description: 'Fetch issue details and discussions' },
      { name: 'github_list_repos', description: 'List repositories in Hanzo org' },
      { name: 'git_status', description: 'Inspect modified files and staged index' },
    ],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL & pgvector MCP',
    description: 'Execute SQL queries, inspect table schemas, and compute vector cosine similarities.',
    version: '1.8.2',
    status: 'connected',
    category: 'Database',
    icon: 'database',
    toolsCount: 4,
    tools: [
      { name: 'query_sql', description: 'Execute parameterized read/write SQL queries' },
      { name: 'vector_search', description: 'Hybrid pgvector semantic embedding search' },
      { name: 'describe_schema', description: 'Extract tables, columns, indexes, and FKs' },
    ],
  },
  {
    id: 'k8s',
    name: 'Kubernetes & k3s Sandbox MCP',
    description: 'Inspect Pods, stream container logs, scale deployments, and apply manifests.',
    version: '1.2.1',
    status: 'connected',
    category: 'Cloud',
    icon: 'cloud',
    toolsCount: 5,
    tools: [
      { name: 'k8s_get_pods', description: 'List active pods and health status' },
      { name: 'k8s_container_exec', description: 'Execute isolated process in sandbox pod' },
      { name: 'k8s_stream_logs', description: 'Tail container stdout/stderr log stream' },
    ],
  },
  {
    id: 'web-search',
    name: 'Brave & Web Search MCP',
    description: 'Real-time web search and live documentation extraction with verified citations.',
    version: '3.0.0',
    status: 'connected',
    category: 'Search',
    icon: 'globe',
    toolsCount: 3,
    tools: [
      { name: 'search_web', description: 'Search web with verified snippets and links' },
      { name: 'fetch_page', description: 'Extract markdown content from target URL' },
    ],
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace & Gmail MCP',
    description: 'Read and search emails, inspect inbox threads, manage calendar events and Google Drive files.',
    version: '0.2.6',
    status: 'connected',
    category: 'Cloud',
    icon: 'globe',
    toolsCount: 5,
    tools: [
      { name: 'gmail_list_messages', description: 'Search and list messages from Gmail inbox (query, unread, label)' },
      { name: 'gmail_get_message', description: 'Read email body, sender, headers, and thread replies' },
      { name: 'gmail_send_message', description: 'Send an email or reply to a thread' },
      { name: 'calendar_list_events', description: 'List upcoming Google Calendar meetings and appointments' },
      { name: 'drive_search_files', description: 'Search documents, sheets, and files in Google Drive' },
    ],
  },
]
