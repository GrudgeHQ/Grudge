'use client'

import { useState } from 'react'

interface MatchProposalFormProps {
  leagueId: string
  leagueName: string
  availableTeams: Array<{
    id: string
    name: string
  }>
  currentTeamId: string
  onSubmit: (proposal: {
    opponentTeamId: string
    scheduledAt: string
    location?: string
    description?: string
  }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export default function MatchProposalForm({
  leagueId,
  leagueName,
  availableTeams,
  currentTeamId,
  onSubmit,
  onCancel,
  isSubmitting
}: MatchProposalFormProps) {
  const [opponentTeamId, setOpponentTeamId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Filter out current team from available opponents
  const opponentTeams = availableTeams.filter(team => team.id !== currentTeamId)

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!opponentTeamId) {
      newErrors.opponentTeamId = 'Please select an opponent team'
    }

    if (!scheduledAt) {
      newErrors.scheduledAt = 'Please select a date and time'
    } else {
      const selectedDate = new Date(scheduledAt)
      const now = new Date()
      if (selectedDate <= now) {
        newErrors.scheduledAt = 'Match must be scheduled for a future date'
      }
    }

    if (description && description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit({
        opponentTeamId,
        scheduledAt,
        location: location.trim() || undefined,
        description: description.trim() || undefined
      })
      
      // Reset form on success
      setOpponentTeamId('')
      setScheduledAt('')
      setLocation('')
      setDescription('')
      setErrors({})
    } catch (error) {
      console.error('Failed to submit proposal:', error)
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Propose League Match</h3>
          <p className="text-sm text-gray-400">
            Propose a head-to-head match in <span className="text-blue-400">{leagueName}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Opponent Team *
          </label>
          <select
            value={opponentTeamId}
            onChange={(e) => setOpponentTeamId(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            <option value="">Select opponent team...</option>
            {opponentTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {errors.opponentTeamId && (
            <p className="text-red-400 text-sm mt-1">{errors.opponentTeamId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Proposed Date & Time *
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          {errors.scheduledAt && (
            <p className="text-red-400 text-sm mt-1">{errors.scheduledAt}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Location (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Main Stadium, Field A"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Additional details about the proposed match..."
            disabled={isSubmitting}
            maxLength={500}
          />
          <div className="text-xs text-gray-400 mt-1">
            {description.length}/500 characters
          </div>
          {errors.description && (
            <p className="text-red-400 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        <div className="bg-blue-500/20 border border-blue-500 text-blue-100 px-4 py-3 rounded">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <strong>Approval Required:</strong> This match proposal will be sent to the league manager for approval. 
              Both teams will be notified once the proposal is approved or denied.
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isSubmitting ? 'Proposing Match...' : 'Propose Match'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
