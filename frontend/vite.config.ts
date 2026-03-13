import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/cmd/server/static',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Proxy all Connect RPCs to the Go backend.
      // All Connect paths start with the proto package name e.g.:
      //   /wargapos.auth.v1.AuthService/Login
      '/wargapos': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
