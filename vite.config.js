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
            open: true,
            host: '0.0.0.0', // This will expose it to your network
            port: 5173, // Default Vite port
            strictPort: false, // Allow fallback to other ports if 5173 is busy
            // Temporarily disable HTTPS for development to avoid SSL issues
            // https: {
            //     // Better HTTPS configuration for development
            //     key: undefined, // Let Vite generate self-signed cert
            //     cert: undefined,
            //     // Allow insecure connections for development
            //     rejectUnauthorized: false
            // },
        }
    }
})