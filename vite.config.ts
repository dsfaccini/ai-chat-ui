import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
// import { analyzer } from 'vite-bundle-analyzer'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths({
      // Silence warnings about malformed tsconfig.json files in cache directories
      ignoreConfigErrors: true,
      // Skip cache directories when searching for tsconfig files
      skip: (dir: string) => {
        return (
          dir.includes('.bun') ||
          dir.includes('Library/Caches') ||
          dir.includes('node_modules') ||
          dir.includes('.cache')
        )
      },
    }),
  ],
  base: command === 'build' && mode !== 'no-cdn' ? 'https://cdn.jsdelivr.net/npm/@pydantic/ai-chat-ui/dist/' : '',
  build: {
    assetsDir: 'assets',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}))
