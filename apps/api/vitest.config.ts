import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env['DATABASE_URL'] ??
        'postgresql://careeros:careeros@localhost:5432/finsight_test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/services/**', 'src/lib/**'],
    },
  },
})
