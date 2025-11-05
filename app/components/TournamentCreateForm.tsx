'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
}

interface TournamentCreateFormProps {
  leagueId: string
  teams: Team[]
  onCancel: () => void
  onSuccess: (tournament: any) => void
}

const TOURNAMENT_FORMATS = [
  { value: 'SINGLE_ELIMINATION', label: 'Single Elimination' },
  { value: 'DOUBLE_ELIMINATION', label: 'Double Elimination' },
  { value: 'TRIPLE_ELIMINATION', label: 'Triple Elimination' }
]

export default function TournamentCreateForm({ 
  leagueId, 
  teams, 
  onCancel, 
  onSuccess 
}: TournamentCreateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'SINGLE_ELIMINATION',
    hasConsolationBracket: false,
    randomByes: false,
    maxTeams: '',
    selectedTeams: [] as string[]
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleTeamSelection = (teamId: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedTeams: selected 
        ? [...prev.selectedTeams, teamId]
        : prev.selectedTeams.filter(id => id !== teamId)
    }))
  }

  const handleSelectAllTeams = () => {
    const allTeamIds = teams.map(t => t.id)
    setFormData(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.length === allTeamIds.length ? [] : allTeamIds
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Tournament name is required')
      }

      if (formData.selectedTeams.length < 2) {
        throw new Error('At least 2 teams must be selected')
      }

      const maxTeams = formData.maxTeams ? parseInt(formData.maxTeams) : null
      if (maxTeams && maxTeams < formData.selectedTeams.length) {
        throw new Error('Max teams cannot be less than selected teams')
      }

      const response = await fetch(`/api/leagues/${leagueId}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          format: formData.format,
          hasConsolationBracket: formData.hasConsolationBracket,
          randomByes: formData.randomByes,
          maxTeams,
          selectedTeams: formData.selectedTeams
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tournament')
      }

      const data = await response.json()
      onSuccess(data.tournament)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Create Tournament</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-md p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Tournament Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter tournament name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tournament description (optional)"
            />
          </div>

          {/* Tournament Format */}
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-200 mb-2">
              Format *
            </label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TOURNAMENT_FORMATS.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Settings</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="hasConsolationBracket"
                  checked={formData.hasConsolationBracket}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 bg-slate-700 rounded"
                />
                <span className="ml-2 text-sm text-gray-200">
                  Include consolation bracket (3rd place match)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="randomByes"
                  checked={formData.randomByes}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 bg-slate-700 rounded"
                />
                <span className="ml-2 text-sm text-gray-200">
                  Random bye distribution (unchecked = highest seeds get byes)
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="maxTeams" className="block text-sm font-medium text-gray-200 mb-2">
                Maximum Teams (optional)
              </label>
              <input
                type="number"
                id="maxTeams"
                name="maxTeams"
                value={formData.maxTeams}
                onChange={handleInputChange}
                min="2"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Leave empty for no limit"
              />
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-white">
                Select Teams ({formData.selectedTeams.length} selected)
              </h3>
              <button
                type="button"
                onClick={handleSelectAllTeams}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {formData.selectedTeams.length === teams.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            {teams.length === 0 ? (
              <p className="text-gray-400 text-sm">No teams available in this league</p>
            ) : (
              <div className="border border-slate-600 bg-slate-700 rounded-md max-h-48 overflow-y-auto">
                {teams.map(team => (
                  <label
                    key={team.id}
                    className="flex items-center p-3 hover:bg-slate-600 border-b border-slate-600 last:border-b-0 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedTeams.includes(team.id)}
                      onChange={(e) => handleTeamSelection(team.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-500 bg-slate-600 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-200">{team.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-200 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.selectedTeams.length < 2}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
