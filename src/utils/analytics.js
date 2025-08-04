// Analytics and monitoring system
class AnalyticsManager {
  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.sessionId = this.generateSessionId();
    this.pageStartTime = Date.now();
    this.events = [];
    this.userProperties = {};
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize analytics (Google Analytics, etc.)
  init() {
    if (this.isProduction && typeof window !== 'undefined') {
      // Google Analytics 4 setup
      const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

      if (GA_MEASUREMENT_ID) {
        // Load Google Analytics
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;

        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID, {
          session_id: this.sessionId,
          custom_map: {
            custom_parameter_1: 'app_version',
            custom_parameter_2: 'user_role'
          }
        });
      }
    }
  }

  // Track page views
  trackPageView(pageName, additionalData = {}) {
    const event = {
      type: 'page_view',
      page: pageName,
      timestamp: Date.now(),
      session_id: this.sessionId,
      ...additionalData
    };

    this.events.push(event);

    if (this.isProduction && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
        ...additionalData
      });
    }

    console.log('Page View:', event);
  }

  // Track user actions
  trackEvent(action, category = 'user_interaction', label = '', value = 0, additionalData = {}) {
    const event = {
      type: 'event',
      action,
      category,
      label,
      value,
      timestamp: Date.now(),
      session_id: this.sessionId,
      ...additionalData
    };

    this.events.push(event);

    if (this.isProduction && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
        ...additionalData
      });
    }

    console.log('Event:', event);
  }

  // Track errors
  trackError(error, context = '') {
    const errorEvent = {
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      session_id: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.events.push(errorEvent);

    if (this.isProduction && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_parameter_1: context
      });
    }

    console.error('Error Tracked:', errorEvent);
  }

  // Track user properties
  setUserProperties(properties) {
    this.userProperties = { ...this.userProperties, ...properties };

    if (this.isProduction && window.gtag) {
      window.gtag('set', {
        user_properties: this.userProperties
      });
    }
  }

  // Track conversion events
  trackConversion(conversionType, value = 0, currency = 'NOK') {
    const conversion = {
      type: 'conversion',
      conversion_type: conversionType,
      value,
      currency,
      timestamp: Date.now(),
      session_id: this.sessionId
    };

    this.events.push(conversion);

    if (this.isProduction && window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: import.meta.env.VITE_GA_CONVERSION_ID,
        value: value,
        currency: currency,
        transaction_id: this.generateTransactionId()
      });
    }

    console.log('Conversion:', conversion);
  }

  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get session data
  getSessionData() {
    return {
      sessionId: this.sessionId,
      events: this.events,
      userProperties: this.userProperties,
      sessionDuration: Date.now() - this.pageStartTime
    };
  }

  // Send batch data to analytics service
  async sendBatchData() {
    if (!this.isProduction) return;

    try {
      const sessionData = this.getSessionData();

      // In a real application, send to your analytics API
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(sessionData)
      // });

      console.log('Analytics batch sent:', sessionData);
    } catch (error) {
      console.error('Failed to send analytics batch:', error);
    }
  }
}

// React hooks for analytics
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const globalAnalytics = new AnalyticsManager();

export function useAnalytics() {
  const location = useLocation();
  const analytics = useRef(globalAnalytics).current;

  useEffect(() => {
    analytics.init();
  }, [analytics]);

  // Track page views on route changes
  useEffect(() => {
    const pageName = location.pathname;
    analytics.trackPageView(pageName);
  }, [location, analytics]);

  const trackEvent = useCallback((action, category, label, value, additionalData) => {
    analytics.trackEvent(action, category, label, value, additionalData);
  }, [analytics]);

  const trackError = useCallback((error, context) => {
    analytics.trackError(error, context);
  }, [analytics]);

  const setUserProperties = useCallback((properties) => {
    analytics.setUserProperties(properties);
  }, [analytics]);

  const trackConversion = useCallback((type, value, currency) => {
    analytics.trackConversion(type, value, currency);
  }, [analytics]);

  return {
    trackEvent,
    trackError,
    setUserProperties,
    trackConversion
  };
}

// Hook for user behavior tracking
export function useUserBehavior() {
  const { trackEvent } = useAnalytics();

  const trackClick = useCallback((elementName, context = '') => {
    trackEvent('click', 'user_interaction', elementName, 1, { context });
  }, [trackEvent]);

  const trackFormSubmission = useCallback((formName, success = true) => {
    trackEvent('form_submit', 'form_interaction', formName, success ? 1 : 0, { success });
  }, [trackEvent]);

  const trackSearchQuery = useCallback((query, resultCount = 0) => {
    trackEvent('search', 'search_interaction', query, resultCount);
  }, [trackEvent]);

  const trackFileDownload = useCallback((fileName, fileType) => {
    trackEvent('file_download', 'download', fileName, 1, { file_type: fileType });
  }, [trackEvent]);

  return {
    trackClick,
    trackFormSubmission,
    trackSearchQuery,
    trackFileDownload
  };
}

// Performance tracking hook
export function usePerformanceTracking() {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Track Core Web Vitals
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        trackEvent('lcp', 'performance', 'core_web_vitals', Math.round(lastEntry.startTime));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          trackEvent('fid', 'performance', 'core_web_vitals', Math.round(fid));
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        trackEvent('cls', 'performance', 'core_web_vitals', Math.round(clsValue * 1000));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, [trackEvent]);
}

export { globalAnalytics };
export default AnalyticsManager;
