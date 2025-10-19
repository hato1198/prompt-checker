import { defineConfig } from 'vite';
import { resolve } from 'path';
import htmlMinifier from 'vite-plugin-html-minifier-terser';

export default defineConfig({
  root: 'src',
  base: '/',
  plugins: [
    htmlMinifier({
      removeComments: true,
    })
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        'ja/index': resolve(__dirname, 'src/ja/index.html'),
      }
    }
  },
});