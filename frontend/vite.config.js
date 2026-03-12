import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico'],
        manifest: {
          name: 'MiTechnologies WMS',
          short_name: 'MiTech WMS',
          description: 'Sistema de almacén con QR y racks',
          theme_color: '#0b3b8f',
          background_color: '#0b3b8f',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ],
})
