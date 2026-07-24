# bearbuild fork notes

This is `bearbuild/playwright-mcp`, a fork of
[`cloudflare/playwright-mcp`](https://github.com/cloudflare/playwright-mcp)
(itself a fork of `microsoft/playwright-mcp`). It exists so Hearth can drive
Cloudflare Browser Rendering for the `advanced-app-debugging` skill from a
maintained package instead of the unmaintained upstream `@cloudflare/playwright-mcp@0.0.5`.

## What this fork changes vs `cloudflare/playwright-mcp`

The published package is built from the `cloudflare/` subdir and is renamed to
**`@bearbuild/playwright-mcp`** (published to GitHub Packages, not npmjs).

1. **Per-instance MCP `Server` + exposed `_connection`** (`cloudflare/src/index.ts`).
   Upstream builds the MCP connection once at module scope, so every Durable
   Object instance in an isolate shares one `Server`. The MCP SDK `Server` owns
   exactly one transport (`Protocol.connect` throws "Already connected to a
   transport" on a second connect), which surfaced as a **1101 on DO revive**
   when two co-located sessions each connected. The connection is now built in
   the agent **constructor** (one `Server` + browser context per DO/session), and
   the whole `Connection` is exposed as `_connection` so a host can reach the live
   browser context (`_connection.context._ensureBrowserContext()`) to seed cookies
   or install a navigation-allowlist route interceptor before the first navigation.

   *This folds in what was previously carried downstream as
   `patches/@cloudflare%2Fplaywright-mcp@0.0.5.patch` in the Hearth monorepo.*

2. **zod v4 native JSON-Schema conversion** (`src/connection.ts`). The Workers
   host bundles zod v4; the previously-used `zod-to-json-schema@3` only understands
   zod v3 internals and silently emits schemas with no `type`/`properties`, so the
   MCP client rejects every tool and discovery yields 0 tools. Tool input schemas
   are now converted with zod v4's native `z.toJSONSchema(schema, { target:
   'draft-2020-12' })`. The `zod-to-json-schema` dependency is dropped.

3. **Dependency bumps** (`cloudflare/package.json`): `@cloudflare/playwright`
   `^0.0.11 → ^1.3.0`, `agents` `^0.0.109 → ^0.19.0`,
   `@modelcontextprotocol/sdk` `^1.17.0 → ^1.29.0`, add `zod ^4`, add the base
   runtime deps that the workerd bundle inlines (`debug`, `mime`, `commander`).

The Microsoft base under `src/` is unchanged from the upstream sync point
(`@playwright/mcp@0.0.30`) except for change (2). A separate effort tracks syncing
the base forward (Microsoft is at 0.0.78).

## Building

```
npm ci                 # root: installs the base deps the workerd bundle inlines
cd cloudflare
npm run build          # npm ci + vite build → lib/{esm,cjs}
```

## Publishing

`@bearbuild/playwright-mcp` publishes to **GitHub Packages** via
`.github/workflows/bearbuild_publish.yml` (on GitHub Release, or manual
`workflow_dispatch` with a version). Consumers install with an `.npmrc` mapping
`@bearbuild:registry=https://npm.pkg.github.com`.
