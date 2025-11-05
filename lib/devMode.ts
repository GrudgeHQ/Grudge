// Fast development mode utilities
export const isDev = process.env.NODE_ENV === 'development';

// Skip expensive operations in development
export const devSkip = {
  // Skip non-critical database queries in dev
  skipNonCriticalQueries: isDev,
  
  // Use simplified components in dev
  useSimplifiedComponents: isDev,
  
  // Skip complex calculations
  skipHeavyComputation: isDev,
  
  // Reduce re-renders
  enableMemoization: true
};

// Simple component wrapper for development
export function DevOptimized<T extends object>({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}) {
  if (isDev && devSkip.useSimplifiedComponents) {
    return fallback;
  }
  return children;
}

// Performance measurement for development
export const devPerf = {
  start: (label: string) => {
    if (isDev) {
      console.time(label);
    }
  },
  
  end: (label: string) => {
    if (isDev) {
      console.timeEnd(label);
    }
  }
};
