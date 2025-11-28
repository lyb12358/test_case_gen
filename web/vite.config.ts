import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
  optimizeDeps: {
    include: [
      '@monaco-editor/react',
      'monaco-editor',
      'react-syntax-highlighter',
      'react-dnd',
      'react-dnd-html5-backend',
      'react-markdown',
      'antd',
      '@tanstack/react-query'
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
          monacoReact: ['@monaco-editor/react'],
          syntaxHighlighter: ['react-syntax-highlighter'],
          dnd: ['react-dnd', 'react-dnd-html5-backend'],
          markdown: ['react-markdown'],
          antd: ['antd'],
          query: ['@tanstack/react-query']
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});