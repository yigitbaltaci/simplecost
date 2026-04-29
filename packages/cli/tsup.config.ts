import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  noExternal: ['@claude-cost/core'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
