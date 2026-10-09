import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Base path e nome do app vêm do ambiente para permitir o deploy de staging em outro repo do Pages.
// Sem as variáveis, o build é idêntico ao de produção.
const BASE = process.env.VITE_BASE_PATH || '/Caderneta-Digital-Gesta-Up/'
const APP_NAME = process.env.VITE_APP_NAME || "Gesta'Up Cadernetas Digitais"
const APP_SHORT_NAME = process.env.VITE_APP_SHORT_NAME || "Gesta'Up"

// Versão: package.json (marcos) + identificador de build automático (data em Cuiabá + commit).
// No CI vem de VITE_APP_BUILD; local calcula pelo git.
const APP_VERSION = JSON.parse(readFileSync('./package.json', 'utf-8')).version as string
const APP_ENV = process.env.VITE_APP_ENV || 'producao'
function calcularBuild(): string {
  if (process.env.VITE_APP_BUILD) return process.env.VITE_APP_BUILD
  const data = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cuiaba' }).format(new Date()).replace(/-/g, '.')
  try {
    return `${data}-${execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}`
  } catch {
    return `${data}-local`
  }
}
const APP_BUILD = calcularBuild()

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BUILD__: JSON.stringify(APP_BUILD),
    __APP_ENV__: JSON.stringify(APP_ENV),
  },
  server: {
    allowedHosts: true,
  },
  plugins: [
    react(),
    // Publica /version.json para conferir a versão no ar sem abrir o app
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ versao: APP_VERSION, build: APP_BUILD, env: APP_ENV }),
        })
      },
    },
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
