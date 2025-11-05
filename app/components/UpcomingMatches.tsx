'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UpcomingMatch {
  id: string
  scheduledAt: string | null
  location: string | null
  description: string | null
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  season: {
    name: string
    league: { name: string }
  }
  userAvailability?: {
    status: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE'
    notes?: string
  } | null
}

interface UpcomingMatchesProps {
  teamId: string
  limit?: number
  compact?: boolean
}

export default function UpcomingMatches({ teamId, limit, compact }: UpcomingMatchesProps) {
  const [matches, setMatches] = useState<UpcomingMatch[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUpcomingMatches()
  }, [teamId])

  const fetchUpcomingMatches = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/upcoming-matches`)
      if (response.ok) {
        const data = await response.json()
        setMatches(data.matches)
      }
    } catch (error) {
      console.error('Error fetching upcoming matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAvailabilityColor = (status?: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'MAYBE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'UNAVAILABLE': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-slate-600/20 text-slate-400 border-slate-600/30'
    }
  }

  const getAvailabilityText = (status?: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Available'
      case 'MAYBE': return 'Maybe'
      case 'UNAVAILABLE': return 'Unavailable'
      default: return 'No Response'
    }
  }

  const handleAvailabilityClick = (matchId: string) => {
    router.push(`/season-matches/${matchId}/availability`)
  }

  if (loading) {
    return (
      <div className={compact ? "" : "bg-slate-900 p-6 rounded-lg border border-slate-700"}>
        <h4 className={`font-semibold ${compact ? 'text-gray-200 mb-2' : 'text-lg text-white mb-4'}`}>Upcoming Matches</h4>
        <div className={`flex justify-center ${compact ? 'py-4' : 'py-8'}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className={compact ? "" : "bg-slate-900 p-6 rounded-lg border border-slate-700"}>
        <div className="flex justify-between items-center mb-2">
          <h4 className={`font-semibold ${compact ? 'text-gray-200' : 'text-lg text-white'}`}>Upcoming Matches</h4>
          {!compact && (
            <button 
              onClick={() => router.push('/matches')}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
              View all
            </button>
          )}
        </div>
        <p className={`text-gray-500 ${compact ? 'text-sm' : 'text-center py-8'}`}>No upcoming matches scheduled</p>
      </div>
    )
  }

  return (
    <div className={compact ? "" : "bg-slate-900 p-6 rounded-lg border border-slate-700"}>
      <div className="flex justify-between items-center mb-2">
        <h4 className={`font-semibold ${compact ? 'text-gray-200' : 'text-lg text-white'}`}>
          Upcoming Matches{!compact && ` (${limit ? Math.min(matches.length, limit) : matches.length})`}
        </h4>
        {(limit && matches.length > limit) || !compact && (
          <button 
            onClick={() => router.push('/matches')}
            className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
          >
            View all{matches.length > 0 ? ` ${matches.length}` : ''}
          </button>
        )}
      </div>
      
      <div className={compact ? "space-y-2" : "space-y-4"}>
        {(limit ? matches.slice(0, limit) : matches).map((match) => (
          <div key={match.id} className={compact ? "bg-slate-700/50 p-2 rounded" : "bg-slate-800 p-4 rounded-lg border border-slate-700"}>
            {compact ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </div>
                    {match.scheduledAt ? (
                      <div className="text-xs text-gray-400">
                        📅 {new Date(match.scheduledAt).toLocaleDateString()} at{' '}
                        {new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Time TBD</div>
                    )}
                    {match.location && (
                      <div className="text-xs text-gray-400">📍 {match.location}</div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAvailabilityColor(match.userAvailability?.status)}`}>
                      {getAvailabilityText(match.userAvailability?.status)}
                    </span>
                    <button
                      onClick={() => handleAvailabilityClick(match.id)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-white">
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {match.season.league.name} - {match.season.name}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    {match.scheduledAt ? (
                      <div>
                        <div className="text-sm text-white">
                          {new Date(match.scheduledAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(match.scheduledAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">Time TBD</div>
                    )}
                  </div>
                </div>

                {match.location && (
                  <div className="text-sm text-slate-400 mb-3">
                    📍 {match.location}
                  </div>
                )}

                {match.description && (
                  <div className="text-sm text-slate-300 mb-3">
                    {match.description}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-400">Your availability:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAvailabilityColor(match.userAvailability?.status)}`}>
                      {getAvailabilityText(match.userAvailability?.status)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleAvailabilityClick(match.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Update Availability
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}