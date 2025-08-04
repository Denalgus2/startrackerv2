// Service Worker registration and management
import { Workbox } from 'workbox-window';

class ServiceWorkerManager {
  constructor() {
    this.wb = null;
    this.registration = null;
    this.updateAvailable = false;
  }

  async register() {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      try {
        this.wb = new Workbox('/sw.js');

        // Service worker events
        this.wb.addEventListener('installed', (event) => {
          if (event.isUpdate) {
            this.handleUpdate();
          } else {
            this.handleInstall();
          }
        });

        this.wb.addEventListener('waiting', () => {
          this.updateAvailable = true;
          this.showUpdatePrompt();
        });

        this.wb.addEventListener('controlling', () => {
          window.location.reload();
        });

        this.wb.addEventListener('activated', (event) => {
          if (!event.isUpdate) {
            this.showInstallPrompt();
          }
        });

        // Register the service worker
        this.registration = await this.wb.register();
        console.log('Service Worker registered successfully');

        return this.registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  handleInstall() {
    // Show notification that app is ready for offline use
    if (window.showNotification) {
      window.showNotification('success', 'Appen er nå tilgjengelig offline!', {
        title: 'Installert',
        duration: 5000
      });
    }
  }

  handleUpdate() {
    // App has been updated and is ready
    if (window.showNotification) {
      window.showNotification('info', 'En ny versjon er tilgjengelig. Last siden på nytt for å oppdatere.', {
        title: 'Oppdatering tilgjengelig',
        persistent: true
      });
    }
  }

  showUpdatePrompt() {
    // Create custom update prompt
    const updateBanner = document.createElement('div');
    updateBanner.id = 'update-banner';
    updateBanner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 flex items-center justify-between';
    updateBanner.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
        </svg>
        <span>En ny versjon er tilgjengelig</span>
      </div>
      <div class="flex gap-2">
        <button id="update-btn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">
          Oppdater nå
        </button>
        <button id="dismiss-btn" class="text-white/80 hover:text-white px-2">
          ×
        </button>
      </div>
    `;

    document.body.appendChild(updateBanner);

    // Add event listeners
    document.getElementById('update-btn').addEventListener('click', () => {
      this.skipWaiting();
      updateBanner.remove();
    });

    document.getElementById('dismiss-btn').addEventListener('click', () => {
      updateBanner.remove();
    });
  }

  showInstallPrompt() {
    // Show PWA install prompt
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show custom install button
      this.showInstallButton(deferredPrompt);
    });
  }

  showInstallButton(deferredPrompt) {
    const installButton = document.createElement('button');
    installButton.id = 'install-btn';
    installButton.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 z-50';
    installButton.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
        Installer app
      </div>
    `;

    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          console.log('PWA install prompt accepted');
        }

        deferredPrompt = null;
        installButton.remove();
      }
    });

    document.body.appendChild(installButton);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (installButton.parentNode) {
        installButton.remove();
      }
    }, 10000);
  }

  async skipWaiting() {
    if (this.wb && this.wb.waiting) {
      this.wb.messageSkipWaiting();
    }
  }

  async checkForUpdates() {
    if (this.registration) {
      await this.registration.update();
    }
  }

  unregister() {
    if (this.registration) {
      this.registration.unregister();
    }
  }
}

// React hook for service worker
import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [swManager] = useState(() => new ServiceWorkerManager());
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const initSW = async () => {
      const registration = await swManager.register();
      if (registration) {
        setIsInstalled(true);
      }
    };

    initSW();

    // Check for updates every 30 minutes
    const interval = setInterval(() => {
      swManager.checkForUpdates();
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [swManager]);

  return {
    isInstalled,
    updateAvailable,
    checkForUpdates: () => swManager.checkForUpdates(),
    skipWaiting: () => swManager.skipWaiting()
  };
}

export default ServiceWorkerManager;
