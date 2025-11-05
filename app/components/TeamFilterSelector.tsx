"use client"
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamFilter } from '../context/TeamFilterContext'

export default function TeamFilterSelector() {
  const router = useRouter()
  const { selectedTeamId, setSelectedTeamId } = useTeamFilter()
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const data = await response.json()
      const userTeams = data.teams || []
      setTeams(userTeams)
      setLoading(false)

      // If selected team no longer exists, try to find most active team instead of defaulting to 'all'
      if (selectedTeamId !== 'all' && !userTeams.find((t: any) => t.teamId === selectedTeamId)) {
        try {
          const response = await fetch('/api/user/most-active-team')
          if (response.ok) {
            const data = await response.json()
            if (data.teamId && data.teamId !== 'all' && userTeams.find((t: any) => t.teamId === data.teamId)) {
              setSelectedTeamId(data.teamId)
            } else {
              setSelectedTeamId('all')
            }
          } else {
            setSelectedTeamId('all')
          }
        } catch (error) {
          console.error('Failed to determine most active team:', error)
          setSelectedTeamId('all')
        }
      }

      // If user is currently on 'all' teams but they have teams and no saved preference exists,
      // this might be a fresh login - try to set their most active team
      if (selectedTeamId === 'all' && userTeams.length > 0 && !localStorage.getItem('selectedTeamId')) {
        try {
          const response = await fetch('/api/user/most-active-team')
          if (response.ok) {
            const data = await response.json()
            if (data.teamId && data.teamId !== 'all' && userTeams.find((t: any) => t.teamId === data.teamId)) {
              setSelectedTeamId(data.teamId)
            }
          }
        } catch (error) {
          console.error('Failed to determine most active team on fresh load:', error)
        }
      }
    } catch (error) {
      console.error('Failed to load teams:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [selectedTeamId, setSelectedTeamId, refreshTrigger])

  // Listen for team creation events
  useEffect(() => {
    const handleTeamCreated = (event: CustomEvent) => {
      setRefreshTrigger(prev => prev + 1)
      // Auto-select the newly created/joined team
      if (event.detail?.teamId) {
        setTimeout(() => {
          setSelectedTeamId(event.detail.teamId)
        }, 500) // Small delay to ensure teams are loaded
      }
    }

    // Listen for custom events
    window.addEventListener('teamCreated', handleTeamCreated as EventListener)
    window.addEventListener('teamJoined', handleTeamCreated as EventListener)
    
    return () => {
      window.removeEventListener('teamCreated', handleTeamCreated as EventListener)
      window.removeEventListener('teamJoined', handleTeamCreated as EventListener)
    }
  }, [setSelectedTeamId])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return null
  }

  const selectedTeam = teams.find((t) => t.teamId === selectedTeamId)
  const displayName = selectedTeam ? selectedTeam.team.name : 'All Teams'

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    setIsOpen(false)
  }

  const handleCreateTeam = () => {
    setIsOpen(false)
    router.push('/teams/create')
  }

  const handleJoinTeam = () => {
    setIsOpen(false)
    router.push('/teams/join')
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-400 whitespace-nowrap">Team:</label>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px] flex items-center justify-between hover:bg-slate-700 transition-colors"
        >
          <span className="truncate">{displayName}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
            {/* Team Options */}
            <button
              onClick={() => handleTeamSelect('all')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                selectedTeamId === 'all' ? 'bg-slate-700 text-blue-400' : 'text-white'
              }`}
            >
              All Teams
            </button>
            
            {teams.map((t) => (
              <button
                key={t.teamId}
                onClick={() => handleTeamSelect(t.teamId)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                  selectedTeamId === t.teamId ? 'bg-slate-700 text-blue-400' : 'text-white'
                }`}
              >
                {t.team.name}
              </button>
            ))}

            {/* Separator */}
            <div className="border-t border-slate-700 my-1"></div>

            {/* Action Options */}
            <button
              onClick={handleCreateTeam}
              className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Team
            </button>
            
            <button
              onClick={handleJoinTeam}
              className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m0 0h-3m-5-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Join Team
            </button>
          </div>
        )}
      </div>
      
      {selectedTeam && (
        <span className="text-xs text-gray-500 hidden lg:inline">
          ({selectedTeam.team.sport})
        </span>
      )}
    </div>
  )
}
