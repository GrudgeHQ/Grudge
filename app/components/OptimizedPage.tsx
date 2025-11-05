import { Suspense } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface OptimizedPageProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function OptimizedPage({ children, fallback }: OptimizedPageProps) {
  return (
    <Suspense fallback={fallback || <LoadingSpinner size="lg" />}>
      {children}
    </Suspense>
  )
}

export default OptimizedPage
