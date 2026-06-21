import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

export default defineConfig({
  plugins: [svelte({
    preprocess: sveltePreprocess(),
  }), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['iife'],
      name: 'siyuanContacts',
      fileName: () => 'index.js',
    },
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      external: ['siyuan'],
      output: {
        globals: { siyuan: 'siyuan' },
        footer: 'module.exports = siyuanContacts;',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
