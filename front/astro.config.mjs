import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

// NB: `output: 'hybrid'` removed in Astro 5+.
// Same behaviour achieved via `output: 'static'` (default) + an adapter,
// then opt-out individual SSR pages with `export const prerender = false`.
// /projects/[section]/[subsection].astro does exactly that.
export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { port: 4321, host: true },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
