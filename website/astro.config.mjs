import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
  ],
  output: 'static',
  site: 'https://tmarks.669696.xyz',
  build: {
    format: 'directory',
  },
  vite: {
    ssr: {
      noExternal: ['react', 'react-dom'],
    },
  },
});

