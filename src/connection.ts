/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { Context } from './context.js';
import { snapshotTools, visionTools } from './tools.js';
import { packageJSON } from './package.js';

import { FullConfig } from './config.js';

import type { BrowserContextFactory } from './browserContextFactory.js';

// This package runs on the Cloudflare Workers runtime, where the host bundles
// zod v4 (its native draft-2020-12 JSON-Schema converter). The previously used
// `zod-to-json-schema@3` only understands zod v3 internals — handed a v4 schema
// it silently emits `{ "$schema": ... }` with no `type`/`properties`, so the MCP
// client rejects every tool (its ToolSchema requires inputSchema.type ===
// "object") and discovery yields 0 tools. Use zod v4's native converter, which
// produces the correct shape.
function zodToJsonSchema(schema: Parameters<typeof z.toJSONSchema>[0]) {
  return z.toJSONSchema(schema, { target: 'draft-2020-12' });
}

export function createConnection(config: FullConfig, browserContextFactory: BrowserContextFactory): Connection {
  const allTools = config.vision ? visionTools : snapshotTools;
  const tools = allTools.filter(tool => !config.capabilities || tool.capability === 'core' || config.capabilities.includes(tool.capability));
  const context = new Context(tools, config, browserContextFactory);
  const server = new McpServer({ name: 'Playwright', version: packageJSON.version }, {
    capabilities: {
      tools: {},
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.schema.name,
        description: tool.schema.description,
        inputSchema: zodToJsonSchema(tool.schema.inputSchema),
        annotations: {
          title: tool.schema.title,
          readOnlyHint: tool.schema.type === 'readOnly',
          destructiveHint: tool.schema.type === 'destructive',
          openWorldHint: true,
        },
      })) as McpTool[],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const errorResult = (...messages: string[]) => ({
      content: [{ type: 'text', text: messages.join('\n') }],
      isError: true,
    });
    const tool = tools.find(tool => tool.schema.name === request.params.name);
    if (!tool)
      return errorResult(`Tool "${request.params.name}" not found`);


    const modalStates = context.modalStates().map(state => state.type);
    if (tool.clearsModalState && !modalStates.includes(tool.clearsModalState))
      return errorResult(`The tool "${request.params.name}" can only be used when there is related modal state present.`, ...context.modalStatesMarkdown());
    if (!tool.clearsModalState && modalStates.length)
      return errorResult(`Tool "${request.params.name}" does not handle the modal state.`, ...context.modalStatesMarkdown());

    try {
      return await context.run(tool, request.params.arguments);
    } catch (error) {
      return errorResult(String(error));
    }
  });

  return new Connection(server, context);
}

export class Connection {
  readonly server: McpServer;
  readonly context: Context;

  constructor(server: McpServer, context: Context) {
    this.server = server;
    this.context = context;
    this.server.oninitialized = () => {
      this.context.clientVersion = this.server.getClientVersion();
    };
  }

  async close() {
    await this.server.close();
    await this.context.close();
  }
}
