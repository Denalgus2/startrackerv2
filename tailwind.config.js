/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'background': '#eef0f2',      // A soft, slightly darker gray background
                'surface': '#ffffff',        // Pure white for cards and modals
                'primary': '#00a960',        // Elkjøp's vibrant green
                'primary-focus': '#00874d',
                'secondary': '#007bff',      // A professional blue for accents
                'on-surface': '#212529',      // Very dark gray for primary text
                'on-surface-secondary': '#6c757d',
                'border-color': '#dee2e6',
                'danger': '#dc3545',
            }
        },
    },
    plugins: [],
}