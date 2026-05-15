import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 2003,
    proxy: {
      '/api': {
        target: 'http://localhost:1997',
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
})
