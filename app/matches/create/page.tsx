"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTeamFilter } from '../../context/TeamFilterContext'

export default function CreateMatchPage() {
  const { selectedTeamId } = useTeamFilter()
  const [teams, setTeams] = useState<any[]>([])
  const [teamId, setTeamId] = useState('')
  const [matchType, setMatchType] = useState<'regular' | 'league'>('regular')
  const [opponentName, setOpponentName] = useState('')
  const [opponentTeamId, setOpponentTeamId] = useState('')
  const [leagueTeams, setLeagueTeams] = useState<any[]>([])
  const [selectedTeamLeague, setSelectedTeamLeague] = useState<any>(null)
  const [canCreateLeagueMatches, setCanCreateLeagueMatches] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [requiredPlayers, setRequiredPlayers] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Load user's teams
    fetch('/api/teams')
      .then((r) => r.json())
      .then((d) => {
        const userTeams = d.teams || []
        setTeams(userTeams)
        
        // If a specific team is selected in the filter, use that team
        if (selectedTeamId !== 'all') {
          const selectedTeam = userTeams.find((t: any) => t.teamId === selectedTeamId && t.isAdmin)
          if (selectedTeam) {
            setTeamId(selectedTeamId)
            checkTeamLeague(selectedTeamId)
          } else {
            // Selected team not found or user is not admin, default to first admin team
            const adminTeams = userTeams.filter((t: any) => t.isAdmin)
            if (adminTeams.length > 0) {
              setTeamId(adminTeams[0].teamId)
              checkTeamLeague(adminTeams[0].teamId)
            }
          }
        } else {
          // 'All Teams' selected - default to first admin team
          const adminTeams = userTeams.filter((t: any) => t.isAdmin)
          if (adminTeams.length > 0) {
            setTeamId(adminTeams[0].teamId)
            checkTeamLeague(adminTeams[0].teamId)
          }
        }
      })
  }, [selectedTeamId])

  // Check if team is in a league and load league teams, also check if user can create league matches
  async function checkTeamLeague(teamId: string) {
    try {
      // Check league manager status
      const statusRes = await fetch(`/api/teams/${teamId}/league-manager-status`)
      const statusData = await statusRes.json()
      
      setCanCreateLeagueMatches(statusData.canCreateLeagueMatches || false)
      
      if (statusData.league) {
        setSelectedTeamLeague(statusData.league)
        
        // Load other teams in the same league
        const res = await fetch(`/api/teams/${teamId}/league`)
        const data = await res.json()
        
        if (res.ok && data.league) {
          const otherTeams = data.league.teams.filter((lt: any) => lt.teamId !== teamId)
          setLeagueTeams(otherTeams)
        } else {
          setLeagueTeams([])
        }
      } else {
        setSelectedTeamLeague(null)
        setLeagueTeams([])
      }
    } catch (err) {
      setSelectedTeamLeague(null)
      setLeagueTeams([])
      setCanCreateLeagueMatches(false)
    }
  }

  // Handle team change
  const handleTeamChange = (newTeamId: string) => {
    setTeamId(newTeamId)
    setMatchType('regular') // Reset to regular match
    setOpponentTeamId('')
    setCanCreateLeagueMatches(false) // Reset permission
    checkTeamLeague(newTeamId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const requestBody: any = {
        teamId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        location: location || null,
        requiredPlayers: requiredPlayers ? parseInt(requiredPlayers) : null,
      }

      if (matchType === 'league' && canCreateLeagueMatches) {
        requestBody.isLeagueMatch = true
        requestBody.opponentTeamId = opponentTeamId
        requestBody.leagueId = selectedTeamLeague.id
      } else {
        requestBody.opponentName = opponentName
        // If someone tries to create league match without permission, force to regular
        if (matchType === 'league' && !canCreateLeagueMatches) {
          setError('You do not have permission to create league matches. Only league managers can schedule league matches.')
          setLoading(false)
          return
        }
      }

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create match')
        setLoading(false)
        return
      }

      // Success! Redirect to matches page
      router.push('/matches')
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Filter to only admin teams
  const adminTeams = teams.filter((t: any) => t.isAdmin)
  
  if (adminTeams.length === 0) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="bg-yellow-900/20 border border-yellow-700/50 text-yellow-300 px-4 py-3 rounded mb-4">
            You need to be an admin of a team to create matches.
          </div>
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  // Check if user is creating for the selected team specifically
  const isCreatingForSelectedTeam = selectedTeamId !== 'all' && teamId === selectedTeamId
  const selectedTeamInfo = teams.find((t: any) => t.teamId === selectedTeamId)

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">Create Match</h1>

      {isCreatingForSelectedTeam && selectedTeamInfo && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <div className="text-sm text-blue-300">
            Creating match for selected team: <span className="font-semibold">{selectedTeamInfo.team.name}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Team <span className="text-red-500">*</span>
          </label>
          {isCreatingForSelectedTeam ? (
            // When a specific team is selected, show it as read-only with option to change
            <div className="space-y-2">
              <div className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full">
                {selectedTeamInfo?.team.name} ({selectedTeamInfo?.team.sport})
              </div>
              <p className="text-xs text-gray-400">
                Match will be created for your selected team. 
                <button 
                  type="button" 
                  onClick={() => setTeamId(adminTeams[0]?.teamId || '')}
                  className="text-blue-400 hover:underline ml-1"
                >
                  Choose different team
                </button>
              </p>
            </div>
          ) : (
            <select
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={teamId}
              onChange={(e) => handleTeamChange(e.target.value)}
              required
            >
              <option value="">Select a team...</option>
              {adminTeams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.team.name} ({t.team.sport})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Match Type <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="matchType"
                value="regular"
                checked={matchType === 'regular'}
                onChange={(e) => setMatchType(e.target.value as 'regular')}
                className="mr-3 text-blue-500"
              />
              <span className="text-gray-300">Regular Match (vs external team)</span>
            </label>
            
            {canCreateLeagueMatches && (
              <label className={`flex items-center ${selectedTeamLeague ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  name="matchType"
                  value="league"
                  checked={matchType === 'league'}
                  onChange={(e) => selectedTeamLeague && setMatchType(e.target.value as 'league')}
                  disabled={!selectedTeamLeague}
                  className="mr-3 text-blue-500"
                />
                <div>
                  <span className="text-gray-300">League Match (vs league team)</span>
                  {!selectedTeamLeague && (
                    <p className="text-sm text-gray-500 mt-1">
                      Your team must be in a league to schedule league matches. 
                      <Link href="/leagues" className="text-blue-400 hover:underline ml-1">
                        Join a league here
                      </Link>
                    </p>
                  )}
                  {selectedTeamLeague && (
                    <p className="text-sm text-gray-400 mt-1">
                      League: {selectedTeamLeague.name} ({selectedTeamLeague.sport}) • You are the League Manager
                    </p>
                  )}
                </div>
              </label>
            )}

            {!canCreateLeagueMatches && selectedTeamLeague && (
              <div className="flex items-start p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-300 font-medium mb-1">League Matches</p>
                  <p className="text-blue-200 mb-2">
                    Your team is in <strong>{selectedTeamLeague.name}</strong>, but only the League Manager can schedule league matches.
                  </p>
                  <p className="text-blue-200 text-xs">
                    You can still create regular matches against external teams using the option above.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {matchType === 'regular' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Opponent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="e.g., Riverside United"
              required
            />
          </div>
        )}

        {matchType === 'league' && selectedTeamLeague && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Opponent Team <span className="text-red-500">*</span>
            </label>
            <select
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={opponentTeamId}
              onChange={(e) => setOpponentTeamId(e.target.value)}
              required
            >
              <option value="">Select opponent team...</option>
              {leagueTeams.map((lt) => (
                <option key={lt.teamId} value={lt.teamId}>
                  {lt.team.name}
                </option>
              ))}
            </select>
            {leagueTeams.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">
                No other teams in this league yet.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Location</label>
          <input
            type="text"
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Riverside Park Field 3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Required Players</label>
          <input
            type="number"
            min="1"
            max="99"
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={requiredPlayers}
            onChange={(e) => setRequiredPlayers(e.target.value)}
            placeholder="e.g., 11 (leave blank if not applicable)"
          />
          <p className="text-xs text-gray-400 mt-1">
            Optional: Specify how many players are needed for this match
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700 active:bg-blue-800 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
          >
            {loading ? 'Creating...' : 'Create Match'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-slate-600 bg-slate-700 text-white rounded font-semibold hover:bg-slate-600 active:bg-slate-800 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}
