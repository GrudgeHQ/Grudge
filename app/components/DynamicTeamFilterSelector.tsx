"use client"
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function DynamicTeamFilterSelector() {
  const { data: session, status } = useSession()
  const [TeamFilterComponent, setTeamFilterComponent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const loadTeamSelector = async () => {
    if (isLoading || isLoaded) return
    
    setIsLoading(true)
    try {
      const module = await import('./TeamFilterSelector')
      setTeamFilterComponent(() => module.default)
      setIsLoaded(true)
    } catch (error) {
      console.error('Failed to load TeamFilterSelector:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render anything if not authenticated
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400 whitespace-nowrap">Team:</label>
        <div className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-1.5 text-sm min-w-[180px] flex items-center justify-between">
          <span className="text-gray-500">Loading session...</span>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  // Show the loaded component if available
  if (TeamFilterComponent) {
    return <TeamFilterComponent />
  }

  // Show clickable placeholder that loads the real component on demand
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-400 whitespace-nowrap">Team:</label>
      <button
        onClick={loadTeamSelector}
        disabled={isLoading}
        className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-1.5 text-sm min-w-[180px] flex items-center justify-between hover:bg-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
      >
        <span className="truncate">
          {isLoading ? 'Loading...' : 'Click to Load Team Selector'}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}