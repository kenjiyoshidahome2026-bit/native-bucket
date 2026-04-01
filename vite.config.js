import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cloudflare } from "@cloudflare/vite-plugin";

const banner = `/*!
 * FileIO.js v1.0.0
 * (c) 2026 Kenji Yoshida
 * Released under the MIT License.
 */`;

export default defineConfig({
  plugins: [cloudflare()],
  build: {
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      format: {
        comments: /^\!/, // 「!」で始まるコメント（ライセンス等）を残す設定
        preamble: banner  // ファイルの最先端に必ずこれを置く設定
      }
    },
    lib: {
      entry: resolve(__dirname, 'src/index.js'), 
      name: 'nativeBucket',
      fileName: 'native-bucket',
      formats: ['iife']
    },
    outDir: 'dist',
  }
})