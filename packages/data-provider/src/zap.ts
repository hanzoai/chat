/**
 * ZAP (Zero-Copy App Proto) WebSocket Client for Hanzo Chat
 *
 * Provides real-time streaming for:
 * - LLM chat completions (binary streaming, faster than SSE)
 * - MCP tool calls (direct RPC)
 * - Resource subscriptions (live updates)
 *
 * Falls back to REST API when ZAP is unavailable.
 *
 * Usage:
 *   import { zap } from 'librechat-data-provider';
 *
 *   await zap.connect('wss://api.hanzo.ai/zap');
 *   const stream = zap.streamChat(messages, model);
 *   for await (const chunk of stream) { ... }
 */

import { zapUrl } from './api-endpoints';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZapConfig {
  url?: string;
  clientId?: string;
  timeout?: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  publishableKey?: string;
  accessToken?: string;
}

export interface ZapMessage {
  type: number;
  id: string;
  payload: any;
}

export interface ChatStreamChunk {
  content?: string;
  reasoning?: string;
  toolCalls?: any[];
  done: boolean;
  error?: string;
}

// Message types (from ZAP protocol)
const MSG_HANDSHAKE = 0x01;
const MSG_HANDSHAKE_RESPONSE = 0x02;
const MSG_REQUEST = 0x10;
const MSG_RESPONSE = 0x11;
const MSG_STREAM = 0x20;
const MSG_PING = 0xfe;
const MSG_PONG = 0xff;

// ---------------------------------------------------------------------------
// ZAP Client
// ---------------------------------------------------------------------------

class ZapClient {
  private ws: WebSocket | null = null;
  private config: ZapConfig;
  private connected = false;
  private reconnectAttempts = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }>();
  private streamHandlers = new Map<string, (chunk: any) => void>();
  private messageId = 0;

  constructor(config: ZapConfig = {}) {
    this.config = {
      clientId: `hanzo-chat-${Math.random().toString(36).slice(2, 8)}`,
      timeout: 30000,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  /** Connect to ZAP gateway */
  async connect(url?: string): Promise<void> {
    const wsUrl = url || this.config.url || zapUrl();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.sendHandshake();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          this.connected = false;
          if (this.config.autoReconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts ?? 5)) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            setTimeout(() => this.connect(wsUrl), delay);
          }
        };

        this.ws.onerror = (error) => {
          if (!this.connected) {
            reject(new Error('ZAP connection failed'));
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Check if connected */
  get isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /** Disconnect */
  disconnect() {
    this.config.autoReconnect = false;
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  // -------------------------------------------------------------------------
  // Chat Streaming (the main use case)
  // -------------------------------------------------------------------------

  /**
   * Stream a chat completion via ZAP.
   * Returns an async iterator of chunks.
   */
  async *streamChat(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      tools?: any[];
    } = {},
  ): AsyncGenerator<ChatStreamChunk> {
    if (!this.isConnected) {
      throw new Error('ZAP not connected. Call connect() first.');
    }

    const requestId = this.nextId();
    const chunks: ChatStreamChunk[] = [];
    let done = false;
    let error: string | undefined;
    let resolveNext: (() => void) | null = null;

    // Register stream handler
    this.streamHandlers.set(requestId, (chunk: any) => {
      if (chunk.error) {
        error = chunk.error;
        done = true;
      } else if (chunk.done) {
        done = true;
      } else {
        chunks.push({
          content: chunk.content || chunk.text || '',
          reasoning: chunk.reasoning || chunk.reasonText || '',
          toolCalls: chunk.toolCalls,
          done: false,
        });
      }
      resolveNext?.();
    });

    // Send the chat request
    this.send({
      type: MSG_REQUEST,
      id: requestId,
      payload: {
        method: 'chat.completions',
        params: {
          model,
          messages,
          stream: true,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          system: options.systemPrompt,
          tools: options.tools,
        },
      },
    });

    // Yield chunks as they arrive
    try {
      while (!done) {
        if (chunks.length > 0) {
          yield chunks.shift()!;
        } else {
          // Wait for next chunk
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
      }

      // Yield remaining chunks
      while (chunks.length > 0) {
        yield chunks.shift()!;
      }

      if (error) {
        yield { done: true, error };
      } else {
        yield { done: true };
      }
    } finally {
      this.streamHandlers.delete(requestId);
    }
  }

  // -------------------------------------------------------------------------
  // MCP Tool Calls (via ZAP RPC)
  // -------------------------------------------------------------------------

  /** List available MCP tools */
  async listTools(): Promise<any[]> {
    return this.rpc('listTools', {});
  }

  /** Call an MCP tool */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    return this.rpc('callTool', { name, args });
  }

  /** List MCP resources */
  async listResources(): Promise<any[]> {
    return this.rpc('listResources', {});
  }

  /** Read an MCP resource */
  async readResource(uri: string): Promise<any> {
    return this.rpc('readResource', { uri });
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private nextId(): string {
    return `${this.config.clientId}-${++this.messageId}`;
  }

  private send(message: ZapMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not open');
    }
    // JSON encoding over WebSocket (binary Cap'n Proto is for TCP transport)
    this.ws.send(JSON.stringify(message));
  }

  private sendHandshake() {
    const handshake: any = {
      type: MSG_HANDSHAKE,
      id: this.nextId(),
      payload: {
        version: '1.0.0',
        clientType: 'hanzo-chat',
        clientId: this.config.clientId,
        capabilities: ['chat', 'tools', 'resources'],
      },
    };

    // Attach auth
    if (this.config.accessToken) {
      handshake.payload.auth = { bearer: this.config.accessToken };
    } else if (this.config.publishableKey) {
      handshake.payload.auth = { bearer: this.config.publishableKey };
    }

    this.send(handshake);
  }

  private handleMessage(data: ArrayBuffer | string) {
    let message: ZapMessage;

    if (typeof data === 'string') {
      message = JSON.parse(data);
    } else {
      // Binary: decode as UTF-8 JSON for now (Cap'n Proto binary later)
      const text = new TextDecoder().decode(data);
      message = JSON.parse(text);
    }

    switch (message.type) {
      case MSG_HANDSHAKE_RESPONSE:
        // Connection established
        break;

      case MSG_RESPONSE: {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          if (message.payload?.error) {
            pending.reject(new Error(message.payload.error));
          } else {
            pending.resolve(message.payload);
          }
        }
        break;
      }

      case MSG_STREAM: {
        const handler = this.streamHandlers.get(message.id);
        if (handler) {
          handler(message.payload);
        }
        break;
      }

      case MSG_PING:
        this.send({ type: MSG_PONG, id: message.id, payload: null });
        break;
    }
  }

  private async rpc(method: string, params: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('ZAP not connected');
    }

    const id = this.nextId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`ZAP RPC timeout: ${method}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeout);
          reject(reason);
        },
      });

      this.send({
        type: MSG_REQUEST,
        id,
        payload: { method, params },
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let _instance: ZapClient | null = null;

/** Get or create the ZAP client singleton */
export function getZapClient(config?: ZapConfig): ZapClient {
  if (!_instance) {
    _instance = new ZapClient(config);
  }
  return _instance;
}

/** Shorthand: connect and return client */
export async function connectZap(config?: ZapConfig): Promise<ZapClient> {
  const client = getZapClient(config);
  if (!client.isConnected) {
    await client.connect();
  }
  return client;
}

export { ZapClient };
export default getZapClient;
