'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  threshold?: number
  disabled?: boolean
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80,
  disabled = false 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    let touchStartY = 0
    let currentY = 0
    let isAtTop = false

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return
      
      touchStartY = e.touches[0].clientY
      currentY = touchStartY
      setStartY(touchStartY)
      
      // Check if we're at the top of the scrollable area
      isAtTop = container.scrollTop === 0
      
      if (isAtTop) {
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return
      
      currentY = e.touches[0].clientY
      const distance = currentY - touchStartY
      
      // Only allow pulling down when at the top
      if (distance > 0 && isAtTop) {
        e.preventDefault()
        
        // Apply resistance - the further you pull, the harder it gets
        const resistance = Math.min(distance / 2.5, threshold * 1.5)
        setPullDistance(resistance)
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return
      
      setIsPulling(false)
      
      if (pullDistance >= threshold) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } catch (error) {
          console.error('Refresh failed:', error)
        } finally {
          setIsRefreshing(false)
        }
      }
      
      setPullDistance(0)
    }

    // Add passive: false to preventDefault on touchmove
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPulling, pullDistance, threshold, onRefresh, disabled, isRefreshing])

  const getRefreshStatus = () => {
    if (isRefreshing) return 'Refreshing...'
    if (pullDistance >= threshold) return 'Release to refresh'
    if (pullDistance > 0) return 'Pull to refresh'
    return ''
  }

  const getSpinnerRotation = () => {
    if (isRefreshing) return 'animate-spin'
    return `rotate-${Math.min(Math.floor(pullDistance / threshold * 180), 180)}`
  }

  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto h-full"
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 z-10"
          style={{
            transform: `translateY(-${Math.max(60 - pullDistance, 0)}px)`,
            opacity: Math.min(pullDistance / threshold, 1)
          }}
        >
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${getSpinnerRotation()}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            <span className="font-medium">{getRefreshStatus()}</span>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className={`${(pullDistance > 0 || isRefreshing) ? 'pt-16' : ''}`}>
        {children}
      </div>
    </div>
  )
}
