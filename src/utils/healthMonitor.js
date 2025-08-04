// Application health monitoring and diagnostics
class HealthMonitor {
  constructor() {
    this.checks = new Map();
    this.status = 'unknown';
    this.lastCheck = null;
    this.checkInterval = 30000; // 30 seconds
    this.intervalId = null;
  }

  // Register health checks
  registerCheck(name, checkFunction, critical = false) {
    this.checks.set(name, {
      function: checkFunction,
      critical,
      lastResult: null,
      lastError: null
    });
  }

  // Run all health checks
  async runHealthChecks() {
    const results = new Map();
    let overallHealthy = true;
    let criticalFailure = false;

    for (const [name, check] of this.checks.entries()) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          check.function(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);

        const duration = Date.now() - startTime;

        const checkResult = {
          status: result ? 'healthy' : 'unhealthy',
          duration,
          timestamp: new Date().toISOString(),
          error: null
        };

        results.set(name, checkResult);
        check.lastResult = checkResult;
        check.lastError = null;

        if (!result) {
          overallHealthy = false;
          if (check.critical) {
            criticalFailure = true;
          }
        }
      } catch (error) {
        const checkResult = {
          status: 'error',
          duration: 0,
          timestamp: new Date().toISOString(),
          error: error.message
        };

        results.set(name, checkResult);
        check.lastResult = checkResult;
        check.lastError = error;

        overallHealthy = false;
        if (check.critical) {
          criticalFailure = true;
        }
      }
    }

    this.status = criticalFailure ? 'critical' : (overallHealthy ? 'healthy' : 'degraded');
    this.lastCheck = new Date().toISOString();

    return {
      status: this.status,
      timestamp: this.lastCheck,
      checks: Object.fromEntries(results),
      summary: {
        total: this.checks.size,
        healthy: Array.from(results.values()).filter(r => r.status === 'healthy').length,
        unhealthy: Array.from(results.values()).filter(r => r.status === 'unhealthy').length,
        errors: Array.from(results.values()).filter(r => r.status === 'error').length
      }
    };
  }

  // Start continuous monitoring
  startMonitoring() {
    this.stopMonitoring(); // Clear any existing interval

    this.intervalId = setInterval(async () => {
      try {
        const health = await this.runHealthChecks();

        // Emit health status event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('healthStatus', {
            detail: health
          }));
        }

        // Log critical issues
        if (health.status === 'critical') {
          console.error('Critical health check failure:', health);
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, this.checkInterval);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Get current health status
  getStatus() {
    return {
      status: this.status,
      lastCheck: this.lastCheck,
      checksRegistered: this.checks.size
    };
  }
}

// Default health checks
const defaultHealthChecks = {
  // Firebase connection check
  firebaseConnection: async () => {
    try {
      if (typeof window === 'undefined') return true;

      // Use a lightweight endpoint that returns 204 (no content) for connectivity check
      const response = await fetch('https://www.googleapis.com/generate_204', {
        method: 'GET',
        mode: 'no-cors'
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Local storage availability
  localStorage: async () => {
    try {
      if (typeof window === 'undefined') return true;

      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Memory usage check
  memoryUsage: async () => {
    try {
      if (typeof window === 'undefined' || !performance.memory) return true;

      const memory = performance.memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      // Consider unhealthy if using more than 85% of available memory
      return usagePercent < 85;
    } catch (error) {
      return true; // If we can't check, assume it's okay
    }
  },

  // Network connectivity
  networkConnectivity: async () => {
    try {
      if (typeof navigator === 'undefined') return true;
      return navigator.onLine;
    } catch (error) {
      return true;
    }
  },

  // Service worker status
  serviceWorker: async () => {
    try {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return true;

      const registration = await navigator.serviceWorker.getRegistration();
      return registration ? registration.active !== null : true;
    } catch (error) {
      return true; // Not critical if SW is not available
    }
  }
};

// React hook for health monitoring
import { useEffect, useState, useCallback } from 'react';

export function useHealthMonitor() {
  const [health, setHealth] = useState(null);
  const [monitor] = useState(() => new HealthMonitor());

  useEffect(() => {
    // Register default health checks
    Object.entries(defaultHealthChecks).forEach(([name, checkFn]) => {
      const critical = name === 'firebaseConnection' || name === 'networkConnectivity';
      monitor.registerCheck(name, checkFn, critical);
    });

    // Listen for health status updates
    const handleHealthStatus = (event) => {
      setHealth(event.detail);
    };

    window.addEventListener('healthStatus', handleHealthStatus);

    // Start monitoring
    monitor.startMonitoring();

    // Run initial check
    monitor.runHealthChecks().then(setHealth);

    return () => {
      window.removeEventListener('healthStatus', handleHealthStatus);
      monitor.stopMonitoring();
    };
  }, [monitor]);

  const runManualCheck = useCallback(async () => {
    const result = await monitor.runHealthChecks();
    setHealth(result);
    return result;
  }, [monitor]);

  const registerCheck = useCallback((name, checkFn, critical = false) => {
    monitor.registerCheck(name, checkFn, critical);
  }, [monitor]);

  return {
    health,
    runManualCheck,
    registerCheck,
    status: monitor.getStatus()
  };
}

export default HealthMonitor;
