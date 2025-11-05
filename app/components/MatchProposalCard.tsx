'use client'

import { useState } from 'react'

interface MatchProposal {
  id: string
  status: string
  scheduledAt: string
  location?: string
  description?: string
  proposingTeam: {
    id: string
    name: string
  }
  opponentTeam: {
    id: string
    name: string
  }
  proposedBy: {
    id: string
    name: string
  }
  reviewedBy?: {
    id: string
    name: string
  }
  reviewReason?: string
  createdAt: string
  reviewedAt?: string
}

interface MatchProposalCardProps {
  proposal: MatchProposal
  isLeagueManager: boolean
  currentUserId?: string
  onApprove?: (proposalId: string, reason?: string) => Promise<void>
  onDeny?: (proposalId: string, reason: string) => Promise<void>
  onCancel?: (proposalId: string) => Promise<void>
  isProcessing?: boolean
}

export default function MatchProposalCard({
  proposal,
  isLeagueManager,
  currentUserId,
  onApprove,
  onDeny,
  onCancel,
  isProcessing = false
}: MatchProposalCardProps) {
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny'>('approve')
  const [reviewReason, setReviewReason] = useState('')

  const isPending = proposal.status === 'PENDING'
  const isApproved = proposal.status === 'APPROVED'
  const isDenied = proposal.status === 'DENIED'
  const isCancelled = proposal.status === 'CANCELLED'

  const getStatusColor = () => {
    switch (proposal.status) {
      case 'PENDING': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700'
      case 'APPROVED': return 'text-green-400 bg-green-900/30 border-green-700'
      case 'DENIED': return 'text-red-400 bg-red-900/30 border-red-700'
      case 'CANCELLED': return 'text-gray-400 bg-gray-900/30 border-gray-700'
      default: return 'text-gray-400 bg-gray-900/30 border-gray-700'
    }
  }

  const getStatusIcon = () => {
    switch (proposal.status) {
      case 'PENDING': return '⏳'
      case 'APPROVED': return '✅'
      case 'DENIED': return '❌'
      case 'CANCELLED': return '🚫'
      default: return '❓'
    }
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (reviewAction === 'approve' && onApprove) {
      await onApprove(proposal.id, reviewReason.trim() || undefined)
    } else if (reviewAction === 'deny' && onDeny) {
      if (!reviewReason.trim()) {
        alert('Please provide a reason for denying the proposal')
        return
      }
      await onDeny(proposal.id, reviewReason.trim())
    }
    
    setShowReviewForm(false)
    setReviewReason('')
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this match proposal?')) {
      return
    }
    
    if (onCancel) {
      await onCancel(proposal.id)
    }
  }

  const canCancel = isPending && !isLeagueManager // Only proposing team can cancel

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-white">
              {proposal.proposingTeam.name} vs {proposal.opponentTeam.name}
            </h4>
            <span className={`px-2 py-1 rounded text-xs border ${getStatusColor()}`}>
              {getStatusIcon()} {proposal.status}
            </span>
          </div>
          
          <div className="text-sm text-gray-400 space-y-1">
            <div>📅 {new Date(proposal.scheduledAt).toLocaleString()}</div>
            {proposal.location && <div>📍 {proposal.location}</div>}
            <div>👤 Proposed by {proposal.proposedBy.name}</div>
            {proposal.reviewedBy && (
              <div>
                🔍 {isApproved ? 'Approved' : 'Denied'} by {proposal.reviewedBy.name}
                {proposal.reviewedAt && ` on ${new Date(proposal.reviewedAt).toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {proposal.description && (
        <div className="mb-3 p-3 bg-slate-700/50 rounded">
          <div className="text-sm text-gray-300">
            <strong>Description:</strong> {proposal.description}
          </div>
        </div>
      )}

      {(proposal.reviewReason || (isDenied && !proposal.reviewReason)) && (
        <div className="mb-3 p-3 bg-slate-700/50 rounded">
          <div className="text-sm text-gray-300">
            <strong>{isApproved ? 'Approval' : 'Denial'} Reason:</strong>{' '}
            {proposal.reviewReason || 'No reason provided'}
          </div>
        </div>
      )}

      {/* Review Form for League Manager */}
      {isLeagueManager && isPending && !showReviewForm && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              setReviewAction('approve')
              setShowReviewForm(true)
            }}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Approve
          </button>
          <button
            onClick={() => {
              setReviewAction('deny')
              setShowReviewForm(true)
            }}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Deny
          </button>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <form onSubmit={handleReview} className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              {reviewAction === 'approve' ? 'Approval reason (optional)' : 'Denial reason *'}
            </label>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder={
                reviewAction === 'approve' 
                  ? 'Optional reason for approval...' 
                  : 'Please explain why this proposal is being denied...'
              }
              required={reviewAction === 'deny'}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isProcessing}
              className={`px-4 py-2 text-white rounded disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95 ${
                reviewAction === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isProcessing 
                ? `${reviewAction === 'approve' ? 'Approving' : 'Denying'}...` 
                : `${reviewAction === 'approve' ? 'Approve' : 'Deny'} Proposal`
              }
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReviewForm(false)
                setReviewReason('')
              }}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Cancel button for proposing team */}
      {canCancel && onCancel && (
        <div className="mt-3">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95 text-sm"
          >
            Cancel Proposal
          </button>
        </div>
      )}

      {/* Info for approved proposals */}
      {isApproved && (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
          <div className="text-sm text-green-100">
            <strong>✅ Match Approved!</strong> This match has been added to both teams' calendars and is now visible in the league schedule.
          </div>
        </div>
      )}
    </div>
  )
}
