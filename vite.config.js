import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  ViteImageOptimizer({
      jpg: {
        quality: 80, // Compresses JPEGs to 80% quality
      },
      png: {
        quality: 80,
      },
    }),
    visualizer({
      open: true,
      filename: 'stats.html',
    }),
  ],
})
