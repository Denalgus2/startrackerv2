import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
    const base = command === 'build' ? '/startrackerv2/' : '/'

    return {
        plugins: [
            react({
                // Enable React Fast Refresh for development
                fastRefresh: true,
                // Optimize imports in production
                babel: {
                    plugins: command === 'build' ? ['babel-plugin-react-remove-properties'] : []
                }
            }),
            tailwindcss(),
            VitePWA({
                registerType: 'autoUpdate',
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                    runtimeCaching: [
                        {
                            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'google-fonts-cache',
                                expiration: {
                                    maxEntries: 10,
                                    maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                                }
                            }
                        },
                        {
                            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'firestore-cache',
                                expiration: {
                                    maxEntries: 100,
                                    maxAgeSeconds: 60 * 60 * 24 // 24 hours
                                }
                            }
                        }
                    ]
                },
                includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
                manifest: {
                    name: 'Star Tracker V2',
                    short_name: 'StarTracker',
                    description: 'Employee performance tracking and star management system',
                    theme_color: '#2563eb',
                    background_color: '#ffffff',
                    display: 'standalone',
                    scope: base,
                    start_url: base,
                    icons: [
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any maskable'
                        }
                    ]
                }
            })
        ],
        base,
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false, // Disable in production for security
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: true, // Remove console.logs in production
                    drop_debugger: true
                }
            },
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                        firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
                        ui: ['framer-motion', 'lucide-react'],
                        router: ['react-router-dom'],
                        utils: ['date-fns']
                    },
                    chunkFileNames: 'assets/[name]-[hash].js',
                    entryFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash].[ext]'
                }
            },
            target: 'esnext',
            cssCodeSplit: true
        },
        server: {
            open: true,
            port: 3000,
            host: true
        },
        preview: {
            port: 3000
        },
        define: {
            __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
        }
    }
})
