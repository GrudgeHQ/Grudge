'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TournamentBracket from './TournamentBracket'

interface TournamentDetailClientProps {
  tournament: any
  isLeagueManager: boolean
  leagueId: string
}

const formatNames: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  TRIPLE_ELIMINATION: 'Triple Elimination',
  GROUP_STAGE: 'Group Stage'
}

const statusNames: Record<string, string> = {
  CREATED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-700 text-gray-200',
  IN_PROGRESS: 'bg-blue-900/50 text-blue-300',
  COMPLETED: 'bg-green-900/50 text-green-300',
  CANCELLED: 'bg-red-900/50 text-red-300'
}

export default function TournamentDetailClient({ 
  tournament: initialTournament, 
  isLeagueManager,
  leagueId 
}: TournamentDetailClientProps) {
  const router = useRouter()
  const [tournament, setTournament] = useState(initialTournament)
  const [loading, setLoading] = useState(false)

  const refreshTournament = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`)
      if (response.ok) {
        const data = await response.json()
        setTournament(data.tournament)
      }
    } catch (error) {
      console.error('Failed to refresh tournament:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTournament = async () => {
    if (!confirm('Start this tournament? This will lock the bracket and allow match results to be entered.')) {
      return
    }

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/start`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start tournament')
      }

      await refreshTournament()
      alert('Tournament started successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start tournament')
    }
  }

  const handleMatchUpdate = async () => {
    await refreshTournament()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.push(`/leagues/${leagueId}`)}
            className="text-gray-400 hover:text-white mr-4"
          >
            ← Back to League
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{tournament.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-300">
                <span>{formatNames[tournament.format] || tournament.format}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[tournament.status]}`}>
                  {statusNames[tournament.status] || tournament.status}
                </span>
                <span>{tournament.teams.length} teams</span>
              </div>
            </div>

            {isLeagueManager && tournament.status === 'CREATED' && (
              <button
                onClick={handleStartTournament}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 active:scale-95 transition-all"
              >
                Start Tournament
              </button>
            )}
          </div>

          {tournament.description && (
            <p className="text-gray-300 mb-4">{tournament.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
            <div>
              <div className="text-sm text-gray-400">League</div>
              <div className="text-white font-medium">{tournament.league.name}</div>
            </div>
            {tournament.season && (
              <div>
                <div className="text-sm text-gray-400">Season</div>
                <div className="text-white font-medium">{tournament.season.name}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-400">Created</div>
              <div className="text-white font-medium">{formatDate(tournament.createdAt)}</div>
            </div>
          </div>

          {tournament.status === 'COMPLETED' && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">Final Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tournament.winner && (
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                    <div className="text-yellow-400 text-sm font-medium mb-1">🏆 Champion</div>
                    <div className="text-white font-bold text-lg">{tournament.winner.team.name}</div>
                  </div>
                )}
                {tournament.runnerUp && (
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <div className="text-gray-400 text-sm font-medium mb-1">🥈 Runner-Up</div>
                    <div className="text-white font-bold text-lg">{tournament.runnerUp.team.name}</div>
                  </div>
                )}
                {tournament.thirdPlace && (
                  <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                    <div className="text-orange-400 text-sm font-medium mb-1">🥉 Third Place</div>
                    <div className="text-white font-bold text-lg">{tournament.thirdPlace.team.name}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tournament Bracket */}
      {tournament.status !== 'CREATED' && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Tournament Bracket</h2>
            {isLeagueManager && tournament.status === 'IN_PROGRESS' && (
              <div className="text-sm text-gray-400">
                Click on matches to enter results
              </div>
            )}
          </div>
          
          <TournamentBracket
            tournament={tournament}
            isLeagueManager={isLeagueManager}
            onMatchUpdate={handleMatchUpdate}
          />
        </div>
      )}

      {tournament.status === 'CREATED' && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">Tournament Not Started</h3>
            <p className="text-gray-300 mb-6">
              {isLeagueManager 
                ? 'Click "Start Tournament" above to begin and generate the bracket.'
                : 'The tournament bracket will be available once the league manager starts the tournament.'
              }
            </p>

            {/* Teams List */}
            <div className="max-w-2xl mx-auto">
              <h4 className="text-lg font-medium text-white mb-4">Participating Teams</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tournament.teams.map((tt: any) => (
                  <div key={tt.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-white font-medium">{tt.team.name}</span>
                    <span className="text-gray-400 text-sm">Seed {tt.seed}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
