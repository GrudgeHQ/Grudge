// Error tracking and performance monitoring setup

'use client'

import React, { useEffect } from 'react'
import { collectPerformanceMetrics, getMemoryUsage } from '@/lib/performance'

// Error boundary for catching React errors
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    this.logError(error, { 
      componentStack: errorInfo.componentStack,
      errorBoundary: true 
    })
  }

  logError(error: Error, context: Record<string, any> = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      memory: getMemoryUsage(),
      ...context,
    }

    // In production, send to error tracking service (Sentry, Bugsnag, etc.)
    if (process.env.NODE_ENV === 'production') {
      console.error('Error logged:', errorData)
      // Example: Sentry.captureException(error, { extra: context })
    } else {
      console.error('Error:', errorData)
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return React.createElement(FallbackComponent, { error: this.state.error! })
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">😵</div>
        <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1>
        <p className="text-slate-400 mb-6">
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium"
        >
          Refresh Page
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-slate-300">Error Details</summary>
            <pre className="mt-2 p-4 bg-slate-800 rounded text-sm overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Collect initial metrics
    const collectMetrics = () => {
      const metrics = collectPerformanceMetrics()
      if (metrics && process.env.ENABLE_PERFORMANCE_METRICS === 'true') {
        // Send metrics to monitoring service
        console.log('Performance metrics:', metrics)
      }
    }

    // Collect metrics when page loads
    if (document.readyState === 'complete') {
      collectMetrics()
    } else {
      window.addEventListener('load', collectMetrics)
    }

    // Monitor for performance issues
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' && entry.duration > 100) {
          console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`)
        }
      })
    })

    observer.observe({ entryTypes: ['measure', 'navigation'] })

    // Global error handler for unhandled errors
    const handleError = (event: ErrorEvent) => {
      const errorData = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        memory: getMemoryUsage(),
      }

      if (process.env.NODE_ENV === 'production') {
        console.error('Unhandled error:', errorData)
        // Send to error tracking service
      } else {
        console.error('Unhandled error:', errorData)
      }
    }

    // Global promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      const errorData = {
        reason: event.reason,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        memory: getMemoryUsage(),
      }

      if (process.env.NODE_ENV === 'production') {
        console.error('Unhandled promise rejection:', errorData)
        // Send to error tracking service
      } else {
        console.error('Unhandled promise rejection:', errorData)
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('load', collectMetrics)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
      observer.disconnect()
    }
  }, [])
}

// Analytics tracking (replace with your analytics service)
export function useAnalytics() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.ENABLE_ANALYTICS !== 'true') return

    // Initialize analytics service
    // Example: gtag, mixpanel, amplitude, etc.
    console.log('Analytics initialized')

    // Track page views
    const trackPageView = () => {
      console.log('Page view:', window.location.pathname)
      // Example: gtag('config', 'GA_TRACKING_ID', { page_path: window.location.pathname })
    }

    trackPageView()

    // Listen for route changes (Next.js specific)
    const handleRouteChange = () => {
      trackPageView()
    }

    // In a real app, you'd listen to Next.js router events
    // router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      // router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [])
}

// Custom hook for tracking user interactions
export function useEventTracking() {
  const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
    if (process.env.ENABLE_ANALYTICS !== 'true') return

    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      ...properties,
    }

    console.log('Event tracked:', eventData)
    // Send to analytics service
  }

  return { trackEvent }
}

// Service Worker registration for PWA features
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered successfully')
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('New version available')
                // Show update notification to user
              }
            })
          }
        })
      } catch (error) {
        console.warn('Service Worker registration failed:', error)
      }
    }

    registerSW()
  }, [])
}

// Real User Monitoring (RUM) utilities
export const RUMUtils = {
  // Measure Core Web Vitals
  measureCoreWebVitals: () => {
    if (typeof window === 'undefined') return

    // First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          console.log('FCP:', entry.startTime)
        }
      })
    })
    observer.observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      console.log('LCP:', lastEntry.startTime)
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
  },

  // Track user interactions
  trackUserInteraction: (element: HTMLElement, action: string) => {
    const startTime = performance.now()
    
    const handleInteraction = () => {
      const duration = performance.now() - startTime
      console.log(`${action} took ${duration}ms`)
      
      element.removeEventListener('click', handleInteraction)
    }
    
    element.addEventListener('click', handleInteraction, { once: true })
  },
}