// Production-ready performance optimizations

// Enhanced performance monitoring for both dev and production
export const performanceMonitor = {
  measureAsync: async <T>(name: string, asyncFn: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    const result = await asyncFn()
    const end = performance.now()
    
    const duration = end - start
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${name} took ${duration.toFixed(2)}ms`)
    }
    
    // Log slow operations in production
    if (process.env.NODE_ENV === 'production' && duration > 1000) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`)
    }
    
    return result
  },

  measure: <T>(name: string, fn: () => T): T => {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    const duration = end - start
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${name} took ${duration.toFixed(2)}ms`)
    }
    
    if (process.env.NODE_ENV === 'production' && duration > 100) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`)
    }
    
    return result
  }
}

// Performance-optimized cache with LRU eviction
export class LRUCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
export const apiCache = new LRUCache(50, 2 * 60 * 1000); // 2 minutes for API responses
export const componentCache = new LRUCache(20, 5 * 60 * 1000); // 5 minutes for component data

// Enhanced database query optimization
export const optimizeQuery = {
  withCache: <T>(key: string, fn: () => Promise<T>, ttl: number = 60_000): Promise<T> => {
    return new Promise(async (resolve) => {
      const cached = apiCache.get(key) as T | null
      if (cached) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 Cache hit for ${key}`)
        }
        resolve(cached)
        return
      }
      
      const result = await fn()
      apiCache.set(key, result)
      resolve(result)
    })
  },

  // Batch multiple queries to reduce database round trips
  batchQueries: async <T>(
    queries: Array<{ key: string; fn: () => Promise<T> }>,
    options: { parallel?: boolean; timeout?: number } = {}
  ): Promise<T[]> => {
    const { parallel = true, timeout = 10000 } = options;

    const executeQuery = async (query: { key: string; fn: () => Promise<T> }): Promise<T> => {
      const cached = apiCache.get(query.key) as T | null;
      if (cached) return cached;

      const result = await query.fn();
      apiCache.set(query.key, result);
      return result;
    };

    const queryPromises = queries.map(executeQuery);

    if (parallel) {
      return Promise.all(queryPromises);
    } else {
      // Sequential execution
      const results: T[] = [];
      for (const promise of queryPromises) {
        results.push(await promise);
      }
      return results;
    }
  }
}

// Debounce utility for API calls and search
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: unknown[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// Throttle utility for scroll events and rapid updates
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

// Memory usage monitoring
export const getMemoryUsage = () => {
  if (typeof window === 'undefined' || !('memory' in performance)) {
    return null;
  }
  
  const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!memory) {
    return { used: 0, total: 0, limit: 0 };
  }
  return {
    used: Math.round(memory.usedJSHeapSize / 1048576), // MB
    total: Math.round(memory.totalJSHeapSize / 1048576), // MB
    limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
  };
};

// Performance metrics collection
export const collectPerformanceMetrics = () => {
  if (typeof window === 'undefined') return null;
  
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');
  
  return {
    // Core Web Vitals approximations
    fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
    loadComplete: navigation.loadEventEnd - navigation.fetchStart,
    memory: getMemoryUsage(),
  };
};

// Detect connection quality for adaptive loading
export const getConnectionInfo = () => {
  if (typeof window === 'undefined' || !('connection' in navigator)) {
    return { effectiveType: '4g', saveData: false };
  }
  
  const connection = (navigator as { connection?: { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number } }).connection;
  return {
    effectiveType: connection?.effectiveType || '4g',
    saveData: connection?.saveData || false,
    downlink: connection?.downlink || 10,
    rtt: connection?.rtt || 100,
  };
};

// Adaptive loading based on connection
export const shouldReduceQuality = () => {
  const connection = getConnectionInfo();
  return connection.saveData || 
         connection.effectiveType === '2g' || 
         connection.effectiveType === 'slow-2g';
};
