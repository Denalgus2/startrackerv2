// Performance monitoring and analytics utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.isProduction = import.meta.env.PROD;

    // Initialize performance observer for monitoring
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initPerformanceObserver();
    }
  }

  initPerformanceObserver() {
    try {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('FID', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitor Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric('CLS', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  recordMetric(name, value, tags = {}) {
    const timestamp = Date.now();
    this.metrics.set(name, { value, timestamp, tags });

    // In production, send to analytics service
    if (this.isProduction && window.gtag) {
      window.gtag('event', 'performance_metric', {
        custom_parameter_1: name,
        custom_parameter_2: value,
        ...tags
      });
    }

    // Log in development
    if (!this.isProduction) {
      console.log(`Performance Metric - ${name}:`, value, tags);
    }
  }

  // Track component render times
  trackComponentRender(componentName, renderTime) {
    this.recordMetric('component_render', renderTime, { component: componentName });
  }

  // Track user interactions
  trackUserAction(action, duration = 0, metadata = {}) {
    this.recordMetric('user_action', duration, { action, ...metadata });

    // Send to analytics
    if (this.isProduction && window.gtag) {
      window.gtag('event', action, {
        event_category: 'user_interaction',
        event_label: metadata.label || '',
        value: duration
      });
    }
  }

  // Track page load performance
  trackPageLoad(pageName) {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;

        this.recordMetric('page_load', loadTime, { page: pageName });
        this.recordMetric('dom_ready', domContentLoaded, { page: pageName });
      }
    }
  }

  // Get all metrics for reporting
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Send batch metrics to monitoring service
  async sendMetrics() {
    if (!this.isProduction) return;

    try {
      const metrics = this.getMetrics();
      // In a real application, you would send this to your analytics/monitoring service
      // Example: await fetch('/api/metrics', { method: 'POST', body: JSON.stringify(metrics) });
      console.log('Metrics sent:', metrics);
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }
}

// React hook for performance monitoring
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName) {
  const renderStart = useRef(Date.now());
  const monitor = useRef(new PerformanceMonitor()).current;

  useEffect(() => {
    const renderTime = Date.now() - renderStart.current;
    monitor.trackComponentRender(componentName, renderTime);
  });

  return {
    trackAction: monitor.trackUserAction.bind(monitor),
    trackPageLoad: monitor.trackPageLoad.bind(monitor),
    recordMetric: monitor.recordMetric.bind(monitor)
  };
}

// Memory usage monitoring
export function useMemoryMonitor() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const checkMemory = () => {
        const memory = performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);

        // Warn if memory usage is high
        const usagePercent = (usedMB / limitMB) * 100;
        if (usagePercent > 80) {
          console.warn(`High memory usage: ${usedMB}MB (${usagePercent.toFixed(1)}%)`);
        }

        return { usedMB, totalMB, limitMB, usagePercent };
      };

      // Check memory usage every 30 seconds
      const interval = setInterval(checkMemory, 30000);
      return () => clearInterval(interval);
    }
  }, []);
}

export default PerformanceMonitor;
