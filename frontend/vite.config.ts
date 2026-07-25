import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: 'globalThis',
  },
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      VITE_SOROBAN_CONTRACT_ID: 'CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY',
    },
    server: {
      deps: {
        inline: ['@stellar/freighter-api', '@creit-tech/stellar-wallets-kit', '@jsr/creit-tech__stellar-wallets-kit']
      }
    }
  }
})