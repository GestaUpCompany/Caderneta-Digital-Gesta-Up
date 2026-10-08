import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path e nome do app vêm do ambiente para permitir o deploy de staging em outro repo do Pages.
// Sem as variáveis, o build é idêntico ao de produção.
const BASE = process.env.VITE_BASE_PATH || '/Caderneta-Digital-Gesta-Up/'
const APP_NAME = process.env.VITE_APP_NAME || "Gesta'Up Cadernetas Digitais"
const APP_SHORT_NAME = process.env.VITE_APP_SHORT_NAME || "Gesta'Up"

export default defineConfig({
  base: BASE,
  server: {
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'manejus360.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: 'Cadernetas de campo para peões de fazenda. Registre dados de maternidade, pastagens, rodeio, suplementação, bebedouros e movimentação offline e sincronize com Supabase.',
        theme_color: '#1a3a2a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        lang: 'pt-BR',
        dir: 'ltr',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: `${BASE}manejus360.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${BASE}manejus360.png`,
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2,pdf}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    target: 'es2020',
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
          ui: ['lucide-react'],
          map: ['maplibre-gl', 'react-map-gl/maplibre', '@turf/turf']
        }
      }
    },
    sourcemap: false,
    reportCompressedSize: true
  }
})
