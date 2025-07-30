import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 5000,
    open: true,
    cors: true,
    host: true
  },
  define: {
    __API_BASE_URL__: JSON.stringify('http://your-cardano-hydra-wrapper-api-url'),
    __API_KEY__: JSON.stringify(null)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.js', '.html']
  }
})