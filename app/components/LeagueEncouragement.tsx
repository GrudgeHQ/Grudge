'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LeagueStatus {
  isTeamAdmin: boolean
  team: {
    id: string
    name: string
    sport: string
  }
  hasJoinedLeagues: boolean
  leagueMemberships: Array<{
    id: string
    name: string
    sport: string
    isLeagueManager: boolean
  }>
  pendingRequests: Array<{
    id: string
    league: {
      id: string
      name: string
      sport: string
    }
  }>
  suggestedLeagues: Array<{
    id: string
    name: string
    sport: string
    teamCount: number
  }>
}

interface LeagueEncouragementProps {
  teamId: string
}

export default function LeagueEncouragement({ teamId }: LeagueEncouragementProps) {
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchLeagueStatus = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}/league-status`)
        if (response.ok) {
          const data = await response.json()
          setLeagueStatus(data)
        }
      } catch (error) {
        console.error('Error fetching league status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeagueStatus()
  }, [teamId])

  // Check if user has dismissed this message for this team
  useEffect(() => {
    const dismissedKey = `league-encouragement-dismissed-${teamId}`
    const isDismissed = localStorage.getItem(dismissedKey) === 'true'
    setDismissed(isDismissed)
  }, [teamId])

  const handleDismiss = () => {
    const dismissedKey = `league-encouragement-dismissed-${teamId}`
    localStorage.setItem(dismissedKey, 'true')
    setDismissed(true)
  }

  if (loading || dismissed || !leagueStatus) {
    return null
  }

  // Only show to team administrators who haven't joined any leagues
  if (!leagueStatus.isTeamAdmin || leagueStatus.hasJoinedLeagues) {
    return null
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-600/50 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h4 className="font-bold text-indigo-300">Take Your Team to the Next Level!</h4>
          </div>
          
          <p className="text-sm text-gray-300 mb-3">
            Your team <strong className="text-white">{leagueStatus.team.name}</strong> isn't participating in any leagues yet. 
            Joining a league unlocks amazing benefits for your team:
          </p>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-indigo-200">
                <span className="text-green-400">✓</span>
                <span><strong>Organized Competition:</strong> Regular scheduled matches</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-indigo-200">
                <span className="text-green-400">✓</span>
                <span><strong>Season Standings:</strong> Track wins, losses, and rankings</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-indigo-200">
                <span className="text-green-400">✓</span>
                <span><strong>Team Statistics:</strong> Performance metrics and insights</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-indigo-200">
                <span className="text-green-400">✓</span>
                <span><strong>Community:</strong> Connect with other teams</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-indigo-200">
                <span className="text-green-400">✓</span>
                <span><strong>Recognition:</strong> Leaderboards and achievements</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-indigo-200">
                <span className="text-green-400">✓</span>
                <span><strong>Growth:</strong> Improve through consistent play</span>
              </div>
            </div>
          </div>

          {leagueStatus.pendingRequests.length > 0 && (
            <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-600/50 rounded">
              <div className="text-sm text-yellow-300">
                <span className="font-semibold">⏳ Pending Request:</span> You have a request to join{' '}
                <strong>{leagueStatus.pendingRequests[0].league.name}</strong> waiting for approval.
              </div>
            </div>
          )}

          {leagueStatus.suggestedLeagues.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-2">
                <strong>Recommended {leagueStatus.team.sport} leagues:</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {leagueStatus.suggestedLeagues.slice(0, 3).map((league) => (
                  <Link
                    key={league.id}
                    href="/leagues"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-700/30 border border-indigo-600/50 text-xs text-indigo-200 rounded hover:bg-indigo-600/40 transition-colors"
                  >
                    <span>{league.name}</span>
                    <span className="text-indigo-400">({league.teamCount} teams)</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href="/leagues"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 active:bg-indigo-800 active:scale-95 transition-all"
            >
              <span>🏅</span>
              Browse Leagues
            </Link>
            <Link
              href="/leagues/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 active:bg-purple-800 active:scale-95 transition-all"
            >
              <span>➕</span>
              Create League
            </Link>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="ml-4 p-1 text-gray-400 hover:text-gray-200 transition-colors"
          title="Dismiss this message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}