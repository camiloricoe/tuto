import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // server-only is a Next.js guard that throws at runtime in non-server
      // environments. Alias it to an empty module so vitest can import files
      // that use it without crashing.
      'server-only': resolve(__dirname, 'tests/__mocks__/server-only.ts'),
    },
  },
})
