import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import viteImagemin from 'vite-plugin-imagemin'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteImagemin({
      gifsicle: { optimizationLevel: 3 },
      mozjpeg: { quality: 78, progressive: true },
      optipng: { optimizationLevel: 5 },
      pngquant: { quality: [0.6, 0.8], speed: 3 },
      svgo: { multipass: true },
    }),
    compression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
    compression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  }
})
