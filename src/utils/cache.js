// Advanced caching system for Firebase data
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.expiryTimes = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, data);
    this.expiryTimes.set(key, Date.now() + ttl);

    // Clean up expired entries periodically
    setTimeout(() => this.cleanup(), ttl + 1000);
  }

  get(key) {
    const now = Date.now();
    const expiry = this.expiryTimes.get(key);

    if (!expiry || now > expiry) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.expiryTimes.delete(key);
  }

  clear() {
    this.cache.clear();
    this.expiryTimes.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.expiryTimes.entries()) {
      if (now > expiry) {
        this.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  estimateMemoryUsage() {
    let size = 0;
    for (const [key, value] of this.cache.entries()) {
      size += new Blob([JSON.stringify({ key, value })]).size;
    }
    return `${(size / 1024).toFixed(2)} KB`;
  }
}

// React hook for cached data fetching
import { useState, useEffect, useCallback } from 'react';

const globalCache = new CacheManager();

export function useCachedData(key, fetchFunction, dependencies = [], options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate = true,
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  const fetchData = useCallback(async (attempt = 1) => {
    try {
      setError(null);

      // Check cache first
      const cachedData = globalCache.get(key);
      if (cachedData && !staleWhileRevalidate) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      // If we have stale data, show it while fetching fresh data
      if (cachedData && staleWhileRevalidate) {
        setData(cachedData);
        setLoading(false);
      }

      // Fetch fresh data
      const freshData = await fetchFunction();
      globalCache.set(key, freshData, ttl);
      setData(freshData);
      setLoading(false);

    } catch (err) {
      console.error(`Fetch error for ${key}:`, err);

      // Retry logic
      if (attempt < retryAttempts) {
        setTimeout(() => fetchData(attempt + 1), retryDelay * attempt);
        return;
      }

      setError(err);
      setLoading(false);

      // If we have cached data, use it as fallback
      const cachedData = globalCache.get(key);
      if (cachedData) {
        setData(cachedData);
        console.warn(`Using cached data as fallback for ${key}`);
      }
    }
  }, [key, fetchFunction, ttl, staleWhileRevalidate, retryAttempts, retryDelay]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const invalidate = useCallback(() => {
    globalCache.delete(key);
    fetchData();
  }, [key, fetchData]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, loading, error, invalidate, refetch };
}

// Batch operations for better performance
export class BatchProcessor {
  constructor(batchSize = 10, delay = 100) {
    this.queue = [];
    this.batchSize = batchSize;
    this.delay = delay;
    this.processing = false;
  }

  add(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processBatch();
    });
  }

  async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      try {
        const results = await Promise.allSettled(
          batch.map(item => item.operation())
        );

        results.forEach((result, index) => {
          const item = batch[index];
          if (result.status === 'fulfilled') {
            item.resolve(result.value);
          } else {
            item.reject(result.reason);
          }
        });

      } catch (error) {
        batch.forEach(item => item.reject(error));
      }

      // Add delay between batches to prevent overwhelming the server
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    this.processing = false;
  }
}

// Local storage with expiration
export class PersistentCache {
  constructor(prefix = 'startracker_') {
    this.prefix = prefix;
  }

  set(key, data, ttl = 24 * 60 * 60 * 1000) { // 24 hours default
    const item = {
      data,
      expiry: Date.now() + ttl,
      version: '1.0.0' // For cache invalidation on app updates
    };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      // Handle quota exceeded or other storage errors
      this.cleanup();
    }
  }

  get(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);

      // Check expiry
      if (Date.now() > parsed.expiry) {
        this.delete(key);
        return null;
      }

      // Check version compatibility
      if (parsed.version !== '1.0.0') {
        this.delete(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      this.delete(key);
      return null;
    }
  }

  delete(key) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  cleanup() {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (now > item.expiry) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove corrupted items
          localStorage.removeItem(key);
        }
      }
    });
  }

  getStats() {
    const keys = Object.keys(localStorage);
    const ourKeys = keys.filter(key => key.startsWith(this.prefix));

    let totalSize = 0;
    ourKeys.forEach(key => {
      totalSize += localStorage.getItem(key).length;
    });

    return {
      itemCount: ourKeys.length,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      keys: ourKeys.map(key => key.replace(this.prefix, ''))
    };
  }
}

export { globalCache };
export default CacheManager;
