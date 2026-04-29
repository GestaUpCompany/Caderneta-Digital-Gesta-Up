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
      includeAssets: ['favicon.svg', 'logo-gestaup-app-cadernetadigital.png'],
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
            src: '/Caderneta-Digital-Gesta-Up/logo-gestaup-app-cadernetadigital.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/Caderneta-Digital-Gesta-Up/logo-gestaup-app-cadernetadigital.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,pdf}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        navigateFallback: '/Caderneta-Digital-Gesta-Up/index.html',
        skipWaiting: false,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            // Estratégia mais agressiva para arquivos JS/CSS para garantir atualizações
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dias
              }
            }
          }
        ],
        cleanupOutdatedCaches: true
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
