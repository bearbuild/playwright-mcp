import { McpAgent } from 'agents/mcp';
import { env } from 'cloudflare:workers';

import type { BrowserEndpoint } from '@cloudflare/playwright';

import { endpointURLString } from '@cloudflare/playwright';
import { createConnection } from '../../src/index.js';
import { ToolCapability } from '../../config.js';
import type { Connection } from '../../index.js';

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

type Options = {
  vision?: boolean;
  capabilities?: ToolCapability[];
};

export function createMcpAgent(endpoint: BrowserEndpoint, options?: Options): typeof McpAgent<typeof env, {}, {}> {
  const cdpEndpoint = typeof endpoint === 'string'
    ? endpoint
    : endpoint instanceof URL
      ? endpoint.toString()
      : endpointURLString(endpoint);

  const config = {
    capabilities: ['core', 'tabs', 'pdf', 'history', 'wait', 'files', 'testing'] as ToolCapability[],
    browser: {
      cdpEndpoint,
    },
    ...options,
  };

  return class PlaywrightMcpAgent extends McpAgent<typeof env, {}, {}> {
    // Per-instance connection. The MCP SDK `Server` owns exactly one transport
    // (`Protocol.connect` throws "Already connected to a transport" on a second
    // connect). A module-scoped `connection` made every DO instance in an
    // isolate share one `Server`, so when a second MCP session's `onStart`
    // connected its transport it threw — surfacing as a 1101 on DO revive once
    // two sessions co-located. Build the connection here so each DO instance
    // (each MCP session) owns its own `Server` and browser context.
    //
    // `_connection` (the whole `Connection`, not just the MCP `Server`) is
    // exposed so hosts can reach the live browser context — e.g. to seed
    // cookies or install a navigation-allowlist route interceptor before the
    // first navigation — via `_connection.context._ensureBrowserContext()`.
    _connection: Promise<Connection> = createConnection(config);
    server = this._connection.then(connection => connection.server as unknown as Server);

    async init() {
      // do nothing
    }
  };
}
