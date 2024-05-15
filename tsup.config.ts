import { defineConfig } from 'tsup'
import alias from 'esbuild-plugin-alias'
import resolve from 'resolve'

export default defineConfig({
  entry: ['src/nebu.ts', 'src/utils/index.ts'],
  format: ['esm'],
  noExternal: [/^$/, 'magic-string', 'meriyah', 'eslint-visitor-keys'],
  outDir: 'dist/browser',
  esbuildPlugins: [
    alias({
      path: resolve.sync('path-browserify'),
    }),
  ],
})
