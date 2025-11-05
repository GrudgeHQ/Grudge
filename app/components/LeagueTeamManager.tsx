'use client'

import { useState, useEffect } from 'react'

interface TeamStats {
  totalMatches: number
  completedMatches: number
  wins: number
  losses: number
  ties: number
  upcomingMatches: number
  winPercentage: number
}

interface TeamMember {
  id: string
  role: string
  isAdmin: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

interface LeagueTeam {
  id: string
  name: string
  sport: string
  joinedAt: string
  memberCount: number
  adminCount: number
  members: TeamMember[]
  stats: TeamStats
  canRemove: boolean
}

interface League {
  id: string
  name: string
  sport: string
  isManager: boolean
}

interface LeagueTeamManagerProps {
  leagueId: string
  onTeamRemoved?: () => void
}

export default function LeagueTeamManager({ leagueId, onTeamRemoved }: LeagueTeamManagerProps) {
  const [league, setLeague] = useState<League | null>(null)
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadTeams()
  }, [leagueId])

  const loadTeams = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/leagues/${leagueId}/teams`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load teams')
      }
      
      const data = await response.json()
      setLeague(data.league)
      setTeams(data.teams)
    } catch (err: any) {
      setError(err.message)
      console.error('Error loading teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTeam = async (teamId: string) => {
    if (!league?.isManager) {
      setError('Only league managers can remove teams')
      return
    }

    setRemoving(teamId)
    setError('')

    try {
      const response = await fetch(`/api/leagues/${leagueId}/teams/${teamId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove team')
      }

      const data = await response.json()
      
      // Remove team from local state
      setTeams(prev => prev.filter(team => team.id !== teamId))
      setShowRemoveConfirm(null)
      
      // Call callback if provided
      if (onTeamRemoved) {
        onTeamRemoved()
      }

      // Show success message
      alert(`${data.team.name} has been successfully removed from the league`)
      
    } catch (err: any) {
      setError(err.message)
      console.error('Error removing team:', err)
    } finally {
      setRemoving(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CAPTAIN': return '⭐'
      case 'CO_CAPTAIN': return '🌟'
      case 'COACH': return '🏃'
      case 'COORDINATOR': return '📋'
      default: return '👤'
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">Loading teams...</div>
        </div>
      </div>
    )
  }

  if (error && !league) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">League Teams</h2>
          <p className="text-gray-400 text-sm">
            {teams.length} team{teams.length !== 1 ? 's' : ''} in {league?.name}
            {league?.isManager && ' • You are the League Manager'}
          </p>
        </div>
        <button
          onClick={loadTeams}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No teams in this league yet</div>
          <p className="text-sm text-gray-500">Teams can join using the league invite code</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div 
              key={team.id} 
              className="bg-gray-700 rounded-lg p-5 border border-gray-600"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{team.name}</h3>
                    <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                      {team.sport}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Joined: {formatDate(team.joinedAt)}</p>
                    <p>
                      {team.memberCount} member{team.memberCount !== 1 ? 's' : ''} 
                      ({team.adminCount} admin{team.adminCount !== 1 ? 's' : ''})
                    </p>
                  </div>
                </div>

                {league?.isManager && (
                  <div className="flex items-center gap-2">
                    {!team.canRemove && (
                      <div className="text-xs bg-orange-500/20 text-orange-200 px-2 py-1 rounded">
                        Has upcoming matches
                      </div>
                    )}
                    <button
                      onClick={() => setShowRemoveConfirm(team.id)}
                      disabled={!team.canRemove || removing === team.id}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        team.canRemove
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                      title={team.canRemove ? 'Remove team from league' : 'Cannot remove team with upcoming matches'}
                    >
                      {removing === team.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>

              {/* Team Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
                <div className="bg-gray-800 rounded p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">{team.stats.totalMatches}</div>
                  <div className="text-gray-400">Total Matches</div>
                </div>
                <div className="bg-gray-800 rounded p-3 text-center">
                  <div className="text-lg font-bold text-green-400">{team.stats.wins}</div>
                  <div className="text-gray-400">Wins</div>
                </div>
                <div className="bg-gray-800 rounded p-3 text-center">
                  <div className="text-lg font-bold text-red-400">{team.stats.losses}</div>
                  <div className="text-gray-400">Losses</div>
                </div>
                <div className="bg-gray-800 rounded p-3 text-center">
                  <div className="text-lg font-bold text-yellow-400">{team.stats.ties}</div>
                  <div className="text-gray-400">Ties</div>
                </div>
                <div className="bg-gray-800 rounded p-3 text-center">
                  <div className="text-lg font-bold text-purple-400">{team.stats.winPercentage}%</div>
                  <div className="text-gray-400">Win Rate</div>
                </div>
              </div>

              {/* Team Members */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Team Members</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {team.members.slice(0, 6).map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-2 text-sm bg-gray-800 rounded px-3 py-2"
                    >
                      <span className="text-lg">{getRoleIcon(member.role)}</span>
                      <span className="flex-1 truncate">
                        {member.user.name || member.user.email}
                      </span>
                      {member.isAdmin && (
                        <span className="text-xs bg-blue-500/20 text-blue-200 px-1 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                  {team.members.length > 6 && (
                    <div className="text-sm text-gray-400 px-3 py-2">
                      +{team.members.length - 6} more member{team.members.length - 6 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remove Team Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-red-400 mb-2">Remove Team from League</h3>
              <p className="text-gray-300">
                Are you sure you want to remove{' '}
                <span className="font-bold">
                  {teams.find(t => t.id === showRemoveConfirm)?.name}
                </span>{' '}
                from the league?
              </p>
            </div>

            <div className="bg-orange-500/20 border border-orange-500 text-orange-100 px-4 py-3 rounded mb-4">
              <h4 className="font-medium mb-1">⚠️ This action will:</h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Remove the team from all league standings</li>
                <li>Notify all team administrators</li>
                <li>Cannot be undone</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleRemoveTeam(showRemoveConfirm)}
                disabled={removing === showRemoveConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-4 py-2 rounded font-medium"
              >
                {removing === showRemoveConfirm ? 'Removing...' : 'Remove Team'}
              </button>
              <button
                onClick={() => setShowRemoveConfirm(null)}
                disabled={removing === showRemoveConfirm}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}