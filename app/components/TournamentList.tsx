'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Tournament {
  id: string
  name: string
  description?: string
  format: string
  status: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  teams: Array<{
    id: string
    team: {
      id: string
      name: string
    }
  }>
  winner?: {
    team: {
      id: string
      name: string
    }
  }
  runnerUp?: {
    team: {
      id: string
      name: string
    }
  }
  createdBy: {
    id: string
    name: string
  }
}

interface TournamentListProps {
  leagueId: string
  isLeagueManager: boolean
  onCreateTournament: () => void
}

const formatNames: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  TRIPLE_ELIMINATION: 'Triple Elimination'
}

const statusNames: Record<string, string> = {
  CREATED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-700 text-gray-200',
  IN_PROGRESS: 'bg-blue-900/50 text-blue-300',
  COMPLETED: 'bg-green-900/50 text-green-300',
  CANCELLED: 'bg-red-900/50 text-red-300'
}

export default function TournamentList({ leagueId, isLeagueManager, onCreateTournament }: TournamentListProps) {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTournaments()
  }, [leagueId])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leagues/${leagueId}/tournaments`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch tournaments')
      }

      const data = await response.json()
      setTournaments(data.tournaments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/start`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start tournament')
      }

      // Refresh tournaments list
      fetchTournaments()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start tournament')
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete tournament')
      }

      // Refresh tournaments list
      fetchTournaments()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tournament')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Only show tournaments that are not archived
  const visibleTournaments = tournaments.filter(t => t.status !== 'ARCHIVED')

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
        <p className="text-gray-300 mt-2">Loading tournaments...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-md p-4">
        <p className="text-red-300">{error}</p>
        <button
          onClick={fetchTournaments}
          className="mt-2 text-sm text-red-400 hover:text-red-300"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Tournaments</h2>
        {isLeagueManager && (
          <button
            onClick={onCreateTournament}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Create Tournament
          </button>
        )}
      </div>

      {/* Tournaments List */}
      {visibleTournaments.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-lg">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No tournaments yet</h3>
          <p className="text-gray-300 mb-4">
            {isLeagueManager 
              ? 'Create your first tournament to get started!'
              : 'The league manager hasn\'t created any tournaments yet.'
            }
          </p>
          {isLeagueManager && (
            <button
              onClick={onCreateTournament}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Tournament
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleTournaments.map(tournament => (
            <div key={tournament.id} className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => router.push(`/tournaments/${tournament.id}`)}>
              {/* Tournament Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {tournament.name}
                  </h3>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <span>{formatNames[tournament.format]}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
                      {statusNames[tournament.status]}
                    </span>
                  </div>
                </div>
                
                {/* Winner Badge */}
                {tournament.status === 'COMPLETED' && tournament.winner && (
                  <div className="flex items-center bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded-full text-xs font-medium">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.253.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {tournament.winner.team.name}
                  </div>
                )}
              </div>

              {/* Tournament Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {tournament.teams.length} teams
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 16l-3-3h6l-3 3z" />
                  </svg>
                  Created {formatDate(tournament.createdAt)}
                </div>
                {tournament.completedAt && (
                  <div className="flex items-center text-sm text-gray-300">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completed {formatDate(tournament.completedAt)}
                  </div>
                )}
              </div>

              {/* Description */}
              {tournament.description && (
                <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                  {tournament.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-600">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/tournaments/${tournament.id}`)
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  View Details →
                </button>
                
                {isLeagueManager && (
                  <div className="flex space-x-2">
                    {tournament.status === 'CREATED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartTournament(tournament.id)
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                      >
                        Start
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTournament(tournament.id)
                      }}
                      className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
