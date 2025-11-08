'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTeamFilter } from '../context/TeamFilterContext'
import LeagueStandings from '../components/LeagueStandings'
import LeagueStatsOverview from '../components/LeagueStatsOverview' 
import LeagueLeaderboard from '../components/LeagueLeaderboard'
import SeasonStandings from '../components/SeasonStandings'
import TournamentList from '../components/TournamentList'
import SeasonManager from '../components/SeasonManager'

import { SPORTS } from '@/lib/sports'

interface League {
  id: string
  name: string
  sport: string
  inviteCode: string
  createdAt: string
  creator: {
    id: string
    name: string
  }
  teams: Array<{
    team: {
      id: string
      name: string
      members?: Array<{
        id: string
        role: string
        isAdmin: boolean
        user: {
          id: string
          name: string
          email: string
        }
      }>
    }
  }>
  matches: Array<{
    id: string
    scheduledAt: string
    location: string | null
    homeScore: number | null
    awayScore: number | null
    homeTeam: {
      id: string
      name: string
    }
    awayTeam: {
      id: string
      name: string
    }
  }>
  tournaments: Array<{
    id: string
    name: string
    format: string
    status: string
    maxTeams: number | null
    startedAt: string | null
    completedAt: string | null
  }>
  seasons?: Array<{
    id: string
    name: string
    seasonMatches: Array<{
      id: string
      scheduledAt: string
      location: string | null
      homeScore: number | null
      awayScore: number | null
      status: string
      homeTeam: {
        id: string
        name: string
      }
      awayTeam: {
        id: string
        name: string
      }
    }>
  }>
}

interface LeagueStats {
  league: {
    id: string
    name: string
    sport: string
    creator: any
  }
  standings: Array<{
    teamId: string
    teamName: string
    gamesPlayed: number
    wins: number
    losses: number
    draws: number
    points: number
    goalDifference: number
    winPercentage: number
    goalsFor: number
    goalsAgainst: number
  }>
  summary: {
    totalTeams: number
    totalGames: number
    totalGoals: number
    averageGoalsPerGame: number
  }
  recentMatches: any[]
  topScoringTeams: any[]
  bestDefensiveTeams: any[]
  isLeagueManager: boolean
}



interface SearchResult {
  id: string
  name: string
  sport: string
  leagues: Array<{
    league: {
      id: string
      name: string
    }
  }>
}

interface EditLeagueFormProps {
  leagueId: string
  currentLeague?: League
  onSuccess: () => void
  onCancel: () => void
}

function EditLeagueForm({ leagueId, currentLeague, onSuccess, onCancel }: EditLeagueFormProps) {
  const [name, setName] = useState(currentLeague?.name || '')
  const [sport, setSport] = useState(currentLeague?.sport || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !sport) {
      setError('League name and sport are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sport
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update league')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-2">League Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
          placeholder="League name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Sport</label>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
          required
        >
          <option value="">Select a sport...</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-2 rounded"
        >
          {loading ? 'Updating...' : 'Update League'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

interface DeleteLeagueFormProps {
  leagueId: string
  currentLeague?: League
  onSuccess: () => void
  onCancel: () => void
}

function DeleteLeagueForm({ leagueId, currentLeague, onSuccess, onCancel }: DeleteLeagueFormProps) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmText !== currentLeague?.name) {
      setError('Please type the league name exactly to confirm deletion')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete league')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded">
        <h4 className="font-medium mb-2">⚠️ Warning: This action cannot be undone!</h4>
        <p className="text-sm">
          Deleting this league will permanently remove:
        </p>
        <ul className="text-sm mt-2 space-y-1">
          <li>• All league matches and schedules</li>
          <li>• League chat messages</li>
          <li>• Team associations with this league</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Type <span className="font-bold text-red-400">"{currentLeague?.name}"</span> to confirm:
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-red-500"
          placeholder="Type league name here"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading || confirmText !== currentLeague?.name}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-4 py-2 rounded"
        >
          {loading ? 'Deleting...' : 'Delete League'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function LeaguesPage() {
  const { selectedTeamId } = useTeamFilter()
  const [league, setLeague] = useState<League | null>(null)
  const [leagueStats, setLeagueStats] = useState<LeagueStats | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userTeams, setUserTeams] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'standings' | 'matches' | 'tournaments' | 'seasons'>('overview')
  const [showInviteTeam, setShowInviteTeam] = useState<boolean>(false)
  const [showEditLeague, setShowEditLeague] = useState<boolean>(false)
  const [showDeleteLeague, setShowDeleteLeague] = useState<boolean>(false)
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadCurrentUser()
    loadUserTeams()
  }, [])

  useEffect(() => {
    if (selectedTeamId === 'all') {
      setLeague(null)
      setLeagueStats(null)
      setLoading(false)
      return
    }
    
    loadTeamLeague()
  }, [selectedTeamId])

  const loadTeamLeague = async () => {
    if (selectedTeamId === 'all') return
    
    setLoading(true)
    setError('')
    
    try {
      // Load league for selected team
      const res = await fetch('/api/leagues')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load leagues')
      }
      const data = await res.json()
      
      // Find league that contains the selected team
      const teamLeague = data.leagues.find((l: League) => 
        l.teams.some((t: any) => t.team.id === selectedTeamId)
      )
      
      // Transform league data to flatten season matches into matches array
      let transformedLeague = null
      if (teamLeague) {
        const matches = teamLeague.seasons?.flatMap((season: any) => 
          season.seasonMatches?.map((match: any) => ({
            id: match.id,
            scheduledAt: match.scheduledAt,
            location: match.location,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            status: match.status
          })) || []
        ) || []
        
        transformedLeague = {
          ...teamLeague,
          matches,
          seasons: teamLeague.seasons // Keep seasons but matches are now flattened
        }
      }
      
      setLeague(transformedLeague)
      
      if (teamLeague) {
        // Load detailed league stats
        const statsRes = await fetch(`/api/leagues/${teamLeague.id}/stats`)
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setLeagueStats(statsData)
        }
      } else {
        setLeagueStats(null)
      }
    } catch (err) {
      setError('Failed to load league data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
      }
    } catch (err) {
      console.error('Failed to load current user:', err)
    }
  }

  const loadUserTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setUserTeams(data.teams || [])
      }
    } catch (err) {
      console.error('Failed to load user teams:', err)
    }
  }

  const searchTeams = async (query: string, sport: string) => {
    if (!league) return
    
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    
    setSearching(true)
    try {
      const response = await fetch(`/api/teams/search?q=${encodeURIComponent(query)}&sport=${sport}&excludeLeague=${league.id}`)
      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null)
      } else {
        const text = await response.text().catch(() => '')
        if (!response.ok) {
          console.error('Error searching teams (non-JSON):', response.status, response.statusText, text?.slice(0, 200))
        }
      }

      if (response.ok) {
        setSearchResults(data?.teams || [])
      } else {
        console.error('Error searching teams:', data?.error || response.statusText)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching teams:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const inviteTeam = async (teamId: string) => {
    if (!league) return
    
    setInviting(true)
    setError('')

    try {
      const res = await fetch(`/api/leagues/${league.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to invite team')
      }

      const data = await res.json()
      setShowInviteTeam(false)
      setTeamSearchQuery('')
      setSearchResults([])
      
      // Show success message
      setError('')
      alert(`Successfully invited ${data.teamName} to the league!`)
      
      // Reload league data
      loadTeamLeague()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Leagues</h1>
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <p className="text-slate-400">Loading league data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (selectedTeamId === 'all') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Leagues</h1>
          
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <div className="mb-4">
              <span className="text-6xl">🏆</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Select a Team to View League</h2>
            <p className="text-slate-400 mb-6">
              Choose a specific team from the team selector above to view its league information, standings, and matches.
            </p>
            
            <div className="flex gap-4 justify-center">
              <Link
                href="/leagues/join"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
              >
                Join League
              </Link>
              <Link
                href="/leagues/create"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Create League
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Leagues</h1>
          
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <div className="mb-4">
              <span className="text-6xl">🏅</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No League Found</h2>
            <p className="text-slate-400 mb-6">
              This team is not currently in any league. Join an existing league or create a new one to start competing!
            </p>
            
            <div className="flex gap-4 justify-center">
              <Link
                href="/leagues/join"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
              >
                Join League
              </Link>
              <Link
                href="/leagues/create"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Create League
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isLeagueManager = leagueStats?.isLeagueManager || false

  // Only include matches with a valid, non-epoch scheduled date
  const scheduledMatches = (league.matches || []).filter((m) => {
    if (!m?.scheduledAt) return false
    const t = new Date(m.scheduledAt).getTime()
    return Number.isFinite(t) && t > 0
  })

  // Find the latest season that is ACTIVE or COMPLETED (not ARCHIVED)
  const latestSeason = league.seasons && league.seasons
    .filter((s: any) => s.status === 'ACTIVE' || s.status === 'COMPLETED')
    .sort((a: any, b: any) => new Date(b.endDate || b.createdAt).getTime() - new Date(a.endDate || a.createdAt).getTime())[0]

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* League Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{league.name}</h1>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="capitalize">{league.sport.toLowerCase()}</span>
              <span>•</span>
              <span>{league.teams.length} teams</span>
              <span>•</span>
              <span>Manager: {league.creator.name}</span>
            </div>
          </div>
          
          {isLeagueManager && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowInviteTeam(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Invite Team
              </button>
              <button
                onClick={() => setShowEditLeague(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setShowDeleteLeague(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-700 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'members', label: 'Members', icon: '👥' },
              { id: 'standings', label: 'Standings', icon: '🏆' },
              // ...existing code...
              { id: 'matches', label: 'Matches', icon: '⚽' },
              { id: 'tournaments', label: 'Tournaments', icon: '🏅' },
              { id: 'seasons', label: 'Seasons', icon: '📅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && leagueStats && (
            <LeagueStatsOverview
              sport={league.sport}
              summary={leagueStats.summary}
              recentMatches={leagueStats.recentMatches}
              topScoringTeams={leagueStats.topScoringTeams}
              bestDefensiveTeams={leagueStats.bestDefensiveTeams}
            />
          )}
          
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">League Members</h2>
                <div className="text-sm text-slate-400">
                  {league.teams.reduce((total, teamLeague) => total + (teamLeague.team.members?.length || 0), 0)} member{league.teams.reduce((total, teamLeague) => total + (teamLeague.team.members?.length || 0), 0) !== 1 ? 's' : ''} across {league.teams.length} team{league.teams.length !== 1 ? 's' : ''}
                </div>
              </div>

              {league.teams.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-slate-400 mb-2">No teams in this league yet</div>
                  <p className="text-sm text-slate-500">Teams and their members will appear here once they join the league</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Display each team and its members */}
                  {league.teams.map((teamLeague) => (
                    <div key={teamLeague.team.id} className="bg-slate-800 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-blue-400">
                          {teamLeague.team.name}
                        </h3>
                        <div className="text-sm text-slate-400">
                          {teamLeague.team.members?.length || 0} member{(teamLeague.team.members?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {!teamLeague.team.members || teamLeague.team.members.length === 0 ? (
                        <div className="text-center py-4 text-slate-500">
                          No members found for this team
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {teamLeague.team.members.map((member) => (
                            <div key={member.id} className="bg-slate-700 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-white">
                                    {member.user.name || member.user.email}
                                  </h4>
                                  {member.user.name && (
                                    <p className="text-sm text-slate-400">
                                      {member.user.email}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end">
                                  {member.isAdmin && (
                                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded mb-1">
                                      Admin
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    member.role === 'CAPTAIN' 
                                      ? 'bg-yellow-600 text-white'
                                      : member.role === 'COACH'
                                      ? 'bg-green-600 text-white'
                                      : member.role === 'CO_CAPTAIN'
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-slate-600 text-slate-200'
                                  }`}>
                                    {member.role.toLowerCase().replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Summary stats */}
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-bold mb-4">Member Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {league.teams.reduce((total, teamLeague) => total + (teamLeague.team.members?.length || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-400">Total Members</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {league.teams.reduce((total, teamLeague) => total + (teamLeague.team.members?.filter(m => m.isAdmin).length || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-400">Administrators</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {league.teams.reduce((total, teamLeague) => total + (teamLeague.team.members?.filter(m => m.role === 'CAPTAIN').length || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-400">Captains</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {league.teams.reduce((total, teamLeague) => total + (teamLeague.team.members?.filter(m => m.role === 'COACH').length || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-400">Coaches</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'standings' && latestSeason && (
            <SeasonStandings leagueId={league.id} seasonId={latestSeason.id} />
          )}
          {activeTab === 'standings' && !latestSeason && (
            <div className="bg-slate-900 rounded-lg p-8 text-center">
              <span className="text-6xl">🏆</span>
              <h2 className="text-2xl font-bold text-white mb-4">No Season Standings Available</h2>
              <p className="text-slate-400">No completed or active season found for this league.</p>
            </div>
          )}
          
          {/* Leaderboard tab removed as it is redundant with standings */}
          
          {activeTab === 'matches' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">League Matches</h2>
                <div className="text-sm text-slate-400">
                  {scheduledMatches.length} scheduled match{scheduledMatches.length !== 1 ? 'es' : ''}
                </div>
              </div>

              {scheduledMatches.length === 0 ? (
                <div className="bg-slate-900 rounded-lg p-8 text-center">
                  <div className="mb-4">
                    <span className="text-6xl">⚽</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Matches Scheduled</h3>
                  <p className="text-slate-400">
                    League matches will appear here once the league manager schedules games.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Separate upcoming and past matches */}
                  {(() => {
                    const now = new Date()
                    const upcomingMatches = scheduledMatches.filter(match => 
                      new Date(match.scheduledAt) > now
                    ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                    
                    const pastMatches = scheduledMatches.filter(match => 
                      new Date(match.scheduledAt) <= now
                    ).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

                    return (
                      <>
                        {/* Upcoming Matches */}
                        {upcomingMatches.length > 0 && (
                          <div>
                            <h3 className="text-lg font-bold mb-3 text-green-400">
                              Upcoming Matches ({upcomingMatches.length})
                            </h3>
                            <div className="space-y-3">
                              {upcomingMatches.map((match) => (
                                <div
                                  key={match.id}
                                  className="bg-slate-800 rounded-lg p-4 border-l-4 border-green-500"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-lg">
                                        {match.homeTeam.name} vs {match.awayTeam.name}
                                      </p>
                                      <p className="text-slate-300 text-sm">
                                        {new Date(match.scheduledAt).toLocaleString()}
                                      </p>
                                      {match.location && (
                                        <p className="text-slate-300 text-sm">📍 {match.location}</p>
                                      )}
                                    </div>
                                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                                      Upcoming
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Past Matches */}
                        {pastMatches.length > 0 && (
                          <div>
                            <h3 className="text-lg font-bold mb-3 text-slate-400">
                              Past Matches ({pastMatches.length})
                            </h3>
                            <div className="space-y-3">
                              {pastMatches.map((match) => (
                                <div
                                  key={match.id}
                                  className="bg-slate-800 rounded-lg p-4 border-l-4 border-slate-600 opacity-75"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-lg">
                                        {match.homeTeam.name} vs {match.awayTeam.name}
                                      </p>
                                      <p className="text-slate-300 text-sm">
                                        {new Date(match.scheduledAt).toLocaleString()}
                                      </p>
                                      {match.location && (
                                        <p className="text-slate-300 text-sm">📍 {match.location}</p>
                                      )}
                                      {(match.homeScore !== null && match.awayScore !== null) && (
                                        <div className="mt-2">
                                          <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded">
                                            Final: {match.homeScore} - {match.awayScore}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <span className="bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded">
                                      Completed
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No upcoming matches but has past matches */}
                        {upcomingMatches.length === 0 && pastMatches.length > 0 && (
                          <div className="bg-slate-900 rounded-lg p-6 text-center border border-orange-500">
                            <h3 className="text-lg font-bold text-orange-400 mb-2">No Upcoming Matches</h3>
                            <p className="text-slate-400">
                              All scheduled matches have been completed. New matches will appear here when scheduled.
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
          

          
          {activeTab === 'tournaments' && (
            <TournamentList 
              leagueId={league.id}
              isLeagueManager={isLeagueManager}
              onCreateTournament={() => {}}
            />
          )}

          {activeTab === 'seasons' && (
            <SeasonManager 
              league={{
                ...league,
                creatorId: league.creator.id,
                createdAt: new Date(league.createdAt),
                teams: league.teams.map(teamLeague => teamLeague.team),
                tournaments: league.tournaments
              } as any}
              isManager={isLeagueManager}
            />
          )}
        </div>

        {/* Invite Team Modal */}
        {showInviteTeam && league && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Invite Team to League</h3>
                <button
                  onClick={() => {
                    setShowInviteTeam(false)
                    setTeamSearchQuery('')
                    setSearchResults([])
                    setError('')
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search Teams</label>
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => {
                      setTeamSearchQuery(e.target.value)
                      searchTeams(e.target.value, league.sport)
                    }}
                    placeholder="Enter team name..."
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                {searching && (
                  <div className="text-center py-4 text-slate-400">
                    Searching...
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((team) => (
                      <div key={team.id} className="bg-slate-800 rounded p-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{team.name}</h4>
                          <p className="text-sm text-slate-400">{team.sport}</p>
                        </div>
                        <button
                          onClick={() => inviteTeam(team.id)}
                          disabled={inviting}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white px-3 py-1 rounded text-sm"
                        >
                          {inviting ? 'Inviting...' : 'Invite'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {teamSearchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="text-center py-4 text-slate-400">
                    No teams found matching "{teamSearchQuery}"
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-blue-500/20 border border-blue-500 rounded">
                    <p className="text-sm text-blue-100">
                      Teams will receive a notification about the league invitation and can choose to join.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-500/20 border border-green-500 rounded">
                    <p className="text-sm text-green-100 mb-2">
                      <strong>Alternative:</strong> Share this invite code directly with team administrators:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-800 px-4 py-2 rounded font-mono text-lg tracking-wider flex-1 text-center">
                        {league.inviteCode}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(league.inviteCode)
                          // Show temporary feedback
                          const btn = event?.target as HTMLButtonElement
                          const originalText = btn.textContent
                          btn.textContent = 'Copied!'
                          setTimeout(() => {
                            btn.textContent = originalText
                          }, 2000)
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap"
                      >
                        Copy Code
                      </button>
                    </div>
                    <p className="text-xs text-green-200 mt-2">
                      Team administrators can use this code on the "Join League" page to join {league.name}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit League Modal */}
        {showEditLeague && league && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Edit League</h3>
                <button
                  onClick={() => setShowEditLeague(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <EditLeagueForm 
                leagueId={league.id}
                currentLeague={league}
                onSuccess={() => {
                  setShowEditLeague(false)
                  loadTeamLeague()
                }}
                onCancel={() => setShowEditLeague(false)}
              />
            </div>
          </div>
        )}

        {/* Delete League Modal */}
        {showDeleteLeague && league && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-red-400">Delete League</h3>
                <button
                  onClick={() => setShowDeleteLeague(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DeleteLeagueForm 
                leagueId={league.id}
                currentLeague={league}
                onSuccess={() => {
                  setShowDeleteLeague(false)
                  loadTeamLeague()
                }}
                onCancel={() => setShowDeleteLeague(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
