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

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router'))
              return 'vendor-react'
            if (id.includes('@mui') || id.includes('@emotion'))
              return 'vendor-mui'
            if (id.includes('recharts') || id.includes('d3-'))
              return 'vendor-charts'
            if (id.includes('/xlsx'))
              return 'vendor-xlsx'
            if (id.includes('html5-qrcode') || id.includes('zxing'))
              return 'vendor-scanner'
            if (id.includes('socket.io'))
              return 'vendor-socket'
          }
        },
      },
    },
  },
})
