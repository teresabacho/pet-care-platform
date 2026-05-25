import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Pre-bundle workspace package — required because shared emits CommonJS;
    // Vite's pre-bundle does CJS→ESM interop so named imports work.
    // Caveat: cache in .vite/deps/ doesn't auto-invalidate when shared source rebuilds.
    // After adding new exports to shared, restart with `pnpm run dev --force`.
    include: ['@pet-care/shared'],
  },
})