
'use client'
interface Tournament {
  id: string;
  name: string;
  description?: string;
  format?: string;
  status: string;
  hasConsolationBracket?: boolean;
  randomByes?: boolean;
  maxTeams?: number | null;
  leagueId?: string;
  seasonId?: string | null;
  createdById?: string;
  winnerId?: string | null;
  runnerUpId?: string | null;
  thirdPlaceId?: string | null;
  createdAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  // Add other fields as needed
}

interface League {
  id: string;
  name: string;
  sport: string;
  inviteCode: string;
  // Add other fields as needed
}

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import LoadingSpinner from './LoadingSpinner'
import ConfirmModal from './ConfirmModal'
import ScheduleMatchModal from './ScheduleMatchModal'
import ScoreSubmissionManager from './ScoreSubmissionManager'
import SeasonStandings from './SeasonStandings'

interface SeasonMatch {
  id: string
  homeTeamId: string
  awayTeamId: string
  scheduledAt: string | null
  location: string | null
  description: string | null
  notes: string | null
  status: 'SCHEDULED' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED'
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
}

interface ScoreSubmission {
  id: string
  seasonMatchId: string
  submittedById: string
  submittingTeamId: string
  homeScore: number
  awayScore: number
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'REJECTED'
  notes?: string
  disputeReason?: string
  submittedAt: string
  confirmedAt?: string
  submittedBy: {
    id: string
    name: string
    email: string
  }
  submittingTeam: {
    id: string
    name: string
  }
  confirmedBy?: {
    id: string
    name: string
    email: string
  }
  confirmingTeam?: {
    id: string
    name: string
  }
}

interface UserTeamMembership {
  teamId: string
  isAdmin: boolean
}

interface SeasonStanding {
  id: string
  teamId: string
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  points: number
  team: {
    id: string
    name: string
  }
}

interface Season {
  id: string
  name: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED'
  scheduleType: 'ROUND_ROBIN' | 'FIXED_GAMES'
  gamesPerOpponent: number | null
  totalGamesPerTeam: number | null
  startDate: Date | null
  endDate: Date | null
  hasTournament: boolean
  tournamentName: string | null
  tournament: Tournament | null
  createdAt: Date
  seasonMatches: SeasonMatch[]
  seasonStandings: SeasonStanding[]
}

interface SeasonDashboardProps {
  league: League
  seasonId: string
  isManager: boolean
  onBack: () => void
}

export default function SeasonDashboard({ league, seasonId, isManager, onBack }: SeasonDashboardProps) {
  const { data: session } = useSession()
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'statistics' | 'settings'>('matches')
  const [completingMatch, setCompletingMatch] = useState<string | null>(null)
  const [matchScores, setMatchScores] = useState<{[key: string]: {home: string, away: string}}>({})
  const [schedulingMatch, setSchedulingMatch] = useState<SeasonMatch | null>(null)
  const [userTeamMemberships, setUserTeamMemberships] = useState<UserTeamMembership[]>([])
  const [scoreSubmissions, setScoreSubmissions] = useState<{[matchId: string]: ScoreSubmission[]}>({})
  const [submittingScore, setSubmittingScore] = useState<string | null>(null)
  const [scoreNotes, setScoreNotes] = useState<{[matchId: string]: string}>({})

  // Utility functions for date-based restrictions
  const isMatchDayOrPast = (match: SeasonMatch): boolean => {
    if (!match.scheduledAt) return true // Allow if no date is set
    const matchDate = new Date(match.scheduledAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    matchDate.setHours(0, 0, 0, 0) // Start of match day
    return matchDate <= today
  }

  const canEnterScore = (match: SeasonMatch): boolean => {
    // League managers can still enter scores directly (existing behavior)
    if (isManager && match.status === 'SCHEDULED' && isMatchDayOrPast(match)) {
      return true
    }
    return false
  }

  const canSubmitScore = (match: SeasonMatch): boolean => {
    // Team administrators can submit scores for past matches
    if (match.status !== 'SCHEDULED' || !isMatchDayOrPast(match)) {
      return false
    }
    
    // Check if match already has a confirmed submission
    const submissions = scoreSubmissions[match.id] || []
    const hasConfirmedSubmission = submissions.some(sub => sub.status === 'CONFIRMED')
    if (hasConfirmedSubmission) {
      return false
    }
    
    // Check if user is admin of either team in this match
    const isHomeTeamAdmin = userTeamMemberships.some(
      membership => membership.teamId === match.homeTeamId && membership.isAdmin
    )
    const isAwayTeamAdmin = userTeamMemberships.some(
      membership => membership.teamId === match.awayTeamId && membership.isAdmin
    )
    
    if (!isHomeTeamAdmin && !isAwayTeamAdmin) {
      return false
    }
    
    // Check if match already has confirmed scores
    if (match.homeScore !== null && match.awayScore !== null) {
      return false
    }
    
    // Check if this team has already submitted a score
    const userTeamId = isHomeTeamAdmin ? match.homeTeamId : match.awayTeamId
    const hasSubmitted = submissions.some(
      sub => sub.submittingTeamId === userTeamId
    )
    
    return !hasSubmitted
  }

  const canAssignPlayers = (match: SeasonMatch): boolean => {
    // Can assign if match hasn't been completed or if no score has been entered
    if (match.status === 'COMPLETED' && match.homeScore !== null && match.awayScore !== null) {
      return false // Cannot assign if match is completed and has scores
    }
    return true // Can assign in all other cases
  }

  useEffect(() => {
    fetchSeason()
    if (session?.user?.email) {
      fetchUserTeamMemberships()
    }
  }, [seasonId, session])

  useEffect(() => {
    if (season?.seasonMatches) {
      fetchScoreSubmissions()
    }
  }, [season])

  const fetchUserTeamMemberships = async () => {
    try {
      const response = await fetch('/api/user/team-memberships')
      if (response.ok) {
        const data = await response.json()
        setUserTeamMemberships(data.memberships || [])
      }
    } catch (error) {
      console.error('Error fetching user team memberships:', error)
    }
  }

  const fetchScoreSubmissions = async () => {
    if (!season?.seasonMatches) return
    
    try {
      const submissions: {[matchId: string]: ScoreSubmission[]} = {}
      
      // Fetch submissions for each match
      await Promise.all(season.seasonMatches.map(async (match) => {
        try {
          const response = await fetch(`/api/season-matches/${match.id}/scores`)
          if (response.ok) {
            const data = await response.json()
            submissions[match.id] = data.submissions || []
          }
        } catch (error) {
          console.error(`Error fetching submissions for match ${match.id}:`, error)
          submissions[match.id] = []
        }
      }))
      
      setScoreSubmissions(submissions)
    } catch (error) {
      console.error('Error fetching score submissions:', error)
    }
  }

  const fetchSeason = async () => {
    if (!seasonId) {
      console.error('Failed to fetch season: seasonId is undefined')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setSeason(data.season) // Fix: Extract season from the response
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch season:', response.status, response.statusText, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch season:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateMatchScore = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!isManager) return

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${seasonId}/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeScore,
          awayScore,
          status: 'COMPLETED'
        })
      })

      if (response.ok) {
        await fetchSeason() // Refresh data
        setCompletingMatch(null)
        setMatchScores(prev => {
          const updated = { ...prev }
          delete updated[matchId]
          return updated
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update match')
      }
    } catch (error) {
      console.error('Failed to update match:', error)
      alert('Failed to update match')
    }
  }

  const submitMatchScore = async (matchId: string, homeScore: number, awayScore: number, notes?: string) => {
    try {
      const response = await fetch(`/api/season-matches/${matchId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeScore,
          awayScore,
          notes
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Score submitted successfully!')
        await fetchScoreSubmissions() // Refresh submissions
        setSubmittingScore(null)
        setMatchScores(prev => {
          const updated = { ...prev }
          delete updated[matchId]
          return updated
        })
        setScoreNotes(prev => {
          const updated = { ...prev }
          delete updated[matchId]
          return updated
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit score')
      }
    } catch (error) {
      console.error('Failed to submit score:', error)
      alert('Failed to submit score')
    }
  }

  const confirmScore = async (submissionId: string, matchId: string, action: 'CONFIRM' | 'DISPUTE', disputeReason?: string) => {
    try {
      const response = await fetch(`/api/season-matches/${matchId}/scores/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.toLowerCase(),
          disputeReason
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || `Score ${action.toLowerCase()}ed successfully!`)
        await fetchSeason() // Refresh season data to get updated match scores
        await fetchScoreSubmissions() // Refresh submissions
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${action.toLowerCase()} score`)
      }
    } catch (error) {
      console.error(`Failed to ${action.toLowerCase()} score:`, error)
      alert(`Failed to ${action.toLowerCase()} score`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      case 'ACTIVE': return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'COMPLETED': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      case 'ARCHIVED': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
      case 'CANCELLED': return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'SCHEDULED': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
    }
  }

  const calculateGoalDifference = (standing: SeasonStanding) => {
    return standing.goalsFor - standing.goalsAgainst
  }

  const handleCreateTournament = async () => {
    console.log('[CREATE-TOURNAMENT] Button clicked', { isManager, season })
    if (!isManager || !season) {
      console.log('[CREATE-TOURNAMENT] Blocked - not manager or no season')
      return
    }

    const tournamentName = (document.getElementById('tournamentName') as HTMLInputElement)?.value
    const tournamentFormat = (document.getElementById('tournamentFormat') as HTMLSelectElement)?.value
    const maxTeams = (document.getElementById('maxTeams') as HTMLSelectElement)?.value
    const startDate = (document.getElementById('startDate') as HTMLInputElement)?.value

    console.log('[CREATE-TOURNAMENT] Form values:', { tournamentName, tournamentFormat, maxTeams, startDate })

    if (!tournamentName) {
      alert('Please enter a tournament name')
      return
    }

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${season.id}/create-tournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentName,
          format: tournamentFormat,
          maxTeams: maxTeams ? parseInt(maxTeams) : null,
          startDate: startDate || null,
          description: `Tournament created from ${season.name} final standings`
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Tournament "${tournamentName}" created successfully with seeded teams!`)
        await fetchSeason() // Refresh to show the linked tournament
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create tournament')
      }
    } catch (error) {
      console.error('Failed to create tournament:', error)
      alert('Failed to create tournament')
    }
  }

  const sortedStandings = season?.seasonStandings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return calculateGoalDifference(b) - calculateGoalDifference(a)
  }) || []

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="text-center py-8 bg-slate-900 rounded-lg">
        <p className="text-slate-400">Season not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Seasons
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 p-6 rounded-lg border border-slate-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">{season.name}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(season.status)}`}>
                {season.status}
              </span>
            </div>
            <p className="text-slate-300">{league.name} • {season.scheduleType === 'ROUND_ROBIN' ? `Round Robin (${season.gamesPerOpponent}x)` : `${season.totalGamesPerTeam} games per team`}</p>
          </div>
        </div>
      </div>

      {/* Season Info */}
      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{season.seasonMatches.length}</div>
            <div className="text-sm text-slate-400">Total Matches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {season.seasonMatches.filter(m => m.status === 'COMPLETED').length}
            </div>
            <div className="text-sm text-slate-400">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {season.seasonMatches.filter(m => m.status === 'SCHEDULED').length}
            </div>
            <div className="text-sm text-slate-400">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{season.seasonStandings.length}</div>
            <div className="text-sm text-slate-400">Teams</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'matches', label: 'Matches', icon: '⚽' },
            { id: 'standings', label: 'Standings', icon: '🏆' },
            { id: 'statistics', label: 'Statistics', icon: '📊' },
            ...(isManager ? [{ id: 'settings', label: 'Settings', icon: '⚙️' }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {season.seasonMatches.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-4xl mb-4">⚽</div>
              <h3 className="text-lg font-medium text-white mb-2">No matches scheduled</h3>
              <p className="text-slate-400">
                {isManager ? "Generate a schedule to create matches for this season." : "No matches have been scheduled yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {season.seasonMatches.map(match => (
                <div key={match.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="text-center min-w-0 flex-1">
                        <div className="font-medium text-white">{match.homeTeam.name}</div>
                        <div className="text-sm text-slate-400">Home</div>
                      </div>
                      
                      <div className="text-center px-4">
                        {match.status === 'COMPLETED' ? (
                          <div className="text-lg font-bold text-white">
                            {match.homeScore} - {match.awayScore}
                          </div>
                        ) : (completingMatch === match.id || submittingScore === match.id) ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={matchScores[match.id]?.home || ''}
                                onChange={(e) => setMatchScores(prev => ({
                                  ...prev,
                                  [match.id]: { ...prev[match.id], home: e.target.value }
                                }))}
                                className="w-12 px-2 py-1 border border-slate-600 bg-slate-800 text-white rounded text-center"
                              />
                              <span className="text-white">-</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={matchScores[match.id]?.away || ''}
                                onChange={(e) => setMatchScores(prev => ({
                                  ...prev,
                                  [match.id]: { ...prev[match.id], away: e.target.value }
                                }))}
                                className="w-12 px-2 py-1 border border-slate-600 bg-slate-800 text-white rounded text-center"
                              />
                            </div>
                            {submittingScore === match.id && (
                              <input
                                type="text"
                                placeholder="Optional notes..."
                                value={scoreNotes[match.id] || ''}
                                onChange={(e) => setScoreNotes(prev => ({
                                  ...prev,
                                  [match.id]: e.target.value
                                }))}
                                className="w-full px-2 py-1 border border-slate-600 bg-slate-800 text-white rounded text-xs"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400">vs</div>
                        )}
                      </div>
                      
                      <div className="text-center min-w-0 flex-1">
                        <div className="font-medium text-white">{match.awayTeam.name}</div>
                        <div className="text-sm text-slate-400">Away</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                        {match.status}
                      </span>
                      
                      {match.scheduledAt && (
                        <div className="text-sm text-slate-400">
                          <div>{new Date(match.scheduledAt).toLocaleDateString()}</div>
                          <div className="text-xs">
                            {new Date(match.scheduledAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      )}
                      
                      {match.location && (
                        <div className="text-xs text-slate-400">
                          📍 {match.location}
                        </div>
                      )}
                      
                      {/* League Manager Score Entry */}
                      {isManager && match.status === 'SCHEDULED' && (
                        <div className="flex space-x-2">
                          {completingMatch === match.id ? (
                            <>
                              <button
                                onClick={() => {
                                  const scores = matchScores[match.id]
                                  if (scores?.home && scores?.away) {
                                    updateMatchScore(match.id, parseInt(scores.home), parseInt(scores.away))
                                  }
                                }}
                                disabled={!matchScores[match.id]?.home || !matchScores[match.id]?.away}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setCompletingMatch(null)
                                  setMatchScores(prev => {
                                    const updated = { ...prev }
                                    delete updated[match.id]
                                    return updated
                                  })
                                }}
                                className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setSchedulingMatch(match)}
                                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                              >
                                {match.scheduledAt ? 'Reschedule' : 'Schedule'}
                              </button>
                              {canEnterScore(match) ? (
                                <button
                                  onClick={() => setCompletingMatch(match.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Enter Score
                                </button>
                              ) : (
                                <div className="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded cursor-not-allowed" title={!isMatchDayOrPast(match) ? "Score entry available on match day" : "Score entry not available"}>
                                  Enter Score
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Team Administrator Score Submission */}
                      {!isManager && canSubmitScore(match) && (
                        <div className="flex space-x-2">
                          {submittingScore === match.id ? (
                            <>
                              <button
                                onClick={() => {
                                  const scores = matchScores[match.id]
                                  if (scores?.home && scores?.away) {
                                    submitMatchScore(
                                      match.id, 
                                      parseInt(scores.home), 
                                      parseInt(scores.away),
                                      scoreNotes[match.id]
                                    )
                                  }
                                }}
                                disabled={!matchScores[match.id]?.home || !matchScores[match.id]?.away}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Submit Score
                              </button>
                              <button
                                onClick={() => {
                                  setSubmittingScore(null)
                                  setMatchScores(prev => {
                                    const updated = { ...prev }
                                    delete updated[match.id]
                                    return updated
                                  })
                                  setScoreNotes(prev => {
                                    const updated = { ...prev }
                                    delete updated[match.id]
                                    return updated
                                  })
                                }}
                                className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSubmittingScore(match.id)}
                              className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                            >
                              Submit Score
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score Submissions Section */}
                  {scoreSubmissions[match.id] && scoreSubmissions[match.id].length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="text-sm font-medium text-white mb-2">Score Submissions</div>
                      {scoreSubmissions[match.id].map(submission => {
                        const isOpponentSubmission = userTeamMemberships.some(
                          membership => membership.isAdmin && (
                            (submission.submittingTeamId === match.homeTeamId && membership.teamId === match.awayTeamId) ||
                            (submission.submittingTeamId === match.awayTeamId && membership.teamId === match.homeTeamId)
                          )
                        )

                        return (
                          <div key={submission.id} className="bg-slate-800 p-3 rounded border border-slate-600 mb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm text-white">
                                  <strong>{submission.submittingTeam.name}</strong> submitted: {submission.homeScore} - {submission.awayScore}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  By {submission.submittedBy.name || submission.submittedBy.email} • {new Date(submission.submittedAt).toLocaleDateString()}
                                </div>
                                {submission.notes && (
                                  <div className="text-xs text-slate-300 mt-1 italic">"{submission.notes}"</div>
                                )}
                                {submission.status === 'DISPUTED' && submission.disputeReason && (
                                  <div className="text-xs text-red-400 mt-1">Disputed: {submission.disputeReason}</div>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  submission.status === 'PENDING' 
                                    ? 'bg-yellow-900 text-yellow-300' 
                                    : submission.status === 'CONFIRMED'
                                    ? 'bg-green-900 text-green-300'
                                    : submission.status === 'DISPUTED'
                                    ? 'bg-red-900 text-red-300'
                                    : 'bg-slate-700 text-slate-300'
                                }`}>
                                  {submission.status}
                                </span>
                                
                                {/* Allow opposing team admins to confirm/dispute */}
                                {isOpponentSubmission && submission.status === 'PENDING' && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => confirmScore(submission.id, match.id, 'CONFIRM')}
                                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Please provide a reason for disputing this score:')
                                        if (reason) {
                                          confirmScore(submission.id, match.id, 'DISPUTE', reason)
                                        }
                                      }}
                                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                      Dispute
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'standings' && (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Pos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    P
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    W
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    D
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    L
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    GF
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    GA
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    GD
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-900 divide-y divide-slate-700">
                {sortedStandings.map((standing, index) => (
                  <tr key={standing.id} className={index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {standing.team.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      {standing.wins + standing.draws + standing.losses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      {standing.wins}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      {standing.draws}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      {standing.losses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      {standing.goalsFor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      {standing.goalsAgainst}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      <span className={calculateGoalDifference(standing) >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {calculateGoalDifference(standing) >= 0 ? '+' : ''}{calculateGoalDifference(standing)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white text-center">
                      {standing.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {/* Season Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
              <div className="text-3xl font-bold text-blue-400">
                {season.seasonMatches.filter(m => m.status === 'COMPLETED').length}
              </div>
              <div className="text-sm text-slate-400">Matches Played</div>
            </div>
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
              <div className="text-3xl font-bold text-green-400">
                {season.seasonMatches.filter(m => m.status === 'COMPLETED')
                  .reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0)}
              </div>
              <div className="text-sm text-slate-400">Total Goals</div>
            </div>
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {season.seasonMatches.filter(m => m.status === 'COMPLETED' && m.homeScore === m.awayScore).length}
              </div>
              <div className="text-sm text-slate-400">Draws</div>
            </div>
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
              <div className="text-3xl font-bold text-orange-400">
                {season.seasonMatches.filter(m => m.status === 'COMPLETED').length > 0 
                  ? (season.seasonMatches.filter(m => m.status === 'COMPLETED')
                      .reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0) / 
                     season.seasonMatches.filter(m => m.status === 'COMPLETED').length).toFixed(1)
                  : '0.0'}
              </div>
              <div className="text-sm text-slate-400">Goals per Game</div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Attack */}
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
                ⚽ Best Attack
              </h3>
              <div className="space-y-3">
                {sortedStandings.slice(0, 5).map((standing, index) => (
                  <div key={standing.id} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-sm text-slate-400">#{index + 1}</span>
                      <span className="font-medium text-white">{standing.team.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">{standing.goalsFor}</div>
                      <div className="text-xs text-slate-400">
                        {standing.wins + standing.draws + standing.losses > 0 
                          ? (standing.goalsFor / (standing.wins + standing.draws + standing.losses)).toFixed(1)
                          : '0.0'} per game
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Defense */}
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
                🛡️ Best Defense
              </h3>
              <div className="space-y-3">
                {[...sortedStandings].sort((a, b) => a.goalsAgainst - b.goalsAgainst).slice(0, 5)
                  .map((standing, index) => (
                  <div key={standing.id} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-sm text-slate-400">#{index + 1}</span>
                      <span className="font-medium text-white">{standing.team.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-400">{standing.goalsAgainst}</div>
                      <div className="text-xs text-slate-400">
                        {standing.wins + standing.draws + standing.losses > 0 
                          ? (standing.goalsAgainst / (standing.wins + standing.draws + standing.losses)).toFixed(1)
                          : '0.0'} per game
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Table - Last 5 Results */}
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-white">Recent Form</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 px-4 text-slate-300">Team</th>
                    <th className="text-center py-2 px-4 text-slate-300">Last 5 Games</th>
                    <th className="text-center py-2 px-4 text-slate-300">Form Points</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStandings.map(standing => {
                    // Get last 5 matches for this team
                    const teamMatches = season.seasonMatches
                      .filter(m => m.status === 'COMPLETED' && 
                        (m.homeTeamId === standing.teamId || m.awayTeamId === standing.teamId))
                      .slice(-5)
                    
                    const formResults = teamMatches.map(match => {
                      const isHome = match.homeTeamId === standing.teamId
                      const teamScore = isHome ? match.homeScore : match.awayScore
                      const opponentScore = isHome ? match.awayScore : match.homeScore
                      
                      if (teamScore !== null && opponentScore !== null) {
                        if (teamScore > opponentScore) return 'W'
                        if (teamScore < opponentScore) return 'L'
                        return 'D'
                      }
                      return 'D' // Default to draw if scores are null
                    })

                    const formPoints = formResults.reduce((sum, result) => {
                      if (result === 'W') return sum + 3
                      if (result === 'D') return sum + 1
                      return sum
                    }, 0)

                    return (
                      <tr key={standing.id} className="border-b border-slate-700">
                        <td className="py-2 px-4 font-medium text-white">{standing.team.name}</td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex justify-center space-x-1">
                            {formResults.map((result, idx) => (
                              <span
                                key={idx}
                                className={`inline-block w-6 h-6 rounded text-xs font-bold text-white leading-6 text-center ${
                                  result === 'W' ? 'bg-green-500' :
                                  result === 'L' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}
                              >
                                {result}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-center font-bold text-white">
                          {formPoints}/{formResults.length * 3}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Match Results Distribution */}
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-white">Results Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sortedStandings.map(standing => (
                <div key={standing.id} className="border border-slate-600 rounded-lg p-4 bg-slate-800">
                  <h4 className="font-medium mb-2 text-white">{standing.team.name}</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Wins:</span>
                      <span className="font-medium text-white">{standing.wins}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-400">Draws:</span>
                      <span className="font-medium text-white">{standing.draws}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-400">Losses:</span>
                      <span className="font-medium text-white">{standing.losses}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-600">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-300">Win Rate:</span>
                        <span className="text-white">{standing.wins + standing.draws + standing.losses > 0 
                          ? ((standing.wins / (standing.wins + standing.draws + standing.losses)) * 100).toFixed(1)
                          : '0.0'}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && isManager && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-white">Season Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Season Name
                </label>
                <input
                  type="text"
                  value={season.name}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readOnly
                />
              </div>
            
            {season.description && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={season.description}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  readOnly
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={season.startDate ? new Date(season.startDate).toISOString().split('T')[0] : ''}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readOnly
                />
              </div>
              
              {season.endDate && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={new Date(season.endDate).toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    readOnly
                  />
                </div>
              )}
            </div>
            
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-400">
                  Settings can be modified when the season is in draft status. Once active, most settings become read-only.
                </p>
              </div>
            </div>
          </div>

          {/* Tournament Creation */}
          {season.status === 'COMPLETED' && !season.tournament && (
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 relative z-10">
              <h3 className="text-lg font-semibold mb-4 text-white">Create Tournament from Standings</h3>
              <p className="text-slate-400 mb-4">
                Create a tournament using the final season standings for seeding. Teams will be seeded based on their final league position.
              </p>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    placeholder={`${season.name} Championship`}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    id="tournamentName"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Tournament Format
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      id="tournamentFormat"
                    >
                      <option value="SINGLE_ELIMINATION">Single Elimination</option>
                      <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                      <option value="GROUP_STAGE">Group Stage</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Number of Teams
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      id="maxTeams"
                    >
                      <option value="">All Teams ({sortedStandings.length})</option>
                      <option value="8">Top 8 Teams</option>
                      <option value="4">Top 4 Teams</option>
                      <option value="2">Top 2 Teams</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    id="startDate"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-700 relative z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCreateTournament()
                    }}
                    className="relative z-30 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors cursor-pointer active:scale-95"
                  >
                    Create Tournament
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Existing Tournament Link */}
          {season.tournament && (
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Linked Tournament</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{season.tournament.name}</p>
                  <p className="text-sm text-slate-400">Status: {season.tournament.status}</p>
                </div>
                <button
                  onClick={() => season.tournament && window.open(`/tournaments/${season.tournament.id}`, '_blank')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Tournament
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Match Modal */}
      {schedulingMatch && (
        <ScheduleMatchModal
          match={schedulingMatch}
          leagueId={league.id}
          seasonId={seasonId}
          onClose={() => setSchedulingMatch(null)}
          onScheduled={() => {
            fetchSeason()
            setSchedulingMatch(null)
          }}
        />
      )}
    </div>
  )
}