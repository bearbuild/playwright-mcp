import path from 'path';

import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // https://workers-nodejs-compat-matrix.pages.dev/
      'async_hooks': 'node:async_hooks',
      'assert': 'node:assert',
      'buffer': 'node:buffer',
      'child_process': 'node:child_process',
      'constants': 'node:constants',
      'crypto': 'node:crypto',
      'dns': 'node:dns',
      'events': 'node:events',
      'http': 'node:http',
      'http2': 'node:http2',
      'https': 'node:https',
      'inspector': 'node:inspector',
      'module': 'node:module',
      'net': 'node:net',
      'os': 'node:os',
      'path': 'node:path',
      'process': 'node:process',
      'readline': 'node:readline',
      'stream': 'node:stream',
      'tls': 'node:tls',
      'url': 'node:url',
      'util': 'node:util',
      'zlib': 'node:zlib',

      'playwright-core': '@cloudflare/playwright',
      'playwright': '@cloudflare/playwright/test',
      'node:fs': '@cloudflare/playwright/fs',
      'fs': '@cloudflare/playwright/fs',

      // The base uses zod-to-json-schema@3 (zod v3); the workerd host bundles zod
      // v4, which that package mis-converts (→ 0 tools discovered). Swap in a
      // zod-v4-native shim for this build only — see ./src/zod-to-json-schema.ts.
      'zod-to-json-schema': path.resolve(__dirname, './src/zod-to-json-schema.ts'),

      './package.js': path.resolve(__dirname, './src/package.ts'),
    },
  },
  build: {
    assetsInlineLimit: 0,
    // skip code obfuscation
    minify: false,
    lib: {
      name: '@cloudflare/playwright',
      entry: [
        path.resolve(__dirname, './src/index.ts'),
      ],
    },
    // prevents __defProp, __defNormalProp, __publicField in compiled code
    target: 'esnext',
    rollupOptions: {
      output: [
        {
          format: 'es',
          dir: 'lib/esm',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
        {
          format: 'cjs',
          dir: 'lib/cjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          exports: 'named',
        },
      ],
      external: [
        'node:async_hooks',
        'node:assert',
        'node:browser',
        'node:buffer',
        'node:child_process',
        'node:constants',
        'node:crypto',
        'node:dns',
        'node:events',
        'node:http',
        'node:http2',
        'node:https',
        'node:inspector',
        'node:module',
        'node:net',
        'node:os',
        'node:path',
        'node:process',
        'node:readline',
        'node:stream',
        'node:timers',
        'node:tls',
        'node:url',
        'node:util',
        'node:zlib',

        '@cloudflare/playwright',
        '@cloudflare/playwright/test',
        '@cloudflare/playwright/fs',
        'cloudflare:workers',

        /@modelcontextprotocol\/sdk\/.*/,
        'agents/mcp',
        'yaml',
        'zod',
      ]
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      extensions: ['.ts', '.js'],
      include: [
        path.resolve(__dirname, '../src/**/*'),
        /node_modules/,
      ],
    }
  },
});
