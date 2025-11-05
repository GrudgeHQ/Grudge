'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

interface Team {
  id: string
  name: string
}

interface TournamentTeam {
  id: string
  team: Team
  seed: number
  finalPlacement?: number
  eliminated: boolean
}

interface TournamentMatch {
  id: string
  matchNumber: number
  bracket: 'main' | 'consolation' | 'losers'
  homeTeam?: TournamentTeam
  awayTeam?: TournamentTeam
  homeScore?: number
  awayScore?: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WALKOVER'
  winnerId?: string
  scheduledAt?: string
  playedAt?: string
  notes?: string
}

interface TournamentRound {
  id: string
  roundNumber: number
  name: string
  bracket: 'main' | 'consolation' | 'losers'
  isComplete: boolean
  matches: TournamentMatch[]
}

interface Tournament {
  id: string
  name: string
  description?: string
  format: string
  status: string
  winner?: TournamentTeam
  runnerUp?: TournamentTeam
  thirdPlace?: TournamentTeam
  teams: TournamentTeam[]
  rounds: TournamentRound[]
}

interface TournamentBracketProps {
  tournament: Tournament
  isLeagueManager: boolean
  onMatchUpdate?: (matchId: string, result: any) => void
}

export default function TournamentBracket({ tournament, isLeagueManager, onMatchUpdate }: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null)
  const [submittingResult, setSubmittingResult] = useState(false)
  const [resultForm, setResultForm] = useState({
    homeScore: '',
    awayScore: '',
    notes: ''
  })

  // Group rounds by bracket type - memoized for performance
  const { mainBracketRounds, losersBracketRounds, consolationRounds } = useMemo(() => {
    const main = tournament.rounds
      .filter(r => r.bracket === 'main')
      .sort((a, b) => a.roundNumber - b.roundNumber)
    
    console.log('[TournamentBracket] Main bracket rounds:', main.map(r => ({
      name: r.name,
      number: r.roundNumber,
      matches: r.matches.length,
      matchDetails: r.matches.map(m => ({
        matchNum: m.matchNumber,
        home: m.homeTeam?.team?.name || 'TBD',
        away: m.awayTeam?.team?.name || 'TBD'
      }))
    })))
    
    return {
      mainBracketRounds: main,
      losersBracketRounds: tournament.rounds
        .filter(r => r.bracket === 'losers')
        .sort((a, b) => a.roundNumber - b.roundNumber),
      consolationRounds: tournament.rounds
        .filter(r => r.bracket === 'consolation')
        .sort((a, b) => a.roundNumber - b.roundNumber)
    }
  }, [tournament.rounds])

  const handleMatchClick = (match: TournamentMatch) => {
    if (!isLeagueManager || match.status === 'COMPLETED') return
    
    setSelectedMatch(match)
    setResultForm({
      homeScore: match.homeScore?.toString() || '',
      awayScore: match.awayScore?.toString() || '',
      notes: match.notes || ''
    })
  }

  const handleSubmitResult = async () => {
    if (!selectedMatch) return

    const homeScore = parseInt(resultForm.homeScore)
    const awayScore = parseInt(resultForm.awayScore)

    if (isNaN(homeScore) || isNaN(awayScore)) {
      alert('Please enter valid scores')
      return
    }

    if (homeScore === awayScore) {
      alert('Tournament matches cannot end in a tie')
      return
    }

    setSubmittingResult(true)
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/matches/${selectedMatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeScore,
          awayScore,
          notes: resultForm.notes.trim() || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit result')
      }

      const data = await response.json()
      
      // Close modal
      setSelectedMatch(null)
      
      // Notify parent component
      if (onMatchUpdate) {
        onMatchUpdate(selectedMatch.id, data)
      }

      // Show success message if tournament is complete
      if (data.isTournamentComplete) {
        alert(`Tournament completed! Winner: ${data.winner?.team?.name}`)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit result')
    } finally {
      setSubmittingResult(false)
    }
  }

  const getMatchCardClasses = (match: TournamentMatch) => {
    const baseClasses = "bg-slate-800 border rounded-lg p-3 shadow-sm transition-all duration-200"
    
    if (match.status === 'COMPLETED') {
      return `${baseClasses} border-green-600 bg-green-900/30`
    } else if (match.status === 'IN_PROGRESS') {
      return `${baseClasses} border-blue-600 bg-blue-900/30`
    } else if (isLeagueManager && match.homeTeam && match.awayTeam) {
      return `${baseClasses} border-slate-600 hover:border-blue-400 hover:shadow-md cursor-pointer`
    } else {
      return `${baseClasses} border-slate-700 bg-slate-900/50`
    }
  }

  const renderMatch = useCallback((match: TournamentMatch) => {
    const canEdit = isLeagueManager && match.status !== 'COMPLETED' && match.homeTeam && match.awayTeam
    
    // Check if this is a bye (one team but no opponent)
    const isBye = (match.homeTeam && !match.awayTeam) || (!match.homeTeam && match.awayTeam)
    const byeTeam = match.homeTeam || match.awayTeam
    
    // If it's a bye, show a simpler card
    if (isBye && byeTeam) {
      return (
        <div
          key={match.id}
          className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-sm"
        >
          <div className="text-xs text-gray-400 mb-2">
            Match {match.matchNumber}
          </div>
          
          <div className="flex items-center justify-between p-2 rounded bg-blue-900/30 border border-blue-700">
            <span className="text-sm text-blue-300">
              <span className="text-xs text-gray-400">#{byeTeam.seed}</span>
              {' '}
              {byeTeam.team.name}
            </span>
          </div>
          
          <div className="mt-2 text-xs text-center text-blue-400">
            ⚡ Bye - Advances Automatically
          </div>
        </div>
      )
    }
    
    return (
      <div
        key={match.id}
        className={getMatchCardClasses(match)}
        onClick={() => canEdit && handleMatchClick(match)}
      >
        <div className="text-xs text-gray-400 mb-2">
          Match {match.matchNumber}
          {match.status === 'COMPLETED' && match.playedAt && (
            <span className="ml-2">
              {new Date(match.playedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {/* Home Team */}
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winnerId === match.homeTeam?.id ? 'bg-green-900/40 font-semibold border border-green-700' : 'bg-slate-700/50'
        }`}>
          <span className={`text-sm ${match.winnerId === match.homeTeam?.id ? 'text-green-300' : 'text-white'}`}>
            {match.homeTeam ? (
              <>
                <span className="text-xs text-gray-400">#{match.homeTeam.seed}</span>
                {' '}
                {match.homeTeam.team.name}
              </>
            ) : (
              <span className="text-gray-500">TBD</span>
            )}
          </span>
          {match.status === 'COMPLETED' && (
            <span className={`text-sm font-mono ${match.winnerId === match.homeTeam?.id ? 'text-green-300' : 'text-gray-300'}`}>
              {match.homeScore}
            </span>
          )}
        </div>
        
        {/* VS Divider */}
        <div className="text-center text-xs text-gray-500 my-1">vs</div>
        
        {/* Away Team */}
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winnerId === match.awayTeam?.id ? 'bg-green-900/40 font-semibold border border-green-700' : 'bg-slate-700/50'
        }`}>
          <span className={`text-sm ${match.winnerId === match.awayTeam?.id ? 'text-green-300' : 'text-white'}`}>
            {match.awayTeam ? (
              <>
                <span className="text-xs text-gray-400">#{match.awayTeam.seed}</span>
                {' '}
                {match.awayTeam.team.name}
              </>
            ) : (
              <span className="text-gray-500">TBD</span>
            )}
          </span>
          {match.status === 'COMPLETED' && (
            <span className={`text-sm font-mono ${match.winnerId === match.awayTeam?.id ? 'text-green-300' : 'text-gray-300'}`}>
              {match.awayScore}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <div className="mt-2 text-xs text-center">
          {match.status === 'COMPLETED' && (
            <span className="text-green-400">✓ Complete</span>
          )}
          {match.status === 'IN_PROGRESS' && (
            <span className="text-blue-400">• In Progress</span>
          )}
          {match.status === 'PENDING' && match.homeTeam && match.awayTeam && (
            <span className="text-slate-400">Pending</span>
          )}
          {match.status === 'PENDING' && (!match.homeTeam || !match.awayTeam) && (
            <span className="text-gray-500">Waiting</span>
          )}
        </div>
      </div>
    )
  }, [isLeagueManager, getMatchCardClasses, handleMatchClick])

  const renderRound = useCallback((round: TournamentRound) => (
    <div key={round.id} className="flex flex-col space-y-4 min-w-[200px]">
      <div className="text-center">
        <h3 className="font-semibold text-white">{round.name}</h3>
        <div className="text-xs text-gray-400 mt-1">
          Round {round.roundNumber}
          {round.isComplete && (
            <span className="ml-2 text-green-400">✓</span>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {round.matches.map(renderMatch)}
      </div>
    </div>
  ), [renderMatch])

  return (
    <div className="space-y-8">
      {/* Tournament Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-300">
              <span>{tournament.format.replace('_', ' ')}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                tournament.status === 'COMPLETED' ? 'bg-green-900/50 text-green-300' :
                tournament.status === 'IN_PROGRESS' ? 'bg-blue-900/50 text-blue-300' :
                'bg-slate-700 text-gray-300'
              }`}>
                {tournament.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          {/* Winner Display */}
          {tournament.winner && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Tournament Winner</div>
              <div className="flex items-center mt-1">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.253.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-white">{tournament.winner.team.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Bracket */}
      {mainBracketRounds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Main Bracket</h2>
          <div className="overflow-x-auto">
            <div className="flex space-x-8 pb-4">
              {mainBracketRounds.map(renderRound)}
            </div>
          </div>
        </div>
      )}

      {/* Losers Bracket */}
      {losersBracketRounds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Losers Bracket</h2>
          <div className="overflow-x-auto">
            <div className="flex space-x-8 pb-4">
              {losersBracketRounds.map(renderRound)}
            </div>
          </div>
        </div>
      )}

      {/* Consolation Bracket */}
      {consolationRounds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Consolation Bracket</h2>
          <div className="overflow-x-auto">
            <div className="flex space-x-8 pb-4">
              {consolationRounds.map(renderRound)}
            </div>
          </div>
        </div>
      )}

      {/* Final Rankings */}
      {tournament.status === 'COMPLETED' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Final Rankings</h2>
          <div className="space-y-2">
            {tournament.winner && (
              <div className="flex items-center p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <div className="text-2xl mr-3">🥇</div>
                <div>
                  <div className="font-semibold text-white">{tournament.winner.team.name}</div>
                  <div className="text-sm text-yellow-400">Champion</div>
                </div>
              </div>
            )}
            {tournament.runnerUp && (
              <div className="flex items-center p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                <div className="text-2xl mr-3">🥈</div>
                <div>
                  <div className="font-semibold text-white">{tournament.runnerUp.team.name}</div>
                  <div className="text-sm text-gray-400">Runner-up</div>
                </div>
              </div>
            )}
            {tournament.thirdPlace && (
              <div className="flex items-center p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
                <div className="text-2xl mr-3">🥉</div>
                <div>
                  <div className="font-semibold text-white">{tournament.thirdPlace.team.name}</div>
                  <div className="text-sm text-orange-400">Third Place</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match Result Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Submit Match Result
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Match {selectedMatch.matchNumber}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Home Team Score */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {selectedMatch.homeTeam?.team.name} Score
                </label>
                <input
                  type="number"
                  value={resultForm.homeScore}
                  onChange={(e) => setResultForm(prev => ({ ...prev, homeScore: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>

              {/* Away Team Score */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {selectedMatch.awayTeam?.team.name} Score
                </label>
                <input
                  type="number"
                  value={resultForm.awayScore}
                  onChange={(e) => setResultForm(prev => ({ ...prev, awayScore: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={resultForm.notes}
                  onChange={(e) => setResultForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Match notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-slate-700">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600"
                disabled={submittingResult}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResult}
                disabled={submittingResult || !resultForm.homeScore || !resultForm.awayScore}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingResult ? 'Submitting...' : 'Submit Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
