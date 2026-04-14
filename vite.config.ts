import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // VITE_ prefix vars are automatically available via import.meta.env
      // Additional process.env fallback for backward compatibility
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
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
          manualChunks: (id) => {
            // Core vendor chunks - optimized for caching
            if (id.includes('node_modules/react')) return 'vendor-react';
            if (id.includes('node_modules/firebase')) return 'vendor-firebase';
            if (id.includes('node_modules/@google/genai')) return 'vendor-ai';
            if (id.includes('node_modules/@huggingface/transformers')) return 'vendor-ml';
            // UI vendor split for better tree-shaking
            if (id.includes('node_modules/lucide-react') || 
                id.includes('node_modules/motion') || 
                id.includes('node_modules/clsx') || 
                id.includes('node_modules/tailwind-merge')) return 'vendor-ui';
            return undefined;
          },
          // Improved chunk naming for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
      // Stricter chunk size limit for better performance
      chunkSizeWarningLimit: 300, // 300KB warning threshold (reduced from 500KB)
    },
    // Optimize dependencies - exclude transformers.js for lazy loading
    optimizeDeps: {
      exclude: ['@huggingface/transformers'],
      // Note: firebase/* packages are auto-included by Vite
    },
  };
});
