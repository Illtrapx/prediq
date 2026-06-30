import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
  },
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own long-cached chunks so they load in
        // parallel and survive app-code redeploys (better repeat-visit caching).
        // ethers v6 is monolithic (Contract + providers drag in abi/crypto/rlp),
        // so it won't tree-shake below ~94 KB gz. Keep it a separate chunk anyway:
        // loads in parallel with the entry and stays cached across app redeploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          ethers: ['ethers'],
          wallet: ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
        },
      },
    },
  },
  server: {
    headers: {
      // `same-origin-allow-popups` lets the wallet/OAuth popups talk back to us.
      // No COEP: the relayer-sdk's initSDK() degrades to single-threaded WASM
      // without crossOriginIsolation, so FHE still works — just no thread pool.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
