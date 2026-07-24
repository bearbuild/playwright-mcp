/**
 * Cloudflare/workerd build shim for `zod-to-json-schema`.
 *
 * The workerd host bundles **zod v4**, whose native `z.toJSONSchema` produces
 * correct JSON Schema. The base package's `src/connection.ts` imports
 * `{ zodToJsonSchema } from 'zod-to-json-schema'` — but `zod-to-json-schema@3`
 * only understands zod v3 internals, so handed a v4 schema it emits
 * `{ "$schema": ... }` with no `type`/`properties`; the MCP client then rejects
 * every tool (its ToolSchema requires `inputSchema.type === "object"`) and
 * discovery yields 0 tools.
 *
 * `cloudflare/vite.config.ts` aliases `zod-to-json-schema` to this module for the
 * workerd bundle ONLY, so the base source stays untouched (its own tsc/lint/test
 * CI still resolves the real zod-v3 `zod-to-json-schema`) while the shipped
 * Cloudflare build converts schemas with zod v4's native, correct converter.
 */
import { z } from 'zod';

export function zodToJsonSchema(
  schema: Parameters<typeof z.toJSONSchema>[0],
): ReturnType<typeof z.toJSONSchema> {
  return z.toJSONSchema(schema, { target: 'draft-2020-12' });
}
