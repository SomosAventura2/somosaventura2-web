import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Importa vite-plugin-pwa cuando instales una versión compatible con Vite 8:
// import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Descomenta este bloque cuando tengas vite-plugin-pwa instalado y compatible:
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.svg', 'icons.svg'],
    //   manifest: {
    //     name: 'CashFlow USDT',
    //     short_name: 'CashFlow',
    //     description: 'Control de operaciones de efectivo y USDT',
    //     theme_color: '#000000',
    //     background_color: '#000000',
    //     display: 'standalone',
    //     start_url: '/',
    //     icons: [
    //       {
    //         src: '/icon-192.png',
    //         sizes: '192x192',
    //         type: 'image/png',
    //       },
    //       {
    //         src: '/icon-512.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //       },
    //     ],
    //   },
    // }),
  ],
})
