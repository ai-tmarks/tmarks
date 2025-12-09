import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      crx({ manifest: manifest as any })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      // 生产环境优化
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          // 删除 console
          drop_console: true,
          // 删除 debugger
          drop_debugger: true,
          // 移除未使用的代码
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        },
        format: {
          // 删除注释
          comments: false,
        },
        mangle: {
          // 混淆变量名
          toplevel: true,
        },
      } : undefined,
      rollupOptions: {
        input: {
          popup: 'src/popup/index.html',
          options: 'src/options/index.html'
        }
      },
      // 禁用源码映射以保护代码
      sourcemap: false,
    }
  };
});
