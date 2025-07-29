import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
    const base = command === 'build' ? '/startrackerv2/' : '/'

    return {
        plugins: [
            react(),
            tailwindcss(),
        ],
        base,
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            rollupOptions: {
                output: {
                    manualChunks: undefined,
                },
            },
        },
        server: {
            open: true
        }
    }
})