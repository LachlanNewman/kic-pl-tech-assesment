import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: './test/globalSetup.ts',
    setupFiles: ['./test/setupIntegration.ts'],
    include: ['test/integration/**/*.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
      LOG_LEVEL: 'debug',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
