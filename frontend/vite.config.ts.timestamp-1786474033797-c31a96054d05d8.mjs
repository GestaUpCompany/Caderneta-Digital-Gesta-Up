// vite.config.ts
import { defineConfig } from "file:///C:/Users/USER/Documents/Caderneta-Digital-Gesta-Up/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/USER/Documents/Caderneta-Digital-Gesta-Up/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/USER/Documents/Caderneta-Digital-Gesta-Up/frontend/node_modules/vite-plugin-pwa/dist/index.js";
import { splitVendorChunkPlugin } from "file:///C:/Users/USER/Documents/Caderneta-Digital-Gesta-Up/frontend/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  base: "/Caderneta-Digital-Gesta-Up/",
  server: {
    allowedHosts: true
  },
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.svg", "manejus360.png"],
      manifest: {
        name: "Gesta'Up Cadernetas Digitais",
        short_name: "Gesta'Up",
        description: "Cadernetas de campo para pe\xF5es de fazenda. Registre dados de maternidade, pastagens, rodeio, suplementa\xE7\xE3o, bebedouros e movimenta\xE7\xE3o offline e sincronize com Supabase.",
        theme_color: "#1a3a2a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/Caderneta-Digital-Gesta-Up/",
        scope: "/Caderneta-Digital-Gesta-Up/",
        lang: "pt-BR",
        dir: "ltr",
        categories: ["business", "productivity", "utilities"],
        icons: [
          {
            src: "/Caderneta-Digital-Gesta-Up/manejus360.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/Caderneta-Digital-Gesta-Up/manejus360.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      // injectManifest: usa nosso src/sw.ts customizado em vez do generateSW
      // Necessário para implementar NetworkFirst em navegação + plugin de Content-Type
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,pdf}"],
        globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        // 5MB
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    target: "es2015",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          state: ["@reduxjs/toolkit", "react-redux", "redux-persist"],
          ui: ["lucide-react"]
        }
      }
    },
    sourcemap: false,
    reportCompressedSize: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVU0VSXFxcXERvY3VtZW50c1xcXFxDYWRlcm5ldGEtRGlnaXRhbC1HZXN0YS1VcFxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcVVNFUlxcXFxEb2N1bWVudHNcXFxcQ2FkZXJuZXRhLURpZ2l0YWwtR2VzdGEtVXBcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL1VTRVIvRG9jdW1lbnRzL0NhZGVybmV0YS1EaWdpdGFsLUdlc3RhLVVwL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xyXG5pbXBvcnQgeyBzcGxpdFZlbmRvckNodW5rUGx1Z2luIH0gZnJvbSAndml0ZSdcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgYmFzZTogJy9DYWRlcm5ldGEtRGlnaXRhbC1HZXN0YS1VcC8nLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIHNwbGl0VmVuZG9yQ2h1bmtQbHVnaW4oKSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcclxuICAgICAgaW5qZWN0UmVnaXN0ZXI6IGZhbHNlLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uc3ZnJywgJ21hbmVqdXMzNjAucG5nJ10sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogXCJHZXN0YSdVcCBDYWRlcm5ldGFzIERpZ2l0YWlzXCIsXHJcbiAgICAgICAgc2hvcnRfbmFtZTogXCJHZXN0YSdVcFwiLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ2FkZXJuZXRhcyBkZSBjYW1wbyBwYXJhIHBlXHUwMEY1ZXMgZGUgZmF6ZW5kYS4gUmVnaXN0cmUgZGFkb3MgZGUgbWF0ZXJuaWRhZGUsIHBhc3RhZ2Vucywgcm9kZWlvLCBzdXBsZW1lbnRhXHUwMEU3XHUwMEUzbywgYmViZWRvdXJvcyBlIG1vdmltZW50YVx1MDBFN1x1MDBFM28gb2ZmbGluZSBlIHNpbmNyb25pemUgY29tIFN1cGFiYXNlLicsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMWEzYTJhJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy9DYWRlcm5ldGEtRGlnaXRhbC1HZXN0YS1VcC8nLFxyXG4gICAgICAgIHNjb3BlOiAnL0NhZGVybmV0YS1EaWdpdGFsLUdlc3RhLVVwLycsXHJcbiAgICAgICAgbGFuZzogJ3B0LUJSJyxcclxuICAgICAgICBkaXI6ICdsdHInLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IFsnYnVzaW5lc3MnLCAncHJvZHVjdGl2aXR5JywgJ3V0aWxpdGllcyddLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9DYWRlcm5ldGEtRGlnaXRhbC1HZXN0YS1VcC9tYW5lanVzMzYwLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55J1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnL0NhZGVybmV0YS1EaWdpdGFsLUdlc3RhLVVwL21hbmVqdXMzNjAucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9LFxyXG4gICAgICAvLyBpbmplY3RNYW5pZmVzdDogdXNhIG5vc3NvIHNyYy9zdy50cyBjdXN0b21pemFkbyBlbSB2ZXogZG8gZ2VuZXJhdGVTV1xyXG4gICAgICAvLyBOZWNlc3NcdTAwRTFyaW8gcGFyYSBpbXBsZW1lbnRhciBOZXR3b3JrRmlyc3QgZW0gbmF2ZWdhXHUwMEU3XHUwMEUzbyArIHBsdWdpbiBkZSBDb250ZW50LVR5cGVcclxuICAgICAgc3RyYXRlZ2llczogJ2luamVjdE1hbmlmZXN0JyxcclxuICAgICAgc3JjRGlyOiAnc3JjJyxcclxuICAgICAgZmlsZW5hbWU6ICdzdy50cycsXHJcbiAgICAgIGluamVjdE1hbmlmZXN0OiB7XHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdvZmYsd29mZjIscGRmfSddLFxyXG4gICAgICAgIGdsb2JJZ25vcmVzOiBbJyoqL25vZGVfbW9kdWxlcy8qKi8qJywgJ3N3LmpzJywgJ3dvcmtib3gtKi5qcyddLFxyXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiA1ICogMTAyNCAqIDEwMjQsIC8vIDVNQlxyXG4gICAgICB9LFxyXG4gICAgICBkZXZPcHRpb25zOiB7XHJcbiAgICAgICAgZW5hYmxlZDogZmFsc2VcclxuICAgICAgfVxyXG4gICAgfSlcclxuICBdLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxyXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcclxuICAgIHRlcnNlck9wdGlvbnM6IHtcclxuICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsXHJcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxyXG4gICAgICAgICAgc3RhdGU6IFsnQHJlZHV4anMvdG9vbGtpdCcsICdyZWFjdC1yZWR1eCcsICdyZWR1eC1wZXJzaXN0J10sXHJcbiAgICAgICAgICB1aTogWydsdWNpZGUtcmVhY3QnXVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogdHJ1ZVxyXG4gIH1cclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUErVyxTQUFTLG9CQUFvQjtBQUM1WSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsOEJBQThCO0FBRXZDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFFBQVE7QUFBQSxJQUNOLGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sdUJBQXVCO0FBQUEsSUFDdkIsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZ0JBQWdCO0FBQUEsTUFDaEIsZUFBZSxDQUFDLGVBQWUsZ0JBQWdCO0FBQUEsTUFDL0MsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFFBQ1AsTUFBTTtBQUFBLFFBQ04sS0FBSztBQUFBLFFBQ0wsWUFBWSxDQUFDLFlBQVksZ0JBQWdCLFdBQVc7QUFBQSxRQUNwRCxPQUFPO0FBQUEsVUFDTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUE7QUFBQTtBQUFBLE1BR0EsWUFBWTtBQUFBLE1BQ1osUUFBUTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsZ0JBQWdCO0FBQUEsUUFDZCxjQUFjLENBQUMsK0NBQStDO0FBQUEsUUFDOUQsYUFBYSxDQUFDLHdCQUF3QixTQUFTLGNBQWM7QUFBQSxRQUM3RCwrQkFBK0IsSUFBSSxPQUFPO0FBQUE7QUFBQSxNQUM1QztBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxlQUFlO0FBQUEsTUFDakI7QUFBQSxJQUNGO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2pELE9BQU8sQ0FBQyxvQkFBb0IsZUFBZSxlQUFlO0FBQUEsVUFDMUQsSUFBSSxDQUFDLGNBQWM7QUFBQSxRQUNyQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxXQUFXO0FBQUEsSUFDWCxzQkFBc0I7QUFBQSxFQUN4QjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
