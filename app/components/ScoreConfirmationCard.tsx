'use client'

import { useState } from 'react'

interface ScoreSubmission {
  id: string
  homeScore: number
  awayScore: number
  status: string
  submittedBy: string
  submittingTeam: string
  notes?: string
  submittedAt: string
  canEdit?: boolean
}

interface ScoreConfirmationCardProps {
  submission: ScoreSubmission
  homeTeamName: string
  awayTeamName: string
  onConfirm: (submissionId: string) => Promise<void>
  onDispute: (submissionId: string, reason: string) => Promise<void>
  onEdit?: (homeScore: number, awayScore: number, notes?: string) => Promise<void>
  isProcessing: boolean
  canConfirm: boolean
}

export default function ScoreConfirmationCard({
  submission,
  homeTeamName,
  awayTeamName,
  onConfirm,
  onDispute,
  onEdit,
  isProcessing,
  canConfirm
}: ScoreConfirmationCardProps) {
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeError, setDisputeError] = useState('')
  const [showEditForm, setShowEditForm] = useState(false)
  const [editHomeScore, setEditHomeScore] = useState(submission.homeScore)
  const [editAwayScore, setEditAwayScore] = useState(submission.awayScore)
  const [editNotes, setEditNotes] = useState(submission.notes || '')
  const [editError, setEditError] = useState('')

  const handleConfirm = async () => {
    try {
      await onConfirm(submission.id)
    } catch (error) {
      console.error('Failed to confirm score:', error)
    }
  }

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!disputeReason.trim()) {
      setDisputeError('Please provide a reason for disputing this score')
      return
    }

    try {
      await onDispute(submission.id, disputeReason.trim())
      setShowDisputeForm(false)
      setDisputeReason('')
      setDisputeError('')
    } catch (error) {
      console.error('Failed to dispute score:', error)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editHomeScore < 0 || editAwayScore < 0) {
      setEditError('Scores must be non-negative numbers')
      return
    }

    if (!onEdit) {
      setEditError('Edit function not available')
      return
    }

    try {
      await onEdit(editHomeScore, editAwayScore, editNotes.trim() || undefined)
      setShowEditForm(false)
      setEditError('')
    } catch (error) {
      console.error('Failed to edit score:', error)
      setEditError('Failed to update score. Please try again.')
    }
  }

  const getStatusBadge = () => {
    switch (submission.status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
            Pending Confirmation
          </span>
        )
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-500/30">
            Confirmed
          </span>
        )
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-300 border border-red-500/30">
            Disputed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Score Submission</h3>
          <p className="text-sm text-gray-400">
            Submitted by {submission.submittedBy} from {submission.submittingTeam}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Score Display */}
      <div className="space-y-4 mb-4">
        <div className="grid grid-cols-3 items-center gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">{homeTeamName}</p>
            <p className="text-3xl font-bold text-white">{submission.homeScore}</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-400">VS</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">{awayTeamName}</p>
            <p className="text-3xl font-bold text-white">{submission.awayScore}</p>
          </div>
        </div>
        
        {/* Win/Loss Indicator */}
        <div className="text-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            submission.homeScore > submission.awayScore
              ? 'bg-green-900/30 text-green-400 border border-green-400/30'
              : submission.homeScore < submission.awayScore
                ? 'bg-red-900/30 text-red-400 border border-red-400/30'
                : 'bg-yellow-900/30 text-yellow-400 border border-yellow-400/30'
          }`}>
            {submission.homeScore > submission.awayScore
              ? `🎉 ${homeTeamName} Victory!`
              : submission.homeScore < submission.awayScore
                ? `🎉 ${awayTeamName} Victory!`
                : '🤝 Draw'}
          </span>
        </div>
      </div>

      {/* Notes */}
      {submission.notes && (
        <div className="mb-4 p-3 bg-slate-700 rounded-lg">
          <p className="text-sm text-gray-300">
            <span className="font-medium text-gray-200">Notes:</span> {submission.notes}
          </p>
        </div>
      )}

      {/* Edit Actions */}
      {submission.status === 'PENDING' && submission.canEdit && onEdit && (
        <div className="space-y-3 mb-4">
          {!showEditForm ? (
            <div className="flex justify-center">
              <button
                onClick={() => setShowEditForm(true)}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                  isProcessing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                    : 'bg-transparent border border-blue-500 text-blue-400 hover:bg-blue-600/10 active:bg-blue-600/20'
                }`}
              >
                Edit Score
              </button>
            </div>
          ) : (
            <form onSubmit={handleEdit} className="space-y-4 p-4 bg-slate-700 rounded-lg">
              <h4 className="font-medium text-white">Edit Score Submission</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {homeTeamName} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editHomeScore}
                    onChange={(e) => {
                      setEditHomeScore(parseInt(e.target.value) || 0)
                      setEditError('')
                    }}
                    className={`w-full px-3 py-2 bg-slate-600 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editError ? 'border-red-500' : 'border-slate-500'
                    }`}
                    disabled={isProcessing}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {awayTeamName} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editAwayScore}
                    onChange={(e) => {
                      setEditAwayScore(parseInt(e.target.value) || 0)
                      setEditError('')
                    }}
                    className={`w-full px-3 py-2 bg-slate-600 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editError ? 'border-red-500' : 'border-slate-500'
                    }`}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => {
                    setEditNotes(e.target.value)
                    setEditError('')
                  }}
                  rows={3}
                  className={`w-full px-3 py-2 bg-slate-600 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    editError ? 'border-red-500' : 'border-slate-500'
                  }`}
                  placeholder="Add any additional notes about the match..."
                  disabled={isProcessing}
                  maxLength={500}
                />
                <div className="text-xs text-gray-400 mt-1">
                  {editNotes.length}/500 characters
                </div>
              </div>

              {editError && (
                <p className="text-red-400 text-sm">{editError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                    isProcessing
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white active:scale-95'
                  }`}
                >
                  {isProcessing ? 'Updating...' : 'Update Score'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false)
                    setEditHomeScore(submission.homeScore)
                    setEditAwayScore(submission.awayScore)
                    setEditNotes(submission.notes || '')
                    setEditError('')
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-transparent border border-gray-500 text-gray-400 rounded-lg hover:bg-gray-700 transition-all touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Confirmation Actions */}
      {submission.status === 'PENDING' && canConfirm && (
        <div className="space-y-3">
          {!showDisputeForm && !showEditForm ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                  isProcessing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white active:scale-95'
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400 inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Confirm Score'
                )}
              </button>
              
              <button
                onClick={() => setShowDisputeForm(true)}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                  isProcessing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                    : 'bg-transparent border border-red-500 text-red-400 hover:bg-red-600/10 active:bg-red-600/20'
                }`}
              >
                Dispute Score
              </button>
            </div>
          ) : (
            <form onSubmit={handleDispute} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Dispute
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => {
                    setDisputeReason(e.target.value)
                    setDisputeError('')
                  }}
                  rows={3}
                  className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none touch-manipulation ${
                    disputeError ? 'border-red-500' : 'border-slate-600'
                  }`}
                  placeholder="Please explain why you're disputing this score..."
                  disabled={isProcessing}
                  maxLength={500}
                />
                {disputeError && (
                  <p className="text-red-400 text-xs mt-1">{disputeError}</p>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {disputeReason.length}/500 characters
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                    isProcessing
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white active:scale-95'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Submit Dispute'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowDisputeForm(false)
                    setDisputeReason('')
                    setDisputeError('')
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-transparent border border-gray-500 text-gray-400 rounded-lg hover:bg-gray-700 transition-all touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Status Message for Non-Pending Submissions */}
      {submission.status !== 'PENDING' && (
        <div className="text-center py-3">
          <p className="text-sm text-gray-400">
            {submission.status === 'CONFIRMED' 
              ? 'This score has been confirmed and applied to the match.'
              : submission.status === 'DISPUTED'
              ? 'This score has been disputed and is under review.'
              : 'This score submission is no longer pending.'
            }
          </p>
        </div>
      )}

      {/* Access Message */}
      {submission.status === 'PENDING' && !canConfirm && (
        <div className="text-center py-3">
          <p className="text-sm text-gray-400">
            Only administrators from the opposing team can confirm this score.
          </p>
        </div>
      )}
    </div>
  )
}
