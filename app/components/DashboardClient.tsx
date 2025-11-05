"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import TeamCreateForm from './TeamCreateForm'
import { useTeamFilter } from '../context/TeamFilterContext'
import { getSportTerminology } from '@/lib/sportTerminology'
import UpcomingMatches from './UpcomingMatches'
import LeagueEncouragement from './LeagueEncouragement'

interface Practice {
  id: string
  scheduledAt: string
  location?: string
  team: { id: string; name: string }
  myAttendance?: string | null
}

interface LeagueInfo {
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

export default function DashboardClient({ 
  initialMemberships, 
  userEmail 
}: { 
  initialMemberships: any[], 
  userEmail: string 
}) {
  const { selectedTeamId } = useTeamFilter()
  const [matches, setMatches] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [practices, setPractices] = useState<Practice[]>([])
  const [leagues, setLeagues] = useState<LeagueInfo[]>([])
  const [teamStats, setTeamStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Load team data when team selection changes
  useEffect(() => {
    if (selectedTeamId === 'all') {
      setMatches([])
      setAssignments([])
      setPractices([])
      setLeagues([])
      setTeamStats(null)
      return
    }

    setLoading(true)
    
    // Load all team data in parallel with safe JSON handling
    Promise.all([
      // Load matches for selected team
      fetch('/api/matches')
        .then(async (r) => {
          const ct = r.headers.get('content-type') || ''
          if (!r.ok) {
            return []
          }
          const d = ct.includes('application/json') ? await r.json() : null
          const allMatches = d?.matches || []
          return allMatches.filter((m: any) => m.teamId === selectedTeamId)
        }),
      
      // Load assignments for selected team
      fetch('/api/assignments')
        .then(async (r) => {
          const ct = r.headers.get('content-type') || ''
          if (!r.ok) {
            return []
          }
          const d = ct.includes('application/json') ? await r.json() : null
          const allAssignments = d?.assignments || []
          return allAssignments.filter((a: any) => a.match?.teamId === selectedTeamId)
        }),
      
      // Load practices for selected team
      fetch('/api/practices')
        .then(async (r) => {
          const ct = r.headers.get('content-type') || ''
          if (!r.ok) {
            return []
          }
          const d = ct.includes('application/json') ? await r.json() : null
          const allPractices = d?.practices || []
          return allPractices.filter((p: any) => p.teamId === selectedTeamId)
        }),
      
      // Load leagues for selected team
      fetch('/api/leagues')
        .then(async (r) => {
          const ct = r.headers.get('content-type') || ''
          if (!r.ok) {
            return []
          }
          const d = ct.includes('application/json') ? await r.json() : null
          const allLeagues = d?.leagues || []
          return allLeagues.filter((l: any) => 
            l.teams.some((t: any) => t.teamId === selectedTeamId)
          )
        })
    ])
    .then(([teamMatches, teamAssignments, teamPractices, teamLeagues]) => {
      setMatches(teamMatches)
      setAssignments(teamAssignments)
      setPractices(teamPractices)
      
      // For each league, fetch detailed stats
      if (teamLeagues.length > 0) {
        Promise.all(
          teamLeagues.map((league: any) => 
            fetch(`/api/leagues/${league.id}/stats`)
              .then(async (r) => {
                const ct = r.headers.get('content-type') || ''
                if (!r.ok || !ct.includes('application/json')) {
                  return null
                }
                return await r.json()
              })
              .catch(() => null)
          )
        ).then((leagueStats) => {
          const validLeagueStats = leagueStats.filter(Boolean)
          setLeagues(validLeagueStats)
        })
      } else {
        setLeagues([])
      }
      
      setLoading(false)
    })
    .catch(() => {
      setLoading(false)
    })
  }, [selectedTeamId])

  const selectedTeam = selectedTeamId === 'all' 
    ? null 
    : initialMemberships.find((m) => m.team.id === selectedTeamId)

  // Calculate upcoming and recent data
  const now = new Date()
  const upcomingMatches = matches.filter((m) => new Date(m.scheduledAt) >= now)
  const recentMatches = matches.filter((m) => new Date(m.scheduledAt) < now).slice(0, 3)
  const pendingAssignments = assignments.filter((a) => !a.confirmed)
  
  // Calculate practice data
  const upcomingPractices = practices
    .filter((p) => new Date(p.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5)
  
  const recentPractices = practices
    .filter((p) => new Date(p.scheduledAt) < now)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3)

  // Find team's position in league standings
  const teamLeagueInfo = leagues.length > 0 ? leagues[0] : null
  const teamStanding = teamLeagueInfo?.standings.find((s) => s.teamId === selectedTeamId)
  const teamPosition = teamStanding && teamLeagueInfo ? teamLeagueInfo.standings.indexOf(teamStanding) + 1 : null

  return (
    <div>
      {/* Team Cards */}
      <section className="mb-6">
        <h2 className="font-semibold text-gray-200 mb-3">Your teams</h2>
        {selectedTeamId === 'all' ? (
          <ul className="space-y-2">
            {initialMemberships.map((t) => (
              <li key={t.team.id} className="bg-slate-800 border border-slate-700 p-3 rounded hover:bg-slate-700 transition-colors">
                <div className="flex justify-between items-center">
                  <Link href={`/teams/${t.team.id}`} className="flex-1">
                    <div className="font-medium text-blue-400 hover:text-blue-300">{t.team.name} — {t.team.sport}</div>
                    <div className="text-sm text-gray-400">Role: {t.role} {t.isAdmin ? '(admin)' : ''}</div>
                  </Link>
                </div>
              </li>
            ))}
            {initialMemberships.length === 0 && (
              <li className="text-sm text-gray-400">You are not a member of any teams yet.</li>
            )}
          </ul>
        ) : selectedTeam ? (
          <div className="bg-slate-800 border-2 border-blue-500 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{selectedTeam.team.name}</h3>
                <div className="text-sm text-gray-400">
                  {selectedTeam.team.sport} • Role: {selectedTeam.role} {selectedTeam.isAdmin ? '(admin)' : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Invite code: <span className="font-mono text-blue-400">{selectedTeam.team.inviteCode}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/teams/${selectedTeam.team.id}`}
                  className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600 active:bg-slate-500 active:scale-95 transition-all"
                >
                  Team Page
                </Link>
                {selectedTeam.isAdmin && (
                  <Link
                    href="/matches/create"
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
                    title="Create external match against other teams"
                  >
                    + External Match
                  </Link>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4 text-gray-400">Loading team data...</div>
            ) : (
              <>
                {/* Pending Assignments */}
                {pendingAssignments.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 font-semibold">⚠️ Pending Assignments</span>
                      <span className="text-xs bg-yellow-700 text-white px-2 py-0.5 rounded">{pendingAssignments.length}</span>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {pendingAssignments.map((a) => (
                        <li key={a.id} className="text-gray-300">
                          • {a.match?.opponentName || 'Match'} on {new Date(a.match?.scheduledAt).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/assignments"
                      className="mt-2 inline-block text-xs text-yellow-400 hover:text-yellow-300 hover:underline"
                    >
                      View all assignments →
                    </Link>
                  </div>
                )}

                {/* League Standing */}
                {teamLeagueInfo && teamStanding ? (
                  <div className="mb-4 p-3 bg-purple-900/20 border border-purple-700 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-400">🏆 League Standing</h4>
                      <Link href="/leagues" className="text-xs text-purple-400 hover:text-purple-300 hover:underline">
                        View league →
                      </Link>
                    </div>
                    <div className="text-sm text-gray-300">
                      <div className="flex justify-between items-center mb-1">
                        <span>{teamLeagueInfo.league.name}</span>
                        <span className="font-medium text-purple-400">#{teamPosition} of {teamLeagueInfo.summary.totalTeams}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                        <div>W: {teamStanding.wins}</div>
                        <div>L: {teamStanding.losses}</div>
                        <div>D: {teamStanding.draws}</div>
                        <div>
                          {(() => {
                            const terminology = getSportTerminology(teamLeagueInfo.league.sport)
                            return terminology.pointsSystem 
                              ? `${terminology.pointsLabel}: ${teamStanding.points}`
                              : `Win%: ${teamStanding.winPercentage.toFixed(1)}%`
                          })()}
                        </div>
                      </div>
                      {teamStanding.gamesPlayed > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Win Rate: {teamStanding.winPercentage.toFixed(1)}% • {(() => {
                            const terminology = getSportTerminology(teamLeagueInfo.league.sport)
                            return `${terminology.scoreDifference.split(' ')[0]} Diff: ${teamStanding.goalDifference > 0 ? '+' : ''}${teamStanding.goalDifference}`
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : leagues.length === 0 && !loading && (
                  <LeagueEncouragement teamId={selectedTeam.team.id} />
                )}

                {/* Upcoming Practices */}
                {upcomingPractices.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-gray-200">🏃 Upcoming Practices</h4>
                      <Link href="/practices" className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                        View all
                      </Link>
                    </div>
                    <ul className="space-y-2">
                      {upcomingPractices.map((practice) => (
                        <li key={practice.id} className="bg-slate-700/50 p-2 rounded">
                          <div className="text-sm font-medium text-white">
                            📅 {new Date(practice.scheduledAt).toLocaleDateString()} at{' '}
                            {new Date(practice.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {practice.location && (
                            <div className="text-xs text-gray-400">📍 {practice.location}</div>
                          )}
                          {practice.myAttendance && (
                            <div className="text-xs text-blue-400 mt-1">
                              Status: {practice.myAttendance.charAt(0).toUpperCase() + practice.myAttendance.slice(1).toLowerCase()}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upcoming Matches with Availability */}
                <div className="mb-4">
                  <UpcomingMatches teamId={selectedTeam.team.id} limit={3} compact />
                </div>

                {/* Team Performance Summary */}
                {(matches.length > 0 || practices.length > 0) && (
                  <div className="mb-4 p-3 bg-slate-700/30 border border-slate-600 rounded">
                    <h4 className="font-semibold text-gray-200 mb-2">📊 Team Overview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">This Month</div>
                        <div className="text-white">
                          {matches.filter(m => {
                            const matchDate = new Date(m.scheduledAt)
                            const now = new Date()
                            return matchDate.getMonth() === now.getMonth() && matchDate.getFullYear() === now.getFullYear()
                          }).length} matches
                        </div>
                        <div className="text-white">
                          {practices.filter(p => {
                            const practiceDate = new Date(p.scheduledAt)
                            const now = new Date()
                            return practiceDate.getMonth() === now.getMonth() && practiceDate.getFullYear() === now.getFullYear()
                          }).length} practices
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Upcoming</div>
                        <div className="text-white">{upcomingMatches.length} matches</div>
                        <div className="text-white">{upcomingPractices.length} practices</div>
                      </div>
                    </div>
                    {teamStanding && teamStanding.gamesPlayed > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-600">
                        <div className="text-xs text-gray-400">
                          Season Record: {teamStanding.wins}-{teamStanding.losses}-{teamStanding.draws} 
                          ({teamStanding.gamesPlayed} games)
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                {selectedTeam.isAdmin && (
                  <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
                    <h4 className="font-semibold text-blue-400 mb-2">⚡ Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <Link
                        href="/practices/create"
                        className="flex items-center gap-2 px-3 py-2 bg-orange-600/20 border border-orange-600 text-orange-400 rounded hover:bg-orange-600/30 transition-colors"
                      >
                        <span>🏃</span>
                        Schedule Practice
                      </Link>
                      <Link
                        href="/scrimmages/create"
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 border border-purple-600 text-purple-400 rounded hover:bg-purple-600/30 transition-colors"
                      >
                        <span>🏆</span>
                        Create Grudge
                      </Link>
                      <Link
                        href={`/teams/${selectedTeam.team.id}`}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600/20 border border-green-600 text-green-400 rounded hover:bg-green-600/30 transition-colors"
                      >
                        <span>👥</span>
                        Manage Team
                      </Link>
                      <Link
                        href="/leagues"
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600/20 border border-indigo-600 text-indigo-400 rounded hover:bg-indigo-600/30 transition-colors"
                      >
                        <span>🏅</span>
                        View Leagues
                      </Link>
                    </div>
                  </div>
                )}

                {/* Recent Matches */}
                {recentMatches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-200 mb-2">Recent Results</h4>
                    <ul className="space-y-2">
                      {recentMatches.map((match) => (
                        <li key={match.id} className="bg-slate-700/30 p-2 rounded">
                          <Link href={`/matches/${match.id}`} className="block hover:text-blue-400">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-300">vs {match.opponentName}</span>
                              {match.homeScore !== null && match.awayScore !== null && (
                                <span className={`text-sm font-medium ${
                                  match.homeScore > match.awayScore ? 'text-green-400' : 
                                  match.homeScore < match.awayScore ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                  {match.homeScore} - {match.awayScore}
                                  {match.homeScore > match.awayScore ? ' W' : 
                                   match.homeScore < match.awayScore ? ' L' : ' D'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(match.scheduledAt).toLocaleDateString()}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recent Practices */}
                {recentPractices.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-200 mb-2">Recent Practices</h4>
                    <ul className="space-y-2">
                      {recentPractices.map((practice) => (
                        <li key={practice.id} className="bg-slate-700/20 p-2 rounded">
                          <div className="text-sm text-gray-300">
                            📅 {new Date(practice.scheduledAt).toLocaleDateString()}
                          </div>
                          {practice.location && (
                            <div className="text-xs text-gray-400">📍 {practice.location}</div>
                          )}
                          {practice.myAttendance && (
                            <div className={`text-xs mt-1 ${
                              practice.myAttendance === 'AVAILABLE' ? 'text-green-400' :
                              practice.myAttendance === 'MAYBE' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              Attended: {practice.myAttendance.charAt(0).toUpperCase() + practice.myAttendance.slice(1).toLowerCase()}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </section>

      {/* Create/Join Teams Section - Only show when viewing all teams */}
      {selectedTeamId === 'all' && (
        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <h2 className="font-semibold mb-2 text-gray-200">Create a new team</h2>
            <TeamCreateForm />
          </section>

          <section>
            <h2 className="font-semibold mb-2 text-gray-200">Join an existing team</h2>
            <Link
              href="/teams/join"
              className="block text-center bg-green-600 text-white px-4 py-3 rounded font-semibold hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
            >
              Join Team with Invite Code
            </Link>
            <p className="text-sm text-gray-400 mt-2">
              Have an invite code? Join an existing team to get started.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
