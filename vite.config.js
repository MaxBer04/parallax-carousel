import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  // Dev mode configuration (serves index.html for testing)
  if (command === 'serve') {
    return {
      server: {
        open: true,
      },
    };
  }

  // Build mode configuration (builds the library)
  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.js'),
        name: 'ParallaxCarousel',
        formats: ['es', 'umd'],
        fileName: (format) => {
          if (format === 'es') return 'index.esm.js';
          if (format === 'umd') return 'index.js';
          return `index.${format}.js`;
        }
      },
      rollupOptions: {
        // Externalize dependencies that shouldn't be bundled
        external: [],
        output: {
          // Use named exports only to avoid warning
          exports: 'named',
          // Global variables for UMD build
          globals: {}
        }
      },
      sourcemap: true,
      outDir: 'dist',
      emptyOutDir: true
    }
  };
});
