'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
  sport: string
}

export default function JoinLeaguePage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAdminTeams()
  }, [])

  const loadAdminTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load teams')
      }
      const data = await res.json()
      
      // Get leagues to check which teams are already in leagues
      const leaguesRes = await fetch('/api/leagues')
      const leaguesData = leaguesRes.ok ? await leaguesRes.json() : { leagues: [] }
      
      // Get team IDs that are already in leagues
      const teamsInLeagues = leaguesData.leagues.flatMap((league: any) => 
        league.teams.map((t: any) => t.team.id)
      )
      
      // Filter to only teams where user is admin and team is not in any league
      const adminTeams = data.teams
        .filter((membership: any) => membership.isAdmin && !teamsInLeagues.includes(membership.teamId))
        .map((membership: any) => ({
          id: membership.teamId,
          name: membership.team.name,
          sport: membership.team.sport
        }))
      
      setTeams(adminTeams)
      if (adminTeams.length > 0) {
        setSelectedTeamId(adminTeams[0].id)
      }
    } catch (err) {
      setError('Failed to load your teams')
      console.error(err)
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim() || !selectedTeamId) {
      setError('Invite code and team are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          teamId: selectedTeamId
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to join league')
      }

      const data = await res.json()
      
      // Check if it's a successful join request
      if (data.request && data.request.league) {
        // Navigate to the league page
        router.push(`/leagues/${data.request.league.id}`)
      } else {
        // Fallback to leagues page if structure is unexpected
        router.push('/leagues')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingTeams) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <p>Loading...</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Join League</h1>
          <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-100 px-4 py-3 rounded mb-4">
            <h3 className="font-semibold mb-2">No Available Teams</h3>
            <p className="text-sm">
              You don't have any teams available to join a league. This could be because:
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• All your teams are already in leagues (each team can only be in one league)</li>
              <li>• You need to be an admin of a team to join leagues</li>
              <li>• You don't have any teams yet</li>
            </ul>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/leagues')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
            >
              Back to Leagues
            </button>
            <button
              onClick={() => router.push('/teams/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              Create New Team
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Join League</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Invite Code *
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 font-mono text-lg tracking-wider"
              placeholder="ABC123"
              maxLength={6}
              required
            />
            <p className="text-sm text-gray-400 mt-2">
              Enter the 6-character invite code provided by the league administrator.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Team *
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              required
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.sport})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-400 mt-2">
              Your team's sport must match the league's sport to join.
            </p>
          </div>

          <div className="bg-blue-500/20 border border-blue-500 text-blue-100 px-4 py-3 rounded">
            <p className="text-sm">
              After joining, you'll be able to schedule matches against other teams in the league.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-6 py-2 rounded"
            >
              {loading ? 'Joining...' : 'Join League'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/leagues')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
