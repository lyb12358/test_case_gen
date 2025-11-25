/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 测试环境配置
    environment: 'node',

    // 全局设置
    globals: false,

    // 测试文件匹配模式
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],

    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache'
    ],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'coverage/',
        'src/tests/setup.ts', // 测试设置文件
        'src/**/*.stories.{tsx,ts}', // Storybook stories
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },

    // 测试超时设置
    testTimeout: 10000,

    // Hook超时设置
    hookTimeout: 10000,

    // 并发设置
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // 监视模式忽略文件
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**'
    ],

    // 测试设置文件
    setupFiles: ['./src/tests/setup.ts']
  },

  // 路径别名配置（与vite.config.ts保持一致）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/config': path.resolve(__dirname, './src/config')
    }
  },

  // 定义全局变量（避免TypeScript错误）
  define: {
    'import.meta.vitest': 'undefined'
  }
});