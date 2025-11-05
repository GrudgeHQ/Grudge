'use client'

import { useState } from 'react'

interface MatchEditRequest {
  id: string
  matchId: string
  requestedBy: {
    id: string
    name: string
    email: string
  }
  requestingTeam: {
    id: string
    name: string
  }
  currentScheduledAt: string
  currentLocation: string | null
  newScheduledAt: string | null
  newLocation: string | null
  changeReason: string
  status: string
  reviewedBy?: {
    id: string
    name: string 
    email: string
  }
  reviewReason: string | null
  createdAt: string
  reviewedAt: string | null
}

interface MatchEditRequestCardProps {
  request: MatchEditRequest
  isLeagueManager: boolean
  currentUserId?: string
  onApprove?: (requestId: string, reason?: string) => Promise<void>
  onDeny?: (requestId: string, reason: string) => Promise<void>
  onCancel?: (requestId: string) => Promise<void>
  isProcessing?: boolean
}

export default function MatchEditRequestCard({
  request,
  isLeagueManager,
  currentUserId,
  onApprove,
  onDeny,
  onCancel,
  isProcessing = false
}: MatchEditRequestCardProps) {
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny'>('approve')
  const [reviewReason, setReviewReason] = useState('')

  const isPending = request.status === 'PENDING'
  const isApproved = request.status === 'APPROVED'
  const isDenied = request.status === 'DENIED'
  const isCancelled = request.status === 'CANCELLED'

  const getStatusColor = () => {
    switch (request.status) {
      case 'PENDING':
        return 'bg-yellow-900/20 border border-yellow-600 text-yellow-200'
      case 'APPROVED':
        return 'bg-green-900/20 border border-green-600 text-green-200'
      case 'DENIED':
        return 'bg-red-900/20 border border-red-600 text-red-200'
      case 'CANCELLED':
        return 'bg-gray-900/20 border border-gray-600 text-gray-400'
      default:
        return 'bg-slate-900/20 border border-slate-600 text-slate-400'
    }
  }

  const getStatusIcon = () => {
    switch (request.status) {
      case 'PENDING':
        return '⏳'
      case 'APPROVED':
        return '✅'
      case 'DENIED':
        return '❌'
      case 'CANCELLED':
        return '🚫'
      default:
        return '❓'
    }
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (reviewAction === 'approve' && onApprove) {
      await onApprove(request.id, reviewReason || undefined)
    } else if (reviewAction === 'deny' && onDeny) {
      await onDeny(request.id, reviewReason)
    }
    
    setShowReviewForm(false)
    setReviewReason('')
  }

  const handleCancel = async () => {
    if (onCancel) {
      await onCancel(request.id)
    }
  }

  const canCancel = isPending && request.requestedBy.id === currentUserId

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-white">
              Edit Request from {request.requestingTeam.name}
            </h4>
            <span className={`px-2 py-1 rounded text-xs ${getStatusColor()}`}>
              {getStatusIcon()} {request.status}
            </span>
          </div>
          
          <div className="text-sm text-gray-400 space-y-1">
            <div>👤 Requested by {request.requestedBy.name}</div>
            <div>📅 Submitted {new Date(request.createdAt).toLocaleString()}</div>
            {request.reviewedBy && (
              <div>
                🔍 {isApproved ? 'Approved' : 'Denied'} by {request.reviewedBy.name}
                {request.reviewedAt && ` on ${new Date(request.reviewedAt).toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current vs Requested Changes */}
      <div className="mb-4 space-y-3">
        {request.newScheduledAt && (
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-sm font-medium text-gray-300 mb-2">📅 Date & Time Change:</div>
            <div className="text-sm space-y-1">
              <div className="text-gray-400">
                <span className="font-medium">Current:</span> {new Date(request.currentScheduledAt).toLocaleString()}
              </div>
              <div className="text-white">
                <span className="font-medium">Requested:</span> {new Date(request.newScheduledAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {request.newLocation !== undefined && request.newLocation !== request.currentLocation && (
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-sm font-medium text-gray-300 mb-2">📍 Location Change:</div>
            <div className="text-sm space-y-1">
              <div className="text-gray-400">
                <span className="font-medium">Current:</span> {request.currentLocation || 'No location set'}
              </div>
              <div className="text-white">
                <span className="font-medium">Requested:</span> {request.newLocation || 'Remove location'}
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-700/50 rounded p-3">
          <div className="text-sm font-medium text-gray-300 mb-2">💬 Reason for Change:</div>
          <div className="text-sm text-white">{request.changeReason}</div>
        </div>
      </div>

      {(request.reviewReason || (isDenied && !request.reviewReason)) && (
        <div className="mb-3 p-3 bg-slate-700/50 rounded">
          <div className="text-sm text-gray-300">
            <strong>{isApproved ? 'Approval' : 'Denial'} Note:</strong>{' '}
            {request.reviewReason || 'No reason provided'}
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
              {reviewAction === 'approve' ? 'Approval note (optional)' : 'Denial reason *'}
            </label>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder={
                reviewAction === 'approve' 
                  ? 'Optional note about the approval...' 
                  : 'Please explain why this request is being denied...'
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
                : `${reviewAction === 'approve' ? 'Approve' : 'Deny'} Request`
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

      {/* Cancel button for requesting user */}
      {canCancel && onCancel && (
        <div className="mt-3">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95 text-sm"
          >
            Cancel Request
          </button>
        </div>
      )}

      {/* Info for approved requests */}
      {isApproved && (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
          <div className="text-sm text-green-100">
            <strong>✅ Changes Applied!</strong> The match details have been updated and both teams have been notified.
          </div>
        </div>
      )}

      {/* Info for denied requests */}
      {isDenied && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded">
          <div className="text-sm text-red-100">
            <strong>❌ Request Denied</strong> The requested changes were not approved.
          </div>
        </div>
      )}
    </div>
  )
}
