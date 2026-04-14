import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      target: 'esnext', // Modern browsers only
      minify: 'esbuild', // Use esbuild instead of terser
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            // Core vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-ai': ['@google/genai'],
            // transformers.js as separate lazy-loadable chunk
            'vendor-ml': ['@huggingface/transformers'],
            // UI components
            'vendor-ui': ['lucide-react', 'motion', 'clsx', 'tailwind-merge'],
          },
          // Flatten vendor chunks for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
      // Optimize chunk splitting
      chunkSizeWarningLimit: 500, // 500KB warning threshold
    },
    // Optimize dependencies
    optimizeDeps: {
      exclude: ['@huggingface/transformers'], // Exclude from pre-bundling
    },
  };
});
