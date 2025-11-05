'use client'

import { useState } from 'react'

interface MatchEditRequestFormProps {
  matchId: string
  currentScheduledAt: Date
  currentLocation: string | null
  onSubmit: (data: {
    newScheduledAt?: string
    newLocation?: string
    changeReason: string
  }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export default function MatchEditRequestForm({
  matchId,
  currentScheduledAt,
  currentLocation,
  onSubmit,
  onCancel,
  isSubmitting
}: MatchEditRequestFormProps) {
  const [newScheduledAt, setNewScheduledAt] = useState('')
  const [newLocation, setNewLocation] = useState(currentLocation || '')
  const [changeReason, setChangeReason] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const formatDateTimeLocal = (date: Date) => {
    const offset = date.getTimezoneOffset()
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000))
    return adjustedDate.toISOString().slice(0, 16)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: { [key: string]: string } = {}

    // Validate that at least one change is made
    if (!newScheduledAt && newLocation === (currentLocation || '')) {
      newErrors.general = 'At least one change (date/time or location) must be made'
    }

    // Validate change reason
    if (!changeReason.trim()) {
      newErrors.changeReason = 'Please explain why this change is needed'
    } else if (changeReason.length > 500) {
      newErrors.changeReason = 'Reason must be 500 characters or less'
    }

    // Validate future date
    if (newScheduledAt && new Date(newScheduledAt) <= new Date()) {
      newErrors.newScheduledAt = 'New date must be in the future'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      const submitData: any = {
        changeReason: changeReason.trim()
      }

      if (newScheduledAt) {
        submitData.newScheduledAt = newScheduledAt
      }

      if (newLocation !== (currentLocation || '')) {
        submitData.newLocation = newLocation
      }

      await onSubmit(submitData)
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-4">Request Match Edit</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}

        {/* Current Match Details */}
        <div className="bg-slate-700/50 rounded p-4">
          <h4 className="font-semibold text-gray-300 mb-2">Current Match Details:</h4>
          <div className="text-sm text-gray-400 space-y-1">
            <div>📅 {new Date(currentScheduledAt).toLocaleString()}</div>
            <div>📍 {currentLocation || 'No location set'}</div>
          </div>
        </div>

        {/* New Date/Time */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            New Date & Time (leave blank to keep current)
          </label>
          <input
            type="datetime-local"
            value={newScheduledAt}
            onChange={(e) => setNewScheduledAt(e.target.value)}
            min={formatDateTimeLocal(new Date())}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.newScheduledAt && (
            <p className="text-red-400 text-sm mt-1">{errors.newScheduledAt}</p>
          )}
        </div>

        {/* New Location */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Location
          </label>
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Enter new location or leave blank to remove"
            maxLength={100}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Current: {currentLocation || 'No location set'}
          </p>
        </div>

        {/* Change Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Reason for Change *
          </label>
          <textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Please explain why this match needs to be changed..."
            maxLength={500}
            rows={3}
            required
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-between items-center mt-1">
            {errors.changeReason && (
              <p className="text-red-400 text-sm">{errors.changeReason}</p>
            )}
            <p className="text-xs text-gray-400 ml-auto">
              {changeReason.length}/500 characters
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-orange-600 text-white px-4 py-2 rounded font-medium hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isSubmitting ? 'Submitting Request...' : 'Submit Edit Request'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-600 text-white rounded font-medium hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
        <div className="text-sm text-blue-100">
          <strong>📋 Note:</strong> Your edit request will be sent to the league manager for approval. 
          Both teams will be notified once the request is approved or denied.
        </div>
      </div>
    </div>
  )
}
