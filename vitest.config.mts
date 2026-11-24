import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    // Copies du dépôt pour les agents en parallèle (claude --worktree).
    exclude: [...configDefaults.exclude, '.claude/worktrees/**'],
  },
})
