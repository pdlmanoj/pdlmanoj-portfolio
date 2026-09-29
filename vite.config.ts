import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { markdownBlog } from './build/markdown';

// `base: './'` keeps every asset reference relative, so the built site works
// from a GitHub Pages project path (https://<user>.github.io/<repo>) as well
// as from a custom domain or a local `dist/` preview. Routing is hash-based
// (see src/hooks/useHashRoute.ts), so no server rewrite rules are needed.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), markdownBlog()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    watch: {
      /**
       * Editors and scripts write a file in more than one step, and a watcher
       * that fires on the first step makes the Markdown plugin transform a
       * half-written file. Waiting for the size to settle means one change
       * produces one reload, with the whole file present.
       */
      awaitWriteFinish: {
        stabilityThreshold: 120,
        pollInterval: 20,
      },
    },
  },
});
