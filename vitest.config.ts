import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'api/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/**'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'api/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'api/**/*.test.ts', 'src/types/**']
    }
  }
});
