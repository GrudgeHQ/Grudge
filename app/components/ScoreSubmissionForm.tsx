'use client'

import { useState } from 'react'

interface ScoreSubmissionFormProps {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  onSubmit: (homeScore: number, awayScore: number, notes?: string) => Promise<void>
  isSubmitting: boolean
  disabled?: boolean
  initialHomeScore?: number | null
  initialAwayScore?: number | null
  isUpdate?: boolean
}

export default function ScoreSubmissionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  onSubmit,
  isSubmitting,
  disabled = false,
  initialHomeScore = null,
  initialAwayScore = null,
  isUpdate = false
}: ScoreSubmissionFormProps) {
  const [homeScore, setHomeScore] = useState<string>(
    initialHomeScore !== null ? initialHomeScore.toString() : ''
  )
  const [awayScore, setAwayScore] = useState<string>(
    initialAwayScore !== null ? initialAwayScore.toString() : ''
  )
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Convert to number and validate - explicitly allow 0
    const homeScoreNum = Number(homeScore)
    const awayScoreNum = Number(awayScore)

    if (homeScore === '' || isNaN(homeScoreNum) || homeScoreNum < 0 || !Number.isInteger(homeScoreNum)) {
      newErrors.homeScore = 'Please enter a valid home team score (0 or positive integer)'
    }

    if (awayScore === '' || isNaN(awayScoreNum) || awayScoreNum < 0 || !Number.isInteger(awayScoreNum)) {
      newErrors.awayScore = 'Please enter a valid away team score (0 or positive integer)'
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
      await onSubmit(Number(homeScore), Number(awayScore), notes.trim() || undefined)
      // Reset form on successful submission
      setHomeScore('')
      setAwayScore('')
      setNotes('')
      setErrors({})
    } catch (error) {
      console.error('Failed to submit score:', error)
    }
  }

  if (disabled) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Score Submission</h3>
        <p className="text-gray-400 text-sm">
          Score submission is disabled for this match.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        {isUpdate ? 'Update Match Score' : 'Submit Match Score'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home Team Score */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {homeTeamName} Score
            </label>
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation ${
                errors.homeScore ? 'border-red-500' : 'border-slate-600'
              }`}
              placeholder="0"
              disabled={isSubmitting}
            />
            {errors.homeScore && (
              <p className="text-red-400 text-xs mt-1">{errors.homeScore}</p>
            )}
          </div>

          {/* Away Team Score */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {awayTeamName} Score
            </label>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation ${
                errors.awayScore ? 'border-red-500' : 'border-slate-600'
              }`}
              placeholder="0"
              disabled={isSubmitting}
            />
            {errors.awayScore && (
              <p className="text-red-400 text-xs mt-1">{errors.awayScore}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none touch-manipulation"
            placeholder="Add any additional notes about the match..."
            disabled={isSubmitting}
            maxLength={500}
          />
          <div className="text-xs text-gray-400 mt-1">
            {notes.length}/500 characters
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4">
          {!isUpdate && (
            <p className="text-xs text-gray-400">
              The opposing team will need to confirm this score.
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition-all touch-manipulation ${
              isSubmitting
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white active:scale-95'
            } ${isUpdate ? 'ml-auto' : ''}`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400 inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isUpdate ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              isUpdate ? 'Update Score' : 'Submit Score'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
