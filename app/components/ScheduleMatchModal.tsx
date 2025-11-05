'use client'

import { useState } from 'react'

interface ScheduleMatchModalProps {
  match: {
    id: string
    homeTeam: { name: string }
    awayTeam: { name: string }
    scheduledAt?: string | null
    location?: string | null
    description?: string | null
    notes?: string | null
  }
  leagueId: string
  seasonId: string
  onClose: () => void
  onScheduled: () => void
}

export default function ScheduleMatchModal({ 
  match, 
  leagueId, 
  seasonId, 
  onClose, 
  onScheduled 
}: ScheduleMatchModalProps) {
  const [formData, setFormData] = useState({
    scheduledAt: match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : '',
    location: match.location || '',
    description: match.description || '',
    notes: match.notes || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!formData.scheduledAt) {
      alert('Please select a date and time for the match')
      return
    }
    
    if (!formData.location.trim()) {
      alert('Please enter a location for the match')
      return
    }
    
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `/api/leagues/${leagueId}/seasons/${seasonId}/matches/${match.id}/schedule`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      )

      console.log('API Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Schedule API success response:', result)
        onScheduled()
        onClose()
      } else {
        const error = await response.json()
        console.error('Schedule API error response:', error)
        alert(error.error || 'Failed to schedule match')
      }
    } catch (error) {
      console.error('Error scheduling match:', error)
      alert('Failed to schedule match')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">
          Schedule Match: {match.homeTeam.name} vs {match.awayTeam.name}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Date & Time <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Location <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter match location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Brief match description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notes <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              placeholder="Additional notes for the match (optional)"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Match'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-600 text-white py-2 px-4 rounded-lg hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}