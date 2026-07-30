import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: 'globalThis',
  },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/@stellar/stellar-sdk') || id.includes('node_modules/@stellar/freighter-api')) {
            return 'stellar-sdk';
          }
          if (id.includes('node_modules/@creit-tech/stellar-wallets-kit')) {
            return 'wallet-kit';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      VITE_SOROBAN_CONTRACT_ID: 'CASTP46VFFVDQ77FUIDTTTXBBGYIX4YZTANUIVYGGVDXC67UL7VEVLTV',
    },
    server: {
      deps: {
        inline: ['@stellar/freighter-api', '@creit-tech/stellar-wallets-kit', '@jsr/creit-tech__stellar-wallets-kit']
      }
    }
  }
})
