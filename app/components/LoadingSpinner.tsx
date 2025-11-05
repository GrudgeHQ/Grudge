'use client'

import { memo } from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const LoadingSpinner = memo(({ size = 'md', text, className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
      {text && (
        <p className="text-sm text-gray-400 animate-pulse">{text}</p>
      )}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

interface SkeletonProps {
  className?: string
  count?: number
}

export const Skeleton = memo(({ className = '', count = 1 }: SkeletonProps) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`animate-pulse bg-gray-700 rounded ${className}`}></div>
    ))}
  </>
))

Skeleton.displayName = 'Skeleton'

interface PageLoadingProps {
  text?: string
}

export const PageLoading = memo(({ text = 'Loading...' }: PageLoadingProps) => (
  <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
    <LoadingSpinner size="lg" text={text} />
  </div>
))

PageLoading.displayName = 'PageLoading'

export default LoadingSpinner
