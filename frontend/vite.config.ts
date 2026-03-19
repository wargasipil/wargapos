import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  build: {
    outDir: '../backend/cmd/server/static',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Proxy all Connect RPCs to the Go backend.
      // All Connect paths start with the proto package name e.g.:
      //   /wargapos.auth.v1.AuthService/Login
      // Connector service — must be before the general /wargapos rule
      '/wargapos.connector.v1': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/wargapos': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/setup-needed': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/setup': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
