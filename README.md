# Stjernekamp - StarTracker v2

A comprehensive star tracking system for Elkjøp staff performance management.

## Features

- 🌟 Staff performance tracking with star system
- 📊 Sales registration with multiplier calculations
- 📅 Weekly reviews and shift management
- 👥 Staff management with real-time updates
- 🔐 Authentication with email verification (now supports username login)
- 📱 Responsive design with Elkjøp branding

## Tech Stack

- React 19 with Vite
- Firebase (Authentication & Firestore)
- Tailwind CSS
- Framer Motion
- React Router

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment (Recommended)

1. **Push to GitHub**: Make sure your repository is on GitHub
2. **Enable GitHub Pages**: 
   - Go to your repository settings
   - Navigate to Pages section
   - Set source to "GitHub Actions"
3. **Update homepage URL**: In `package.json`, change the homepage field to match your repository:
   ```json
   "homepage": "https://yourusername.github.io/your-repo-name"
   ```
4. **Update base path**: In `vite.config.js`, update the base path to match your repository name:
   ```javascript
   base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/'
   ```
5. **Push to main branch**: The GitHub Actions workflow will automatically build and deploy your app

### Manual Deployment

If you prefer manual deployment:

```bash
# Install gh-pages if not already installed
npm install --save-dev gh-pages

# Deploy to GitHub Pages
npm run deploy
```

## Firebase Configuration

Make sure to configure your Firebase project and update the Firebase config in `src/firebase.js` with your project credentials.

## Authentication

The app now supports both email and username authentication:
- **Registration**: Users can create accounts with email and username
- **Login**: Users can log in using either their email address or username

## Project Structure

- `/src/pages/` - Main application pages
- `/src/components/` - Reusable React components  
- `/src/contexts/` - React context providers
- `/src/data/` - Data services and utilities
- `/public/` - Static assets

## License

Private project for Elkjøp internal use.
