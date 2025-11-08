'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamFilter } from '@/app/context/TeamFilterContext'

interface Team {
  id: string
  name: string
  sport: string
}

import { SPORTS } from '@/lib/sports'

export default function CreateLeaguePage() {
  const router = useRouter()
  const { selectedTeamId: filterSelectedTeamId } = useTeamFilter()
  const [teams, setTeams] = useState<Team[]>([])
  const [name, setName] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAdminTeams()
  }, [filterSelectedTeamId])

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
      let adminTeams = data.teams
        .filter((membership: any) => membership.isAdmin && !teamsInLeagues.includes(membership.teamId))
        .map((membership: any) => ({
          id: membership.teamId,
          name: membership.team.name,
          sport: membership.team.sport
        }))
      
      // If a specific team is selected in the filter, only show that team
      if (filterSelectedTeamId !== 'all') {
        adminTeams = adminTeams.filter((team: Team) => team.id === filterSelectedTeamId)
      }
      
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
    if (!name.trim() || !selectedTeamId) {
      setError('League name and team are required')
      return
    }

    // Get the sport from the selected team
    const selectedTeam = teams.find(t => t.id === selectedTeamId)
    if (!selectedTeam) {
      setError('Selected team not found')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sport: selectedTeam.sport,
          teamId: selectedTeamId
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create league')
      }

      const data = await res.json()
      router.push(`/leagues/${data.league.id}`)
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
    const isSpecificTeamSelected = filterSelectedTeamId !== 'all'
    
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Create League</h1>
          <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-100 px-4 py-3 rounded mb-4">
            <h3 className="font-semibold mb-2">
              {isSpecificTeamSelected ? 'Selected Team Not Available' : 'No Available Teams'}
            </h3>
            <p className="text-sm">
              {isSpecificTeamSelected 
                ? 'The currently selected team cannot create a league. This could be because:'
                : 'You don\'t have any teams available to create a league. This could be because:'
              }
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isSpecificTeamSelected ? (
                <>
                  <li>• The selected team is already in a league (each team can only be in one league)</li>
                  <li>• You are not an admin of the selected team</li>
                  <li>• Try selecting a different team from the team switcher</li>
                </>
              ) : (
                <>
                  <li>• All your teams are already in leagues (each team can only be in one league)</li>
                  <li>• You need to be an admin of a team to create leagues</li>
                  <li>• You don't have any teams yet</li>
                </>
              )}
            </ul>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/leagues')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
            >
              Back to Leagues
            </button>
            {!isSpecificTeamSelected && (
              <button
                onClick={() => router.push('/teams/create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Create New Team
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Create League</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-900 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              League Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              placeholder="e.g., City Soccer League"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {filterSelectedTeamId !== 'all' ? 'Selected Team *' : 'Your Team *'}
            </label>
            {teams.length === 1 && filterSelectedTeamId !== 'all' ? (
              <div className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300">
                {teams[0].name} ({teams[0].sport})
              </div>
            ) : (
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
            )}
            <p className="text-sm text-gray-400 mt-2">
              {filterSelectedTeamId !== 'all' 
                ? 'Creating league for the currently selected team. The league will be for this sport only.'
                : 'The league will be created for this sport. Only teams with the same sport can join.'
              }
            </p>
          </div>

          {/* If you want to allow direct sport selection for league creation, use the SPORTS array here: */}
          {/*
          <div>
            <label className="block text-sm font-medium mb-2">Sport *</label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select a sport...</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          */}

          <div className="bg-blue-500/20 border border-blue-500 text-blue-100 px-4 py-3 rounded">
            <p className="text-sm">
              After creating the league, you'll receive a unique invite code that other teams can use to join.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-2 rounded"
            >
              {loading ? 'Creating...' : 'Create League'}
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
