'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SeasonMatch {
  id: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  homeScore: number | null
  awayScore: number | null
  scheduledAt: string | null
  location: string | null
  status: string
  season: {
    id: string
    name: string
    league: {
      id: string
      name: string
      creatorId: string
    }
  }
}

interface ScoreSubmission {
  id: string
  homeScore: number
  awayScore: number
  status: string
  submittedBy: string
  submittingTeam: string
  confirmingTeam: string | null
  confirmedBy: string | null
  notes: string | null
  disputeReason: string | null
  submittedAt: string
  confirmedAt: string | null
}

export default function SeasonMatchDetailPage({ params }: { params: Promise<{ matchId: string }> }) {
  const router = useRouter()
  const [matchId, setMatchId] = useState<string | null>(null)
  const [match, setMatch] = useState<SeasonMatch | null>(null)
  const [submissions, setSubmissions] = useState<ScoreSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userAccess, setUserAccess] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')

  useEffect(() => {
    params.then((p) => setMatchId(p.matchId))
  }, [params])

  const loadMatchData = useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/season-matches/${matchId}/scores`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load match data')
      }
      const data = await res.json()
      setMatch(data.match)
      setSubmissions(data.submissions || [])
      setUserAccess(data.userAccess)
    } catch (err: any) {
      setError(err.message || 'Failed to load match data')
    } finally {
      setLoading(false)
    }
  }, [matchId, router])

  useEffect(() => {
    if (matchId) {
      loadMatchData()
    }
  }, [matchId, loadMatchData])

  const handleConfirm = async (submissionId: string) => {
    if (!confirm('Are you sure you want to confirm this score? This will update the league standings.')) {
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/season-matches/${matchId}/scores/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to confirm score')
      }

      alert('Score confirmed successfully! League standings have been updated.')
      loadMatchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDispute = async (submissionId: string) => {
    if (!disputeReason.trim()) {
      setError('Please provide a reason for disputing this score')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/season-matches/${matchId}/scores/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispute',
          disputeReason: disputeReason.trim()
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to dispute score')
      }

      alert('Score disputed successfully. The league manager has been notified.')
      setShowDisputeForm(false)
      setDisputeReason('')
      loadMatchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <p>Loading match details...</p>
      </div>
    )
  }

  if (error && !match) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => router.back()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <p>Match not found</p>
      </div>
    )
  }

  const pendingSubmission = submissions.find(s => s.status === 'PENDING')
  const canConfirm = userAccess?.isAdmin && pendingSubmission

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Match Details</h1>
            <p className="text-gray-400">
              {match.season.league.name} • {match.season.name}
            </p>
          </div>
          <button
            onClick={() => router.push(`/leagues/${match.season.league.id}`)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded"
          >
            Back to League
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Match Info */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </h2>
            <div className={`px-3 py-1 rounded text-sm font-medium ${
              match.status === 'CONFIRMED' ? 'bg-green-600' :
              match.status === 'PENDING_CONFIRMATION' ? 'bg-yellow-600' :
              match.status === 'DISPUTED' ? 'bg-red-600' :
              'bg-gray-600'
            }`}>
              {match.status}
            </div>
          </div>

          {match.scheduledAt && (
            <p className="text-gray-400 mb-2">
              📅 {new Date(match.scheduledAt).toLocaleString()}
            </p>
          )}
          {match.location && (
            <p className="text-gray-400 mb-4">
              📍 {match.location}
            </p>
          )}

          {match.homeScore !== null && match.awayScore !== null && (
            <div className="text-4xl font-bold text-center py-4">
              {match.homeScore} - {match.awayScore}
            </div>
          )}
        </div>

        {/* Score Submissions */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Score Submissions</h3>

          {submissions.length === 0 ? (
            <p className="text-gray-400">No score submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => {
                const isPending = submission.status === 'PENDING'
                const isConfirmed = submission.status === 'CONFIRMED'
                const isDisputed = submission.status === 'DISPUTED'

                return (
                  <div
                    key={submission.id}
                    className={`border rounded-lg p-4 ${
                      isConfirmed ? 'border-green-600 bg-green-900/20' :
                      isDisputed ? 'border-red-600 bg-red-900/20' :
                      'border-yellow-600 bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="text-xl font-bold mb-1">
                          {submission.homeScore} - {submission.awayScore}
                        </div>
                        <div className="text-sm text-gray-400">
                          Submitted by <span className="font-medium">{submission.submittingTeam}</span>
                          <br />
                          {submission.submittedBy} • {new Date(submission.submittedAt).toLocaleString()}
                        </div>
                        {submission.notes && (
                          <div className="mt-2 text-sm text-gray-300 italic">
                            Note: "{submission.notes}"
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded text-sm font-medium ${
                        isConfirmed ? 'bg-green-600' :
                        isDisputed ? 'bg-red-600' :
                        'bg-yellow-600'
                      }`}>
                        {submission.status}
                      </div>
                    </div>

                    {isConfirmed && submission.confirmedBy && (
                      <div className="mt-2 pt-2 border-t border-gray-700 text-sm text-green-400">
                        ✅ Confirmed by {submission.confirmingTeam} ({submission.confirmedBy})
                        {submission.confirmedAt && ` on ${new Date(submission.confirmedAt).toLocaleString()}`}
                      </div>
                    )}

                    {isDisputed && submission.disputeReason && (
                      <div className="mt-2 pt-2 border-t border-gray-700 text-sm text-red-400">
                        ⚠️ Disputed by {submission.confirmingTeam}: "{submission.disputeReason}"
                      </div>
                    )}

                    {/* Action buttons for pending submissions */}
                    {isPending && canConfirm && submission.id === pendingSubmission?.id && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-300 mb-3">
                          As an administrator of the opposing team, you can confirm or dispute this score:
                        </p>

                        {!showDisputeForm ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(submission.id)}
                              disabled={processing}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-4 py-2 rounded font-medium"
                            >
                              ✅ Confirm Score
                            </button>
                            <button
                              onClick={() => setShowDisputeForm(true)}
                              disabled={processing}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-4 py-2 rounded font-medium"
                            >
                              ⚠️ Dispute Score
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea
                              value={disputeReason}
                              onChange={(e) => setDisputeReason(e.target.value)}
                              placeholder="Please provide a reason for disputing this score..."
                              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-red-500"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDispute(submission.id)}
                                disabled={processing || !disputeReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-4 py-2 rounded font-medium"
                              >
                                {processing ? 'Submitting...' : 'Submit Dispute'}
                              </button>
                              <button
                                onClick={() => {
                                  setShowDisputeForm(false)
                                  setDisputeReason('')
                                }}
                                disabled={processing}
                                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-4 py-2 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Help text */}
        {!canConfirm && pendingSubmission && (
          <div className="mt-4 bg-blue-500/20 border border-blue-500 text-blue-100 px-4 py-3 rounded">
            <p className="text-sm">
              Only team administrators of the opposing team can confirm or dispute score submissions.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
