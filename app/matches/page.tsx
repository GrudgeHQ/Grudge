"use client"
import React, { useEffect, useState, lazy, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTeamFilter } from '../context/TeamFilterContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ScoreSubmissionManager from '../components/ScoreSubmissionManager'

// Lazy load the calendar component to reduce initial bundle size
const AddToCalendar = lazy(() => import('../components/AddToCalendar'))

export default function MatchesPage() {
  const { selectedTeamId } = useTeamFilter()
  const router = useRouter()
  const [matches, setMatches] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [userTeamIds, setUserTeamIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = React.useCallback(() => {
    setLoading(true)
    // Load teams first
    fetch('/api/teams')
      .then((r) => r.json())
      .then((d) => {
        const teamData = d.teams || []
        setTeams(teamData)
        setUserTeamIds(teamData.map((t: any) => t.teamId))
      })
      .catch(() => {})

    // Load matches
    fetch('/api/matches')
      .then((r) => r.json())
      .then((d) => {
        setMatches(d.matches || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Refresh data when the component comes back into focus (like when navigating back from create page)
  useEffect(() => {
    const handleFocus = () => {
      loadData()
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Refresh when navigating back to this page
  useEffect(() => {
    const handlePopState = () => {
      // Small delay to ensure the component is fully mounted
      setTimeout(() => {
        loadData()
      }, 100)
    }

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', handlePopState)
    
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (loading) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading matches...</div>
      </main>
    )
  }

  // Filter matches by selected team
  const filteredMatches = selectedTeamId === 'all' 
    ? matches 
    : matches.filter((m) => m.teamId === selectedTeamId)

  // Filter out matches that don't have a valid, non-epoch scheduled date.
  const scheduledMatches = filteredMatches.filter((m) => {
    if (!m?.scheduledAt) return false
    const t = new Date(m.scheduledAt).getTime()
    return Number.isFinite(t) && t > 0
  });

  // Separate regular matches and league matches
  const regularMatches = scheduledMatches.filter((m) => !m.leagueMatchId)
  const leagueMatches = scheduledMatches.filter((m) => m.leagueMatchId)

  const upcomingRegular = regularMatches.filter((m) => new Date(m.scheduledAt) >= new Date())
  const pastRegular = regularMatches.filter((m) => new Date(m.scheduledAt) < new Date())
  
  const upcomingLeague = leagueMatches.filter((m) => new Date(m.scheduledAt) >= new Date())
  const pastLeague = leagueMatches.filter((m) => new Date(m.scheduledAt) < new Date())

  // For backward compatibility, keep the combined view as well
  const upcoming = scheduledMatches.filter((m) => new Date(m.scheduledAt) >= new Date())
  const past = scheduledMatches.filter((m) => new Date(m.scheduledAt) < new Date())

  const selectedTeam = teams.find((t) => t.teamId === selectedTeamId)

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Matches</h1>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            href="/matches/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
          >
            Create Match
          </Link>
        </div>
      </div>

      {selectedTeam && (
        <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-sm text-gray-400">
            Filtering matches for <span className="font-semibold text-blue-400">{selectedTeam.team.name}</span>
          </div>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Upcoming Team Matches</h2>
        {upcomingRegular.length === 0 ? (
          <div className="text-gray-400 bg-slate-800 border border-slate-700 p-6 rounded-lg text-center">
            No upcoming team matches scheduled
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingRegular.map((match) => (
              <MatchCard key={match.id} match={match} showTeamName={selectedTeamId === 'all'} userTeamIds={userTeamIds} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-purple-200 flex items-center gap-2">
          <span>🏆</span>
          Upcoming League Matches
        </h2>
        {upcomingLeague.length === 0 ? (
          <div className="text-gray-400 bg-slate-800 border border-slate-700 p-6 rounded-lg text-center">
            No upcoming league matches scheduled
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingLeague.map((match) => (
              <MatchCard key={match.id} match={match} showTeamName={selectedTeamId === 'all'} userTeamIds={userTeamIds} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Past Team Matches</h2>
        {pastRegular.length === 0 ? (
          <div className="text-gray-400 bg-slate-800 border border-slate-700 p-6 rounded-lg text-center">
            No past team matches
          </div>
        ) : (
          <div className="space-y-4">
            {pastRegular.map((match) => (
              <MatchCard key={match.id} match={match} showTeamName={selectedTeamId === 'all'} userTeamIds={userTeamIds} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-purple-200 flex items-center gap-2">
          <span>🏆</span>
          Past League Matches
        </h2>
        {pastLeague.length === 0 ? (
          <div className="text-gray-400 bg-slate-800 border border-slate-700 p-6 rounded-lg text-center">
            No past league matches
          </div>
        ) : (
          <div className="space-y-4">
            {pastLeague.map((match) => (
              <MatchCard key={match.id} match={match} showTeamName={selectedTeamId === 'all'} userTeamIds={userTeamIds} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function MatchCard({ match, showTeamName, userTeamIds = [] }: { match: any, showTeamName?: boolean, userTeamIds?: string[] }) {
  const date = new Date(match.scheduledAt)
  const isPast = date < new Date()
  const [availability, setAvailability] = useState<string>('MAYBE')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [assigning, setAssigning] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    opponentName: match.opponentName || '',
    scheduledAt: match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : '',
    location: match.location || '',
    requiredPlayers: match.requiredPlayers ? match.requiredPlayers.toString() : ''
  })
  const [localMatch, setLocalMatch] = useState(match)
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [homeScore, setHomeScore] = useState(match.homeScore || 0)
  const [awayScore, setAwayScore] = useState(match.awayScore || 0)
  const [scoreNotes, setScoreNotes] = useState('')
  const [isUpdatingScore, setIsUpdatingScore] = useState(false)

  useEffect(() => {
    // Load user's admin status for this match (needed for both past and future matches)
    fetch(`/api/matches/${match.id}/availability`)
      .then((r) => r.json())
      .then((d) => {
        const avails = d.availabilities || []
        const adminStatus = d.isAdmin || false
        setIsAdmin(adminStatus)
        
        if (!isPast && avails.length > 0) {
          if (adminStatus) {
            // Admin sees all availabilities and their own status
            setAvailablePlayers(avails.filter((a: any) => a.status === 'AVAILABLE'))
            // Find and set admin's own availability
            const myAvail = avails.find((a: any) => a.userId === d.currentUserId)
            if (myAvail) {
              setAvailability(myAvail.status)
            }
          } else {
            // Regular user sees only their own
            setAvailability(avails[0].status)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    if (!isPast) {
      // Load assignments (for admins)
      fetch(`/api/matches/${match.id}/assignments`)
        .then((r) => r.json())
        .then((d) => {
          setAssignments(d.assignments || [])
        })
        .catch(() => {})
    }
  }, [match.id, isPast])

  async function updateAvailability(e: React.MouseEvent, status: string) {
    e.preventDefault() // Prevent navigation to match detail
    e.stopPropagation()

    try {
      const res = await fetch(`/api/matches/${match.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: '' }),
      })

      if (res.ok) {
        setAvailability(status)
        
        // Reload availabilities to update available players list for admins
        const avails = await fetch(`/api/matches/${match.id}/availability`).then((r) => r.json())
        const availsList = avails.availabilities || []
        if (isAdmin) {
          setAvailablePlayers(availsList.filter((a: any) => a.status === 'AVAILABLE'))
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async function assignPlayer(e: React.MouseEvent, userId: string) {
    e.preventDefault()
    e.stopPropagation()
    setAssigning(true)

    try {
      const res = await fetch(`/api/matches/${match.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        // Reload assignments
        const data = await fetch(`/api/matches/${match.id}/assignments`).then((r) => r.json())
        setAssignments(data.assignments || [])
      }
    } catch (e) {
      // ignore
    } finally {
      setAssigning(false)
    }
  }

  async function removeAssignment(e: React.MouseEvent, assignmentId: string) {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Reload assignments
        const data = await fetch(`/api/matches/${match.id}/assignments`).then((r) => r.json())
        setAssignments(data.assignments || [])
      }
    } catch (e) {
      // ignore
    }
  }

  async function updateMatch(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentName: editForm.opponentName,
          scheduledAt: editForm.scheduledAt,
          location: editForm.location,
          requiredPlayers: editForm.requiredPlayers ? parseInt(editForm.requiredPlayers) : null
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setLocalMatch(data.match)
        setIsEditing(false)
      }
    } catch (e) {
      // ignore
    }
  }

  async function deleteMatch(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Delete this match? This cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        window.location.reload()
      }
    } catch (e) {
      // ignore
    }
  }

  async function updateScore(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsUpdatingScore(true)

    try {
      const res = await fetch(`/api/matches/${match.id}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          homeScore: parseInt(homeScore.toString()) || 0, 
          awayScore: parseInt(awayScore.toString()) || 0, 
          notes: scoreNotes.trim() || undefined 
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setLocalMatch({ ...localMatch, homeScore: parseInt(homeScore.toString()) || 0, awayScore: parseInt(awayScore.toString()) || 0 })
        setShowScoreForm(false)
        alert('Score updated successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update score')
      }
    } catch (e) {
      alert('Failed to update score')
    } finally {
      setIsUpdatingScore(false)
    }
  }

  const displayDate = new Date(localMatch.scheduledAt)

  return (
    <div className={`border border-slate-700 rounded-lg p-4 ${isPast ? 'bg-slate-800/50' : 'bg-slate-800'}`}>
      {!isEditing ? (
        <>
          <Link href={`/matches/${match.id}`}>
            <div className="hover:opacity-80 transition-opacity">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      vs {localMatch.opponentName || 'TBD'}
                    </h3>
                    {localMatch.homeScore !== null && localMatch.awayScore !== null && (
                      <span className={`text-sm font-medium px-2 py-1 rounded flex items-center gap-1 ${
                        localMatch.homeScore > localMatch.awayScore
                          ? 'bg-green-600 text-white'
                          : localMatch.homeScore < localMatch.awayScore
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                      }`}>
                        {localMatch.homeScore > localMatch.awayScore
                          ? '🎉'
                          : localMatch.homeScore < localMatch.awayScore
                            ? '😞'
                            : '🤝'}
                        {localMatch.homeScore} - {localMatch.awayScore}
                        {localMatch.homeScore > localMatch.awayScore
                          ? ' W'
                          : localMatch.homeScore < localMatch.awayScore
                            ? ' L'
                            : ' D'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>📅 {displayDate.toLocaleDateString()} at {displayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    {localMatch.location && <div>📍 {localMatch.location}</div>}
                    {showTeamName && match.team && (
                      <div className="text-xs text-blue-400">⚽ {match.team.name}</div>
                    )}
                    {match.leagueMatchId && (
                      <div className="text-xs text-purple-400">🏆 League Match</div>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col gap-2">
                  <div className="text-sm text-gray-500">
                    {isPast ? 'Completed' : 'Upcoming'}
                  </div>
                  {!isPast && localMatch.requiredPlayers && isAdmin && (
                    <div className="text-xs">
                      {(() => {
                        const confirmedCount = assignments.filter((a) => a.confirmed).length
                        const required = localMatch.requiredPlayers
                        if (confirmedCount >= required) {
                          return (
                            <div className="px-2 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded font-medium">
                              ✓ Full Roster ({confirmedCount}/{required})
                            </div>
                          )
                        } else {
                          return (
                            <div className="px-2 py-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded font-medium">
                              ⚠ {confirmedCount}/{required} confirmed
                            </div>
                          )
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
          
          {!isPast && (
            <div className="mt-3 pt-3 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
              <Suspense fallback={<LoadingSpinner size="sm" />}>
                <AddToCalendar
                  title={`${match.team?.name || 'Team'} vs ${localMatch.opponentName || 'TBD'}`}
                  description={`Match against ${localMatch.opponentName || 'TBD'}`}
                  location={localMatch.location || ''}
                  startTime={displayDate}
                  endTime={new Date(displayDate.getTime() + 2 * 60 * 60 * 1000)}
                  url={typeof window !== 'undefined' ? `${window.location.origin}/matches/${match.id}` : ''}
                />
              </Suspense>
            </div>
          )}
          
          {isAdmin && !isPast && !match.leagueMatchId && (
            <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
              >
                Edit
              </button>
              <button
                onClick={deleteMatch}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all"
              >
                Del
              </button>
            </div>
          )}

          {/* Update Score button for past matches (both external and league matches) */}
          {isAdmin && isPast && (
            <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  setHomeScore(localMatch.homeScore || 0);
                  setAwayScore(localMatch.awayScore || 0);
                  setShowScoreForm(true); 
                }}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
              >
                {match.leagueMatchId ? 'Submit League Score' : 'Update Score'}
              </button>
            </div>
          )}
          
          {match.leagueMatchId && !isPast && (
            <div className="mt-2 text-xs text-purple-400 bg-purple-900/20 border border-purple-700/50 rounded px-2 py-1" onClick={(e) => e.stopPropagation()}>
              ℹ️ This is a league match. Only the league manager can edit match details.
            </div>
          )}

          {match.leagueMatchId && isPast && (
            <div className="mt-2 text-xs text-blue-400 bg-blue-900/20 border border-blue-700/50 rounded px-2 py-1" onClick={(e) => e.stopPropagation()}>
              🏆 League match - Team administrators can submit scores for review.
            </div>
          )}

          {!isPast && !loading && (
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="text-xs text-gray-400 mb-2">Your Availability:</div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => updateAvailability(e, 'AVAILABLE')}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all active:scale-95 ${
                    availability === 'AVAILABLE'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  ✓ Available
                </button>
                <button
                  onClick={(e) => updateAvailability(e, 'MAYBE')}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all active:scale-95 ${
                    availability === 'MAYBE'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  ? Maybe
                </button>
                <button
                  onClick={(e) => updateAvailability(e, 'UNAVAILABLE')}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all active:scale-95 ${
                    availability === 'UNAVAILABLE'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  ✗ Unavailable
                </button>
              </div>
            </div>
          )}

          {!isPast && !loading && isAdmin && availablePlayers.length > 0 && (
            <div className="border-t border-slate-700 pt-3 mt-3">
              {/* Check if assignments are disabled due to completed match with scores */}
              {(match.status === 'COMPLETED' || !match.status) && match.homeScore !== null && match.awayScore !== null ? (
                <div className="text-xs text-red-400 mb-2">
                  Player assignments disabled - match completed with scores entered
                </div>
              ) : (
                <div className="text-xs text-gray-400 mb-2">
                  Available Players ({availablePlayers.length}) • {assignments.filter((a) => a.confirmed).length} confirmed
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availablePlayers.map((player) => {
                  const isAssigned = assignments.some((a) => a.userId === player.userId)
                  const assignment = assignments.find((a) => a.userId === player.userId)
                  
                  return (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between p-2 rounded bg-slate-700/50 text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                        <span className="text-white truncate">
                          {player.user?.name || player.user?.email || `User #${player.userId.slice(-6)}`}
                        </span>
                        {isAssigned && assignment?.confirmed && (
                          <span className="text-xs text-green-400">✓</span>
                        )}
                      </div>
                      {!isAssigned ? (
                        <button
                          onClick={(e) => assignPlayer(e, player.userId)}
                          disabled={assigning || (match.homeScore !== null && match.awayScore !== null)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-slate-600 transition-all active:scale-95"
                          title={
                            match.homeScore !== null && match.awayScore !== null
                              ? "Cannot assign players - match completed with scores"
                              : "Assign player to match"
                          }
                        >
                          Assign
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <span className="px-3 py-1 bg-slate-600 text-gray-300 rounded text-xs">
                            Assigned
                          </span>
                          <button
                            onClick={(e) => removeAssignment(e, assignment!.id)}
                            disabled={match.homeScore !== null && match.awayScore !== null}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:bg-slate-600 transition-all active:scale-95"
                            title={
                              match.homeScore !== null && match.awayScore !== null
                                ? "Cannot remove assignment - match completed with scores"
                                : "Remove assignment"
                            }
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Score Update Form */}
          {showScoreForm && (
            <div className="mt-3 pt-3 border-t border-slate-700 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-white">Update Match Score</h4>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowScoreForm(false); }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={updateScore} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">
                      {match.team?.name || 'Home'} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={isUpdatingScore}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">
                      {localMatch.opponentName || 'Away'} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={isUpdatingScore}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-400">Notes (optional)</label>
                  <textarea
                    value={scoreNotes}
                    onChange={(e) => setScoreNotes(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    rows={2}
                    className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder="Add any notes about the match..."
                    disabled={isUpdatingScore}
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">{scoreNotes.length}/200 characters</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isUpdatingScore}
                    className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingScore ? 'Updating...' : 'Update Score'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowScoreForm(false); }}
                    disabled={isUpdatingScore}
                    className="flex-1 px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      ) : showScoreForm ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-white">Update Match Score</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setShowScoreForm(false); }}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={updateScore} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">
                  {match.team?.name || 'Home'} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isUpdatingScore}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">
                  {localMatch.opponentName || 'Away'} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isUpdatingScore}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">Notes (optional)</label>
              <textarea
                value={scoreNotes}
                onChange={(e) => setScoreNotes(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Add any notes about the match..."
                disabled={isUpdatingScore}
                maxLength={200}
              />
              <div className="text-xs text-gray-500 mt-1">{scoreNotes.length}/200 characters</div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isUpdatingScore}
                className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingScore ? 'Updating...' : 'Update Score'}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowScoreForm(false); }}
                disabled={isUpdatingScore}
                className="flex-1 px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-white">Edit Match</h3>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-400">Opponent</label>
            <input
              type="text"
              value={editForm.opponentName}
              onChange={(e) => setEditForm({ ...editForm, opponentName: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-400">Date & Time</label>
            <input
              type="datetime-local"
              value={editForm.scheduledAt}
              onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-400">Location</label>
            <input
              type="text"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-400">Required Players</label>
            <input
              type="number"
              min="1"
              max="99"
              value={editForm.requiredPlayers}
              onChange={(e) => setEditForm({ ...editForm, requiredPlayers: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={updateMatch}
              className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
            >
              Save
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
              className="flex-1 px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Score Submission Manager for League Matches */}
      {match.leagueMatchId && isPast && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <ScoreSubmissionManager
            matchId={match.leagueMatchId}
            homeTeam={{
              id: match.team?.id || '',
              name: match.team?.name || ''
            }}
            awayTeam={{
              id: match.opponentTeam?.id || '',
              name: match.opponentTeam?.name || match.opponentName || 'Unknown'
            }}
            currentUserTeamIds={userTeamIds}
            isAdmin={isAdmin}
            onScoreConfirmed={() => {
              // Refresh the page data when score is confirmed
              window.location.reload()
            }}
          />
        </div>
      )}
    </div>
  )
}
