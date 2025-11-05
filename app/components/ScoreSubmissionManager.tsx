'use client'

import { useState, useEffect } from 'react'

interface ScoreSubmission {
  id: string
  homeScore: number
  awayScore: number
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED'
  submittedBy: string
  submittingTeam: string
  notes?: string
  disputeReason?: string
  submittedAt: string
  confirmedAt?: string
  confirmingTeam?: string
  confirmedBy?: string
}

interface ScoreSubmissionManagerProps {
  matchId: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  currentUserTeamIds: string[]
  isAdmin: boolean
  onScoreConfirmed?: () => void
}

export default function ScoreSubmissionManager({ 
  matchId, 
  homeTeam, 
  awayTeam, 
  currentUserTeamIds, 
  isAdmin,
  onScoreConfirmed 
}: ScoreSubmissionManagerProps) {
  const [submissions, setSubmissions] = useState<ScoreSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [matchId])

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`/api/season-matches/${matchId}/scores`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error('Error fetching score submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (submissionId: string, action: 'confirm' | 'dispute') => {
    if (action === 'dispute' && !disputeReason.trim()) {
      alert('Please provide a reason for disputing the score')
      return
    }

    setActionLoading(submissionId)
    try {
      const response = await fetch(`/api/season-matches/${matchId}/scores/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          disputeReason: action === 'dispute' ? disputeReason : undefined 
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        await fetchSubmissions() // Refresh submissions
        if (onScoreConfirmed && action === 'confirm') {
          onScoreConfirmed()
        }
        setShowDisputeForm(null)
        setDisputeReason('')
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${action} score`)
      }
    } catch (error) {
      console.error(`Error ${action}ing score:`, error)
      alert(`Failed to ${action} score`)
    } finally {
      setActionLoading(null)
    }
  }

  const canConfirmSubmission = (submission: ScoreSubmission) => {
    if (!isAdmin || submission.status !== 'PENDING') return false
    
    // User must be admin of the opposing team (not the submitting team)
    const submittingTeamId = submission.submittingTeam === homeTeam.name ? homeTeam.id : awayTeam.id
    const opposingTeamIds = [homeTeam.id, awayTeam.id].filter(id => id !== submittingTeamId)
    
    return currentUserTeamIds.some(teamId => opposingTeamIds.includes(teamId))
  }

  if (loading) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg">
        <h4 className="font-medium text-white mb-2">Score Submissions</h4>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg">
        <h4 className="font-medium text-white mb-2">Score Submissions</h4>
        <p className="text-slate-400 text-sm">No score submissions yet</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <h4 className="font-medium text-white mb-3">Score Submissions</h4>
      <div className="space-y-3">
        {submissions.map((submission) => (
          <div 
            key={submission.id} 
            className={`p-3 rounded border ${
              submission.status === 'CONFIRMED' 
                ? 'border-green-600 bg-green-900/20' 
                : submission.status === 'DISPUTED'
                  ? 'border-red-600 bg-red-900/20'
                  : 'border-slate-600 bg-slate-700/50'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium text-white">
                  {homeTeam.name} {submission.homeScore} - {submission.awayScore} {awayTeam.name}
                </div>
                <div className="text-sm text-slate-400">
                  Submitted by {submission.submittingTeam} ({submission.submittedBy})
                </div>
                {submission.notes && (
                  <div className="text-sm text-slate-300 mt-1">
                    Note: {submission.notes}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  submission.status === 'CONFIRMED'
                    ? 'bg-green-600 text-white'
                    : submission.status === 'DISPUTED'
                      ? 'bg-red-600 text-white'
                      : 'bg-yellow-600 text-white'
                }`}>
                  {submission.status}
                </span>
              </div>
            </div>

            {submission.status === 'CONFIRMED' && submission.confirmedBy && (
              <div className="text-sm text-green-400 mt-2">
                ✓ Confirmed by {submission.confirmingTeam} ({submission.confirmedBy})
              </div>
            )}

            {submission.status === 'DISPUTED' && (
              <div className="text-sm text-red-400 mt-2">
                ⚠ Disputed by {submission.confirmingTeam}: {submission.disputeReason}
              </div>
            )}

            {submission.status === 'PENDING' && canConfirmSubmission(submission) && (
              <div className="mt-3 pt-3 border-t border-slate-600">
                <div className="text-sm text-slate-300 mb-3">
                  As an administrator of the opposing team, you can confirm or dispute this score:
                </div>
                
                {showDisputeForm === submission.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Please provide a reason for disputing this score..."
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white text-sm resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(submission.id, 'dispute')}
                        disabled={actionLoading === submission.id}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === submission.id ? 'Submitting...' : 'Submit Dispute'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDisputeForm(null)
                          setDisputeReason('')
                        }}
                        className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(submission.id, 'confirm')}
                      disabled={actionLoading === submission.id}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === submission.id ? 'Confirming...' : '✓ Confirm Score'}
                    </button>
                    <button
                      onClick={() => setShowDisputeForm(submission.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      ⚠ Dispute Score
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-slate-500 mt-2">
              Submitted: {new Date(submission.submittedAt).toLocaleString()}
              {submission.confirmedAt && (
                <> • Processed: {new Date(submission.confirmedAt).toLocaleString()}</>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}