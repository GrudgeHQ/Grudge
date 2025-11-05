"use client"
import React, { createContext, useContext, useState, useEffect } from 'react'

interface TeamFilterContextType {
  selectedTeamId: string | 'all'
  setSelectedTeamId: (teamId: string | 'all') => void
}

const TeamFilterContext = createContext<TeamFilterContextType | undefined>(undefined)

export function TeamFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | 'all'>('all')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount, or determine most active team for new users
  useEffect(() => {
    const initializeTeamSelection = async () => {
      const saved = localStorage.getItem('selectedTeamId')
      
      if (saved) {
        // User has a saved preference, use it
        setSelectedTeamIdState(saved)
      } else {
        // New user or no saved preference - determine most active team
        try {
          const response = await fetch('/api/user/most-active-team')
          if (response.ok) {
            const data = await response.json()
            if (data.teamId && data.teamId !== 'all') {
              setSelectedTeamIdState(data.teamId)
              // Save this choice for future sessions
              localStorage.setItem('selectedTeamId', data.teamId)
            }
          }
        } catch (error) {
          console.error('Failed to determine most active team:', error)
          // Keep default 'all' on error
        }
      }
      
      setIsLoaded(true)
    }

    initializeTeamSelection()
  }, [])

  // Save to localStorage when changed
  const setSelectedTeamId = (teamId: string | 'all') => {
    setSelectedTeamIdState(teamId)
    localStorage.setItem('selectedTeamId', teamId)
  }

  return (
    <TeamFilterContext.Provider value={{ selectedTeamId, setSelectedTeamId }}>
      {children}
    </TeamFilterContext.Provider>
  )
}

export function useTeamFilter() {
  const context = useContext(TeamFilterContext)
  if (context === undefined) {
    // During SSR or if context is not available, return default values
    if (typeof window === 'undefined') {
      return { selectedTeamId: 'all' as const, setSelectedTeamId: () => {} }
    }
    throw new Error('useTeamFilter must be used within a TeamFilterProvider')
  }
  return context
}
