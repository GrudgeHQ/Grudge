'use client'

import React, { useState, useRef, useEffect } from 'react'
import { shouldReduceQuality } from '@/lib/performance'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: () => void
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality,
  loading = 'lazy',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [adaptiveQuality, setAdaptiveQuality] = useState(quality || 75)
  const imgRef = useRef<HTMLImageElement>(null)

  // Adapt quality based on connection
  useEffect(() => {
    if (shouldReduceQuality()) {
      setAdaptiveQuality(50) // Lower quality for slow connections
    }
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Generate optimized src URL
  const getOptimizedSrc = () => {
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return src
    }

    // Simple optimization - in production you'd use Next.js Image or Cloudinary
    return src
  }

  // Fallback image for errors
  const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg=='

  if (hasError) {
    return (
      <img
        ref={imgRef}
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} opacity-100`}
      />
    )
  }

  return (
    <div className="relative">
      <img
        ref={imgRef}
        src={getOptimizedSrc()}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={priority ? 'eager' : loading}
        onLoad={handleLoad}
        onError={handleError}
        decoding="async"
      />
      
      {/* Loading spinner */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
        </div>
      )}
    </div>
  )
}

// Preset configurations for common use cases
export const ImagePresets = {
  avatar: {
    width: 48,
    height: 48,
    className: 'rounded-full',
    objectFit: 'cover' as const,
  },
  
  thumbnail: {
    width: 120,
    height: 120,
    className: 'rounded-md',
    objectFit: 'cover' as const,
  },
  
  hero: {
    fill: true,
    className: 'w-full h-64 md:h-96',
    objectFit: 'cover' as const,
    priority: true,
    quality: 85,
  },
  
  icon: {
    width: 24,
    height: 24,
    className: '',
    objectFit: 'contain' as const,
  },
  
  logo: {
    width: 200,
    height: 80,
    className: '',
    objectFit: 'contain' as const,
    priority: true,
  },
}

// Hook for preloading critical images
export function usePreloadImages(images: string[]) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const preloadPromises = images.map((src) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = resolve
        img.onerror = resolve // Don't fail if one image fails
        img.src = src
      })
    })

    Promise.all(preloadPromises).then(() => {
      console.log('Critical images preloaded')
    })
  }, [images])
}