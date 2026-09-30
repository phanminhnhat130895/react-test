import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/generate-data.mjs'],
      exclude: ['src/**/*.test.*', 'src/test/**', 'src/main.tsx', 'src/types.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { perFile: true, statements: 81, branches: 81, functions: 81, lines: 81 },
    },
  },
});
