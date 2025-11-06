// Development-specific optimizations
export const devOptimizations = {
  // Debounce rapid requests
  debounce: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): T => {
    let timeout: NodeJS.Timeout | null = null;
    return ((...args: unknown[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  },

  // Simple in-memory cache for development
  createCache: <T>() => {
    const cache = new Map<string, { data: T; timestamp: number }>();
    const TTL = 5000; // 5 seconds cache

    return {
      get: (key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > TTL) {
          cache.delete(key);
          return null;
        }
        
        return entry.data;
      },
      
      set: (key: string, data: T): void => {
        cache.set(key, { data, timestamp: Date.now() });
      },
      
      clear: (): void => {
        cache.clear();
      }
    };
  },

  // Batch database queries
  batchQueries: async <T>(
    queries: (() => Promise<T>)[]
  ): Promise<T[]> => {
    return Promise.all(queries.map(query => query()));
  }
};
