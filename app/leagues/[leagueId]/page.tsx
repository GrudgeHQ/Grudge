'use client'

// League detail page with Members tab
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import JoinRequestsManager from '@/app/components/JoinRequestsManager'

import LeagueLeaderboard from '@/app/components/LeagueLeaderboard'
import SeasonStandings from '@/app/components/SeasonStandings'
import TournamentList from '@/app/components/TournamentList'
import TournamentCreateForm from '@/app/components/TournamentCreateForm'
import ScoresDashboard from '@/app/components/ScoresDashboard'

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
      sport: string
      members: Array<{
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
    homeTeam: {
      id: string
      name: string
    }
    awayTeam: {
      id: string
      name: string
    }
  }>
  seasons?: Array<{
    id: string
    name: string
    status: string
    seasonMatches: Array<{
      id: string
      scheduledAt: string | null
      location: string | null
      homeScore: number | null
      awayScore: number | null
      status: string
      homeTeamId: string
      awayTeamId: string
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

interface TransferManagerFormProps {
  leagueId: string
  league: League
  onSuccess: () => void
  onCancel: () => void
}

function TransferManagerForm({ leagueId, league, onSuccess, onCancel }: TransferManagerFormProps) {
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [teamAdmins, setTeamAdmins] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamAdmins()
    } else {
      setTeamAdmins([])
      setSelectedUserId('')
    }
  }, [selectedTeamId])

  const loadTeamAdmins = async () => {
    setLoadingAdmins(true)
    setError('')
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/members`)
      if (!res.ok) {
        throw new Error('Failed to load team members')
      }
      const data = await res.json()
      const admins = data.members.filter((member: any) => member.isAdmin)
      setTeamAdmins(admins)
      if (admins.length === 1) {
        setSelectedUserId(admins[0].userId)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingAdmins(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedUserId) {
      setError('Please select a team administrator')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/leagues/${leagueId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newManagerId: selectedUserId
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to transfer management')
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
      
      <div className="bg-orange-500/20 border border-orange-500 text-orange-100 px-4 py-3 rounded">
        <h4 className="font-medium mb-2">⚠️ Important:</h4>
        <p className="text-sm">
          Transferring League Manager role will give the selected person full control over this league. 
          You will lose management privileges and cannot undo this action.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Select Team</label>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-orange-500"
          required
        >
          <option value="">Choose a team...</option>
          {league.teams.map((lt) => (
            <option key={lt.team.id} value={lt.team.id}>
              {lt.team.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTeamId && (
        <div>
          <label className="block text-sm font-medium mb-2">Select Team Administrator</label>
          {loadingAdmins ? (
            <div className="text-center py-4 text-gray-400">Loading administrators...</div>
          ) : teamAdmins.length === 0 ? (
            <div className="text-center py-4 text-gray-400">No administrators found for this team</div>
          ) : (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-orange-500"
              required
            >
              <option value="">Choose an administrator...</option>
              {teamAdmins.map((admin) => (
                <option key={admin.userId} value={admin.userId}>
                  {admin.user?.name || admin.user?.email || 'Unknown User'} - {admin.role}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleTransfer}
          disabled={loading || !selectedUserId}
          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white px-4 py-2 rounded"
        >
          {loading ? 'Transferring...' : 'Transfer Management'}
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

export default function LeagueDetailPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const router = useRouter()
  const [leagueId, setLeagueId] = useState<string | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [showInviteCode, setShowInviteCode] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showInviteTeam, setShowInviteTeam] = useState(false)
  const [showTransferManager, setShowTransferManager] = useState(false)
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'leaderboard' | 'matches' | 'tournaments'>('overview')
  const [showTournamentCreate, setShowTournamentCreate] = useState(false)
  const [tournamentRefreshKey, setTournamentRefreshKey] = useState(0)
  const [seasonMatches, setSeasonMatches] = useState<any[]>([])
  const [loadingSeasonMatches, setLoadingSeasonMatches] = useState(false)

  const loadCurrentUser = useCallback(async () => {
    try {
      const [profileRes, teamsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/user/team-memberships')
      ])
      
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        const user = profileData.user
        
        // Add team memberships to user object
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          // Fix: API returns 'memberships' not 'teams'
          user.teams = teamsData.memberships || []
        }
        
        setCurrentUser(user)
      }
    } catch (err) {
      console.error('Failed to load current user:', err)
    }
  }, [])

  const loadLeagueMembers = useCallback(async () => {
    if (!leagueId) return
    setLoadingMembers(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      } else {
        setMembers([])
      }
    } catch (err) {
      console.error('Failed to load league members:', err)
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }, [leagueId])

  const loadSeasonMatches = useCallback(async () => {
    if (!leagueId) return
    setLoadingSeasonMatches(true)
    try {
      console.log('Loading season matches for league:', leagueId)
      
      // Get current season
      const seasonRes = await fetch(`/api/leagues/${leagueId}/current-season`)
      console.log('Season response status:', seasonRes.status)
      
      if (!seasonRes.ok) {
        console.log('No current season found')
        setSeasonMatches([])
        setLoadingSeasonMatches(false)
        return
      }
      
      const seasonData = await seasonRes.json()
      console.log('Season data:', seasonData)
      
      if (!seasonData.season) {
        console.log('No season in response')
        setSeasonMatches([])
        setLoadingSeasonMatches(false)
        return
      }

      // Get all matches for this season
      const matchesRes = await fetch(`/api/leagues/${leagueId}/seasons/${seasonData.season.id}`)
      console.log('Matches response status:', matchesRes.status)
      
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json()
        console.log('Matches data:', matchesData)
        console.log('Number of matches:', matchesData.season?.matches?.length || 0)
        setSeasonMatches(matchesData.season?.matches || [])
      } else {
        console.log('Failed to fetch matches')
        setSeasonMatches([])
      }
    } catch (err) {
      console.error('Failed to load season matches:', err)
      setSeasonMatches([])
    } finally {
      setLoadingSeasonMatches(false)
    }
  }, [leagueId])

  const loadLeague = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/leagues/${leagueId}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load league')
      }
      const data = await res.json()
      console.log('League data loaded:', data.league)
      console.log('Seasons in league:', data.league.seasons)
      console.log('Number of seasons:', data.league.seasons?.length || 0)
      setLeague(data.league)
      if (data.league.teams.length > 0) {
        setHomeTeamId(data.league.teams[0].team.id)
        if (data.league.teams.length > 1) {
          setAwayTeamId(data.league.teams[1].team.id)
        }
      }
    } catch (err) {
      setError('Failed to load league')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    params.then((p) => setLeagueId(p.leagueId))
  }, [params])

  useEffect(() => {
    if (leagueId) {
      loadLeague()
      loadCurrentUser()
    }
  }, [leagueId, loadLeague, loadCurrentUser])

  useEffect(() => {
    if (leagueId && activeTab === 'members') {
      loadLeagueMembers()
    }
  }, [leagueId, activeTab, loadLeagueMembers])

  useEffect(() => {
    console.log('useEffect triggered - activeTab:', activeTab, 'leagueId:', leagueId)
    if (leagueId && activeTab === 'matches') {
      console.log('Calling loadSeasonMatches()')
      loadSeasonMatches()
    }
  }, [leagueId, activeTab, loadSeasonMatches])

  const handleScheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!homeTeamId || !awayTeamId || !scheduledAt || !leagueId) {
      setError('Please fill in all required fields')
      return
    }

    if (homeTeamId === awayTeamId) {
      setError('Home and away teams must be different')
      return
    }

    setScheduling(true)
    setError('')

    try {
      const res = await fetch(`/api/leagues/${leagueId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId,
          awayTeamId,
          scheduledAt,
          location: location.trim() || null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to schedule match')
      }

      setShowScheduleForm(false)
      setLocation('')
      setScheduledAt('')
      loadLeague()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setScheduling(false)
    }
  }

  const copyInviteCode = () => {
    if (league) {
      navigator.clipboard.writeText(league.inviteCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const searchTeams = async (query: string) => {
    if (!query.trim() || !league) return

    setSearching(true)
    try {
      const res = await fetch(`/api/teams/search?q=${encodeURIComponent(query)}&sport=${league.sport}&excludeLeague=${league.id}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.teams || [])
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const inviteTeam = async (teamId: string) => {
    if (!league || !leagueId) return

    setInviting(true)
    setError('')

    try {
      const res = await fetch(`/api/leagues/${leagueId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to invite team')
      }

      setShowInviteTeam(false)
      setTeamSearchQuery('')
      setSearchResults([])
      // Optionally reload league data or show success message
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  // Check if current user is the league creator
  const isLeagueAdmin = currentUser && league && currentUser.id === league.creator.id

  const handleEditMatch = (match: any) => {
    // Pre-fill form with match data
    setHomeTeamId(match.homeTeam.id)
    setAwayTeamId(match.awayTeam.id)
    setScheduledAt(new Date(match.scheduledAt).toISOString().slice(0, 16))
    setLocation(match.location || '')
    setShowScheduleForm(true)
    // Note: We'd need to add edit state and match ID to differentiate between create/edit
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!leagueId || !confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/leagues/${leagueId}/matches/${matchId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete match')
      }

      loadLeague() // Reload to show updated matches
    } catch (err: any) {
      setError(err.message)
    }
  }



  if (loading || !league) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <p>Loading...</p>
      </div>
    )
  }

  // Only include matches with a valid, non-epoch scheduled date
  const scheduledMatches = league.matches.filter((m) => {
    if (!m?.scheduledAt) return false
    const t = new Date(m.scheduledAt).getTime()
    return Number.isFinite(t) && t > 0
  })

  const upcomingMatches = scheduledMatches.filter(
    (m) => new Date(m.scheduledAt) > new Date()
  ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const pastMatches = scheduledMatches.filter(
    (m) => new Date(m.scheduledAt) <= new Date()
  ).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{league.name}</h1>
            <p className="text-gray-400">
              {league.sport} • <span className="text-blue-400 font-medium">League Manager:</span> {league.creator.name}
            </p>
          </div>
          <button
            onClick={() => router.push('/leagues')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
          >
            Back to Leagues
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-gray-900 rounded-lg mb-8">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              📋 Overview
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'members'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              👥 Members
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'leaderboard'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'matches'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              ⚽ Matches
            </button>
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'tournaments'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              🏆 Tournaments
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'leaderboard' && leagueId && (
              <SeasonStandings leagueId={leagueId} />
            )}

            {activeTab === 'tournaments' && leagueId && (
              <TournamentList 
                key={tournamentRefreshKey}
                leagueId={leagueId}
                isLeagueManager={isLeagueAdmin}
                onCreateTournament={() => {
                  console.log('Create tournament button clicked!')
                  setShowTournamentCreate(true)
                }}
              />
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">League Members</h2>
                  <div className="text-sm text-gray-400">
                    {members.length} member{members.length !== 1 ? 's' : ''} across {league?.teams.length || 0} team{league?.teams.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {loadingMembers ? (
                  <div className="flex justify-center py-8">
                    <div className="text-gray-400">Loading members...</div>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">No members found</div>
                    <p className="text-sm text-gray-500">Members will appear here once teams join the league</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group members by team */}
                    {Object.entries(
                      members.reduce((acc: any, member: any) => {
                        const teamId = member.team.id
                        if (!acc[teamId]) {
                          acc[teamId] = {
                            team: member.team,
                            members: []
                          }
                        }
                        acc[teamId].members.push(member)
                        return acc
                      }, {})
                    ).map(([teamId, teamData]: [string, any]) => (
                      <div key={teamId} className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-blue-400">
                            {teamData.team.name}
                          </h3>
                          <div className="text-sm text-gray-400">
                            {teamData.members.length} member{teamData.members.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {teamData.members.map((member: any) => (
                            <div key={member.id} className="bg-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-white">
                                    {member.user.name || member.user.email}
                                  </h4>
                                  {member.user.name && (
                                    <p className="text-sm text-gray-400">
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
                                      : 'bg-gray-600 text-gray-200'
                                  }`}>
                                    {member.role.toLowerCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Summary stats */}
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <h3 className="text-lg font-bold mb-4">Member Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {members.length}
                          </div>
                          <div className="text-sm text-gray-400">Total Members</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            {members.filter(m => m.isAdmin).length}
                          </div>
                          <div className="text-sm text-gray-400">Administrators</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {members.filter(m => m.role === 'CAPTAIN').length}
                          </div>
                          <div className="text-sm text-gray-400">Captains</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">
                            {members.filter(m => m.role === 'COACH').length}
                          </div>
                          <div className="text-sm text-gray-400">Coaches</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-6">
                {/* Schedule Match Section - Only for League Managers */}
                {isLeagueAdmin && league.teams.length >= 2 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Schedule Match</h2>
                      {!showScheduleForm && (
                        <button
                          onClick={() => setShowScheduleForm(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                        >
                          Schedule New Match
                        </button>
                      )}
                    </div>

                    {showScheduleForm && (
                      <form onSubmit={handleScheduleMatch} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Home Team *
                            </label>
                            <select
                              value={homeTeamId}
                              onChange={(e) => setHomeTeamId(e.target.value)}
                              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                              required
                            >
                              {league.teams.map((lt) => (
                                <option key={lt.team.id} value={lt.team.id}>
                                  {lt.team.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Away Team *
                            </label>
                            <select
                              value={awayTeamId}
                              onChange={(e) => setAwayTeamId(e.target.value)}
                              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                              required
                            >
                              {league.teams.map((lt) => (
                                <option key={lt.team.id} value={lt.team.id}>
                                  {lt.team.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Date & Time *
                          </label>
                          <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Location
                          </label>
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                            placeholder="e.g., Main Stadium"
                          />
                        </div>

                        <div className="flex gap-4">
                          <button
                            type="submit"
                            disabled={scheduling}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-2 rounded"
                          >
                            {scheduling ? 'Scheduling...' : 'Schedule Match'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowScheduleForm(false)}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Matches List */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">All Matches ({scheduledMatches.length})</h2>

                  {scheduledMatches.length === 0 ? (
                    <p className="text-gray-400">No matches scheduled yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {upcomingMatches.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-3 text-green-400">
                            Upcoming ({upcomingMatches.length})
                          </h3>
                          <div className="space-y-3">
                            {upcomingMatches.map((match) => (
                              <div
                                key={match.id}
                                className="bg-gray-700 rounded p-4 border-l-4 border-green-500"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-lg">
                                      {match.homeTeam.name} vs {match.awayTeam.name}
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                      {new Date(match.scheduledAt).toLocaleString()}
                                    </p>
                                    {match.location && (
                                      <p className="text-gray-300 text-sm">📍 {match.location}</p>
                                    )}
                                  </div>
                                  {isLeagueAdmin && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditMatch(match)}
                                        className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMatch(match.id)}
                                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pastMatches.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-3 text-gray-400">
                            Past ({pastMatches.length})
                          </h3>
                          <div className="space-y-3">
                            {pastMatches.map((match) => (
                              <div
                                key={match.id}
                                className="bg-gray-700 rounded p-4 border-l-4 border-gray-600 opacity-75"
                              >
                                <div>
                                  <p className="font-bold text-lg">
                                    {match.homeTeam.name} vs {match.awayTeam.name}
                                  </p>
                                  <p className="text-gray-300 text-sm">
                                    {new Date(match.scheduledAt).toLocaleString()}
                                  </p>
                                  {match.location && (
                                    <p className="text-gray-300 text-sm">📍 {match.location}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* League Season Matches */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">League Matches</h2>
                    {currentUser && (
                      <div className="text-xs text-gray-400">
                        {isLeagueAdmin && <span className="bg-blue-600 px-2 py-1 rounded mr-2">League Manager</span>}
                        {currentUser.teams?.length > 0 && <span>Team Admin of {currentUser.teams.length} team(s)</span>}
                      </div>
                    )}
                  </div>
                  
                  {(() => {
                    // Get all season matches from all seasons
                    const allSeasonMatches = league?.seasons?.flatMap(s => s.seasonMatches || []) || []
                    
                    // All data loaded successfully
                    return (
                      <>
                        {allSeasonMatches.length === 0 ? (
                          <p className="text-gray-400">No league matches found. Create a season to generate matches.</p>
                        ) : (
                          <div className="space-y-4">
                            {allSeasonMatches.map((match: any) => {
                              // Determine match state
                              const isPast = match.scheduledAt && new Date(match.scheduledAt) < new Date()
                              const hasScore = match.homeScore !== null && match.awayScore !== null
                              const needsConfirmation = match.status === 'PENDING_CONFIRMATION'
                              const isConfirmed = match.status === 'CONFIRMED'
                              
                              // Check if there's a confirmed submission (additional check)
                              const hasConfirmedSubmission = match.scoreSubmissions?.some((sub: any) => sub.status === 'CONFIRMED') || false
                              
                              // Check if user can manage scores
                              const userTeamMemberships = currentUser?.teams || []
                              const isHomeTeamAdmin = currentUser ? userTeamMemberships.some(
                                (t: any) => t.teamId === match.homeTeamId && t.isAdmin
                              ) : false
                              const isAwayTeamAdmin = currentUser ? userTeamMemberships.some(
                                (t: any) => t.teamId === match.awayTeamId && t.isAdmin
                              ) : false
                              const canManageScore = isLeagueAdmin || isHomeTeamAdmin || isAwayTeamAdmin
                              
                              // Show submit button for past matches without confirmed scores (or future matches for preview)
                              // Don't show if there's already a confirmed submission
                              const showSubmitButton = isPast && !isConfirmed && !hasConfirmedSubmission && canManageScore
                              const showConfirmButton = needsConfirmation && !hasConfirmedSubmission && canManageScore

                              return (
                          <div
                            key={match.id}
                            className={`bg-gray-700 rounded p-4 border-l-4 ${
                              needsConfirmation ? 'border-yellow-500' : 
                              isConfirmed ? 'border-green-500' :
                              isPast ? 'border-red-500' :
                              'border-blue-500'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <p className="font-bold text-lg">
                                  {match.homeTeam.name} vs {match.awayTeam.name}
                                </p>
                                <p className="text-gray-300 text-sm">
                                  {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : 'Not scheduled'}
                                </p>
                                {match.location && (
                                  <p className="text-gray-300 text-sm">📍 {match.location}</p>
                                )}
                                <div className="mt-1">
                                  {isPast && !hasScore && (
                                    <span className="inline-block bg-red-600 text-white text-xs px-2 py-1 rounded mr-2">
                                      Needs Score
                                    </span>
                                  )}
                                  {needsConfirmation && (
                                    <span className="inline-block bg-yellow-600 text-white text-xs px-2 py-1 rounded mr-2">
                                      Pending Confirmation
                                    </span>
                                  )}
                                  {isConfirmed && (
                                    <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded mr-2">
                                      Confirmed
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {hasScore && (
                                  <div className="text-2xl font-bold">
                                    {match.homeScore} - {match.awayScore}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                              {showSubmitButton && (
                                <button
                                  onClick={() => router.push(`/season-matches/${match.id}`)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                                >
                                  {hasScore ? '✏️ Edit Score' : '📝 Submit Score'}
                                </button>
                              )}
                              {showConfirmButton && (
                                <button
                                  onClick={() => router.push(`/season-matches/${match.id}`)}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium"
                                >
                                  ✅ Review & Confirm
                                </button>
                              )}
                              <button
                                onClick={() => router.push(`/season-matches/${match.id}`)}
                                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}



            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Invite Code Section */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">Invite Teams</h2>
              <p className="text-gray-400 text-sm mb-4">
                Share the invite code with team admins or directly invite teams to join the league
              </p>
            </div>
            <div className="flex gap-2">
              {isLeagueAdmin && (
                <button
                  onClick={() => setShowInviteTeam(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Invite Team
                </button>
              )}
              <button
                onClick={() => setShowInviteCode(!showInviteCode)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                {showInviteCode ? 'Hide Code' : 'Share Code'}
              </button>
            </div>
          </div>
          {showInviteCode && (
            <div className="flex items-center gap-4 mt-4">
              <div className="bg-gray-800 px-6 py-3 rounded font-mono text-2xl tracking-wider">
                {league.inviteCode}
              </div>
              <button
                onClick={copyInviteCode}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* League Manager Controls */}
        {isLeagueAdmin && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-blue-500/30">
            <h2 className="text-xl font-bold mb-4 text-blue-400">League Manager Controls</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransferManager(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Transfer Management
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Transfer League Manager role to a team administrator in this league.
              </p>
            </div>
          </div>
        )}

        {/* Join Requests Management */}
        {isLeagueAdmin && (
          <JoinRequestsManager 
            leagueId={leagueId!} 
            leagueName={league.name}
          />
        )}

        {/* Teams Section */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Teams ({league.teams.length})</h2>
          {league.teams.length === 0 ? (
            <p className="text-gray-400">No teams have joined yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {league.teams.map((lt) => {
                const admins = lt.team.members.filter(member => member.isAdmin)
                const regularMembers = lt.team.members.filter(member => !member.isAdmin)
                
                return (
                  <div key={lt.team.id} className="bg-gray-800 rounded p-4">
                    <h3 className="font-bold text-lg mb-2">{lt.team.name}</h3>
                    <p className="text-sm text-gray-400 mb-3">{lt.team.sport}</p>
                    
                    {/* Team Administrators */}
                    {admins.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-blue-400 mb-1">
                          Administrator{admins.length > 1 ? 's' : ''}:
                        </h4>
                        <div className="space-y-1">
                          {admins.map((admin) => (
                            <div key={admin.id} className="text-sm text-gray-300">
                              <span className="font-medium">{admin.user.name || admin.user.email}</span>
                              {admin.role !== 'ADMIN' && (
                                <span className="text-gray-500 ml-1">({admin.role})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Regular Members Count */}
                    {regularMembers.length > 0 && (
                      <div className="text-xs text-gray-500">
                        +{regularMembers.length} other member{regularMembers.length > 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {/* Total Members Count */}
                    <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                      Total: {lt.team.members.length} member{lt.team.members.length > 1 ? 's' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Schedule Match Section - Only for League Managers */}
        {isLeagueAdmin && league.teams.length >= 2 && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Schedule Match</h2>
              {!showScheduleForm && (
                <button
                  onClick={() => setShowScheduleForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                >
                  Schedule New Match
                </button>
              )}
            </div>

            {showScheduleForm && (
              <form onSubmit={handleScheduleMatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Home Team *
                    </label>
                    <select
                      value={homeTeamId}
                      onChange={(e) => setHomeTeamId(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                      required
                    >
                      {league.teams.map((lt) => (
                        <option key={lt.team.id} value={lt.team.id}>
                          {lt.team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Away Team *
                    </label>
                    <select
                      value={awayTeamId}
                      onChange={(e) => setAwayTeamId(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                      required
                    >
                      {league.teams.map((lt) => (
                        <option key={lt.team.id} value={lt.team.id}>
                          {lt.team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Main Stadium"
                  />
                </div>

                <div className="bg-blue-500/20 border border-blue-500 text-blue-100 px-4 py-3 rounded">
                  <p className="text-sm">
                    This match will automatically appear in both teams' match calendars.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={scheduling}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-2 rounded"
                  >
                    {scheduling ? 'Scheduling...' : 'Schedule Match'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScheduleForm(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}



        {/* Matches Section */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Matches ({scheduledMatches.length})</h2>

          {scheduledMatches.length === 0 ? (
            <p className="text-gray-400">No matches scheduled yet.</p>
          ) : (
            <div className="space-y-6">
              {upcomingMatches.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-3 text-green-400">
                    Upcoming ({upcomingMatches.length})
                  </h3>
                  <div className="space-y-3">
                    {upcomingMatches.map((match) => (
                      <div
                        key={match.id}
                        className="bg-gray-800 rounded p-4 border-l-4 border-green-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-lg">
                              {match.homeTeam.name} vs {match.awayTeam.name}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {new Date(match.scheduledAt).toLocaleString()}
                            </p>
                            {match.location && (
                              <p className="text-gray-400 text-sm">📍 {match.location}</p>
                            )}
                          </div>
                          {isLeagueAdmin && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditMatch(match)}
                                className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastMatches.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-3 text-gray-400">
                    Past ({pastMatches.length})
                  </h3>
                  <div className="space-y-3">
                    {pastMatches.map((match) => (
                      <div
                        key={match.id}
                        className="bg-gray-800 rounded p-4 border-l-4 border-gray-600 opacity-75"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-lg">
                              {match.homeTeam.name} vs {match.awayTeam.name}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {new Date(match.scheduledAt).toLocaleString()}
                            </p>
                            {match.location && (
                              <p className="text-gray-400 text-sm">📍 {match.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invite Team Modal */}
        {showInviteTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Invite Team to League</h3>
                <button
                  onClick={() => {
                    setShowInviteTeam(false)
                    setTeamSearchQuery('')
                    setSearchResults([])
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Search for {league.sport} teams
                </label>
                <input
                  type="text"
                  value={teamSearchQuery}
                  onChange={(e) => {
                    setTeamSearchQuery(e.target.value)
                    if (e.target.value.length >= 2) {
                      searchTeams(e.target.value)
                    } else {
                      setSearchResults([])
                    }
                  }}
                  placeholder="Enter team name..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              {searching && (
                <div className="text-center py-4 text-gray-400">
                  Searching...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((team) => (
                    <div key={team.id} className="bg-gray-800 rounded p-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{team.name}</h4>
                        <p className="text-sm text-gray-400">{team.sport}</p>
                      </div>
                      <button
                        onClick={() => inviteTeam(team.id)}
                        disabled={inviting}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                      >
                        {inviting ? 'Inviting...' : 'Invite'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {teamSearchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  No {league.sport} teams found matching "{teamSearchQuery}"
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500 rounded">
                <p className="text-sm text-blue-100">
                  Teams will receive a notification about the league invitation and can choose to join.
                </p>
              </div>
            </div>
          </div>
        )}

              </div>
            )}
          </div>
        </div>

        {/* Transfer Manager Modal */}
        {showTransferManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-orange-400">Transfer League Management</h3>
                <button
                  onClick={() => setShowTransferManager(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <TransferManagerForm 
                leagueId={leagueId!}
                league={league}
                onSuccess={() => {
                  setShowTransferManager(false)
                  loadLeague()
                }}
                onCancel={() => setShowTransferManager(false)}
              />
            </div>
          </div>
        )}

        {/* Tournament Create Modal */}
        {showTournamentCreate && leagueId && league && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-blue-400">Create Tournament</h3>
                <button
                  onClick={() => setShowTournamentCreate(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <TournamentCreateForm 
                leagueId={leagueId}
                teams={league.teams.map(lt => ({ id: lt.team.id, name: lt.team.name }))}
                onSuccess={(tournament) => {
                  console.log('Tournament created successfully:', tournament)
                  setShowTournamentCreate(false)
                  // Trigger TournamentList refresh by changing its key
                  setTournamentRefreshKey(prev => prev + 1)
                }}
                onCancel={() => {
                  console.log('Tournament creation cancelled')
                  setShowTournamentCreate(false)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
