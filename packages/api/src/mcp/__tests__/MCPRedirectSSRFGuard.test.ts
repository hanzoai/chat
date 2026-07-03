/**
 * End-to-end proof that the MCP redirect SSRF guard rejects internal targets
 * using the REAL `isSSRFTarget` / `resolveHostnameSSRF` classifiers.
 *
 * The sibling `MCPConnectionSSRF.test.ts` mocks `~/auth`, so it exercises the
 * redirect plumbing but not the real private-IP classifier. This file mocks
 * nothing security-relevant: it stands up real in-process HTTP servers on
 * loopback and asserts that a server-controlled redirect to an internal IP
 * literal (the SSRF a multi-tenant MCP surface must block — cloud metadata at
 * 169.254.169.254, in-cluster services, localhost) is never followed.
 */

import * as net from 'net';
import * as http from 'http';
import type { Socket } from 'net';
import { MCPConnection } from '~/mcp/connection';
import { isSSRFTarget } from '~/auth';

jest.mock('@librechat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('~/mcp/mcpConfig', () => ({
  mcpConfig: { CONNECTION_CHECK_TTL: 0 },
}));

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close((err) => (err ? reject(err) : resolve(addr.port)));
    });
  });
}

function trackSockets(server: http.Server): () => Promise<void> {
  const sockets = new Set<Socket>();
  server.on('connection', (socket: Socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  return () =>
    new Promise<void>((resolve) => {
      for (const socket of sockets) {
        socket.destroy();
      }
      sockets.clear();
      server.close(() => resolve());
    });
}

interface RedirectFixture {
  entryUrl: string;
  entryHit: () => boolean;
  internalHit: () => boolean;
  close: () => Promise<void>;
}

/**
 * Entry server 302/307/308-redirects to an "internal metadata" server. Both run
 * on loopback (127.0.0.1 is itself a private/SSRF target, so the redirect hop
 * must be blocked). `internalHit` flips true only if the guard failed and the
 * request reached the internal target.
 */
async function createRedirectToInternal(statusCode: number): Promise<RedirectFixture> {
  const state = { entryHit: false, internalHit: false };

  const internalPort = await getFreePort();
  const internalServer = http.createServer((_req, res) => {
    state.internalHit = true;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('iam-role-credentials-should-never-leak');
  });
  const closeInternal = trackSockets(internalServer);
  await new Promise<void>((resolve) => internalServer.listen(internalPort, '127.0.0.1', resolve));

  const entryPort = await getFreePort();
  const entryServer = http.createServer((_req, res) => {
    state.entryHit = true;
    res.writeHead(statusCode, {
      Location: `http://127.0.0.1:${internalPort}/latest/meta-data/iam/security-credentials/`,
    });
    res.end();
  });
  const closeEntry = trackSockets(entryServer);
  await new Promise<void>((resolve) => entryServer.listen(entryPort, '127.0.0.1', resolve));

  return {
    entryUrl: `http://127.0.0.1:${entryPort}/`,
    entryHit: () => state.entryHit,
    internalHit: () => state.internalHit,
    close: async () => {
      await closeEntry();
      await closeInternal();
    },
  };
}

async function safeDisconnect(conn: MCPConnection | null): Promise<void> {
  if (!conn) {
    return;
  }
  (conn as unknown as { shouldStopReconnecting: boolean }).shouldStopReconnecting = true;
  conn.removeAllListeners();
  await conn.disconnect();
}

describe('MCP redirect SSRF guard (real classifier)', () => {
  it('classifies cloud-metadata / loopback / RFC1918 IP literals as SSRF targets', () => {
    expect(isSSRFTarget('169.254.169.254')).toBe(true); // AWS/GCP/Azure metadata
    expect(isSSRFTarget('127.0.0.1')).toBe(true); // loopback
    expect(isSSRFTarget('10.0.0.5')).toBe(true); // RFC1918
    expect(isSSRFTarget('192.168.1.1')).toBe(true); // RFC1918
    expect(isSSRFTarget('172.16.0.1')).toBe(true); // RFC1918
    expect(isSSRFTarget('localhost')).toBe(true);
    expect(isSSRFTarget('::1')).toBe(true); // IPv6 loopback
    // A public hostname must NOT be flagged (no false-positive that breaks real MCP servers).
    expect(isSSRFTarget('mcp.example.com')).toBe(false);
  });

  for (const status of [302, 307, 308]) {
    it(`does not follow a ${status} redirect to an internal IP literal (SSRF blocked)`, async () => {
      const fixture = await createRedirectToInternal(status);
      let conn: MCPConnection | null = null;
      try {
        conn = new MCPConnection({
          serverName: `redirect-ssrf-${status}`,
          serverConfig: { type: 'streamable-http', url: fixture.entryUrl },
          useSSRFProtection: true,
        });

        await expect(conn.connect()).rejects.toThrow();
        // The redirect was actually issued (we reached the redirect hop)...
        expect(fixture.entryHit()).toBe(true);
        // ...and the internal metadata endpoint was still never reached.
        expect(fixture.internalHit()).toBe(false);
      } finally {
        await safeDisconnect(conn);
        await fixture.close();
      }
    });
  }
});
