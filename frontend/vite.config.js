

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  esbuild: {
    jsx: 'automatic'
  },
 server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
},
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        admin: resolve(process.cwd(), 'admin.html')
      }
    }
  }
});
