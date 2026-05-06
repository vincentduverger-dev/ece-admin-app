import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const port = Number(process.env.VITE_PORT ?? 5173)
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT ?? port)
const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:3000"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
    hmr: {
      clientPort: hmrClientPort,
    },
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
