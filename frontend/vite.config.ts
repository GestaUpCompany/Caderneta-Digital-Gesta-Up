import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  base: '/Caderneta-Digital-Gesta-Up/',
  server: {
    allowedHosts: true,
  },
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'manejus360.png'],
      manifest: {
        name: "Gesta'Up Cadernetas Digitais",
        short_name: "Gesta'Up",
        description: 'Cadernetas de campo para peões de fazenda. Registre dados de maternidade, pastagens, rodeio, suplementação, bebedouros e movimentação offline e sincronize com Google Sheets.',
        theme_color: '#1a3a2a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Caderneta-Digital-Gesta-Up/',
        scope: '/Caderneta-Digital-Gesta-Up/',
        lang: 'pt-BR',
        dir: 'ltr',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: '/Caderneta-Digital-Gesta-Up/manejus360.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/Caderneta-Digital-Gesta-Up/manejus360.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // injectManifest: usa nosso src/sw.ts customizado em vez do generateSW
      // Necessário para implementar NetworkFirst em navegação + plugin de Content-Type
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,pdf}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          ui: ['lucide-react']
        }
      }
    },
    sourcemap: false,
    reportCompressedSize: true
  }
})
