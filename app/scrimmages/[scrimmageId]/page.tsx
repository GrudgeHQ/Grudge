"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ScrimmageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const scrimmageId = params.scrimmageId as string
  const [scrimmage, setScrimmage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadScrimmage()
  }, [scrimmageId])

  async function loadScrimmage() {
    try {
      const res = await fetch(`/api/scrimmages/${scrimmageId}`)
      const data = await res.json()
      setScrimmage(data.scrimmage)
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  async function generateRounds() {
    if (!confirm('Generate new randomized rounds? This will replace any existing rounds.')) {
      return
    }

    setGenerating(true)
    try {
      const res = await fetch(`/api/scrimmages/${scrimmageId}/generate`, {
        method: 'POST',
      })

      if (res.ok) {
        await loadScrimmage()
      } else {
        alert('Failed to generate rounds')
      }
    } catch (e) {
      alert('An error occurred')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading grudge...</div>
      </main>
    )
  }

  if (!scrimmage) {
    return (
      <main className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-400">Grudge not found</div>
      </main>
    )
  }

  const hasRounds = scrimmage.scrimmageRounds && scrimmage.scrimmageRounds.length > 0
  const participantMap = new Map<string, string>(
    scrimmage.participants?.map((p: any) => [p.userId, p.userName]) || []
  )

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Grudge
        </button>
      </div>

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-3">
              {scrimmage.name || 'Round Robin Tournament'}
            </h1>
            <div className="text-gray-400 space-y-1">
              <div className="text-lg text-blue-400">⚽ {scrimmage.team?.name}</div>
              <div>👥 {scrimmage.participants?.length || 0} participants</div>
              <div>🎯 {scrimmage.rounds} round{scrimmage.rounds > 1 ? 's' : ''} • {scrimmage.playersPerTeam} vs {scrimmage.playersPerTeam}</div>
              {scrimmage.timedRounds && scrimmage.roundDuration && (
                <div>⏱️ {scrimmage.roundDuration} minutes per round</div>
              )}
              {scrimmage.createdBy && (
                <div className="text-sm text-gray-500">Created by {scrimmage.createdBy.name}</div>
              )}
            </div>
          </div>
          <button
            onClick={generateRounds}
            disabled={generating}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : hasRounds ? '🎲 Regenerate Rounds' : '🎲 Generate Rounds'}
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Participants ({scrimmage.participants?.length || 0})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {scrimmage.participants?.map((participant: any) => (
            <div
              key={participant.userId}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white truncate"
            >
              {participant.userName}
            </div>
          ))}
        </div>
      </div>

      {/* Rounds */}
      {hasRounds ? (
        <div className="space-y-6">
          {scrimmage.scrimmageRounds.map((round: any) => (
            <div key={round.id} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Round {round.roundNumber}
                {scrimmage.timedRounds && scrimmage.roundDuration && (
                  <span className="text-sm text-gray-400 font-normal ml-3">
                    ⏱️ {scrimmage.roundDuration} minutes
                  </span>
                )}
              </h2>

              {/* Matchups */}
              <div className="space-y-4 mb-4">
                {round.matchups && round.matchups.length > 0 ? (
                  round.matchups.map((matchup: any, index: number) => (
                    <div key={index} className="border border-slate-600 rounded-lg p-4 bg-slate-700/50">
                      <div className="text-sm text-gray-400 mb-2">Match {index + 1}</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        {/* Team 1 */}
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400 font-medium mb-1">Team 1</div>
                          {matchup.team1?.map((userId: string) => (
                            <div key={userId} className="px-3 py-1 bg-blue-600/20 border border-blue-500 rounded text-sm text-white">
                              {participantMap.get(userId) || 'Unknown'}
                            </div>
                          ))}
                        </div>

                        {/* VS */}
                        <div className="text-center text-gray-500 font-bold">VS</div>

                        {/* Team 2 */}
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400 font-medium mb-1">Team 2</div>
                          {matchup.team2?.map((userId: string) => (
                            <div key={userId} className="px-3 py-1 bg-red-600/20 border border-red-500 rounded text-sm text-white">
                              {participantMap.get(userId) || 'Unknown'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm">No matchups for this round</div>
                )}
              </div>

              {/* Sitting Out */}
              {round.sittingOut && round.sittingOut.length > 0 && (
                <div className="pt-4 border-t border-slate-600">
                  <div className="text-sm text-gray-400 mb-2">
                    Sitting Out ({round.sittingOut.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {round.sittingOut.map((userId: string) => (
                      <div
                        key={userId}
                        className="px-3 py-1 bg-yellow-600/20 border border-yellow-500 rounded text-sm text-white"
                      >
                        {participantMap.get(userId) || 'Unknown'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <div className="text-6xl mb-4">🎲</div>
            <div className="text-xl mb-2">No rounds generated yet</div>
            <div className="text-sm">Click the "Generate Rounds" button above to create randomized matchups</div>
          </div>
        </div>
      )}
    </main>
  )
}
