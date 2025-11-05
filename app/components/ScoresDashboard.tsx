'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ScoreSubmission {
  id: string
  seasonMatchId: string
  homeScore: number
  awayScore: number
  status: string
  submittedBy: {
    name: string
    email: string
  }
  submittingTeam: {
    name: string
  }
  submittedAt: string
  seasonMatch: {
    scheduledAt: string
    homeTeam: {
      id: string
      name: string
    }
    awayTeam: {
      id: string
      name: string
    }
    homeScore: number | null
    awayScore: number | null
    status: string
  }
}

interface ScoresDashboardProps {
  leagueId: string
  isLeagueManager: boolean
}

export default function ScoresDashboard({ leagueId, isLeagueManager }: ScoresDashboardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pendingSubmissions, setPendingSubmissions] = useState<ScoreSubmission[]>([])
  const [unrecordedMatches, setUnrecordedMatches] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadScoresData()
    loadCurrentUser()
  }, [leagueId])

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
      }
    } catch (err) {
      console.error('Failed to load current user:', err)
    }
  }

  const loadScoresData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/scores-dashboard`)
      if (res.ok) {
        const data = await res.json()
        setPendingSubmissions(data.pendingSubmissions || [])
        setUnrecordedMatches(data.unrecordedMatches || [])
      }
    } catch (err) {
      console.error('Failed to load scores data:', err)
    } finally {
      setLoading(false)
    }
  }

  const isUserTeamInMatch = (match: any) => {
    if (!currentUser) return false
    const userTeamIds = currentUser.memberships?.map((m: any) => m.teamId) || []
    return userTeamIds.includes(match.homeTeam.id) || userTeamIds.includes(match.awayTeam.id)
  }

  const isUserAdminOfTeam = (teamId: string) => {
    if (!currentUser) return false
    const membership = currentUser.memberships?.find((m: any) => m.teamId === teamId)
    return membership?.isAdmin === true
  }

  const canUserReviewSubmission = (submission: ScoreSubmission) => {
    if (isLeagueManager) return true
    if (!currentUser) return false
    
    // Check if user is admin of the opposing team
    const userTeamIds = currentUser.memberships
      ?.filter((m: any) => m.isAdmin)
      .map((m: any) => m.teamId) || []
    
    const opposingTeamId = submission.seasonMatch.homeTeam.id === submission.submittingTeam.name 
      ? submission.seasonMatch.awayTeam.id 
      : submission.seasonMatch.homeTeam.id
    
    return userTeamIds.includes(opposingTeamId)
  }

  const handleReviewScore = (submission: ScoreSubmission) => {
    router.push(`/matches?highlight=${submission.seasonMatchId}`)
  }

  const handleSubmitScore = (match: any) => {
    router.push(`/matches?highlight=${match.id}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-400">Loading scores dashboard...</div>
      </div>
    )
  }

  const hasPendingActions = pendingSubmissions.length > 0 || unrecordedMatches.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Scores Dashboard</h2>
        <p className="text-gray-400">
          Track score submissions, confirmations, and unrecorded matches
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-orange-400">{pendingSubmissions.length}</div>
              <div className="text-gray-300 mt-1">Pending Confirmations</div>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>
        
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-red-400">{unrecordedMatches.length}</div>
              <div className="text-gray-300 mt-1">Unrecorded Matches</div>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>
      </div>

      {!hasPendingActions && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-green-400 mb-2">All Caught Up!</h3>
          <p className="text-gray-300">
            There are no pending score confirmations or unrecorded matches at this time.
          </p>
        </div>
      )}

      {/* Pending Confirmations */}
      {pendingSubmissions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-orange-400">
            ⏳ Pending Confirmations ({pendingSubmissions.length})
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            These scores have been submitted and are waiting for confirmation from the opposing team
          </p>
          
          <div className="space-y-4">
            {pendingSubmissions.map((submission) => {
              const canReview = canUserReviewSubmission(submission)
              const matchDate = new Date(submission.seasonMatch.scheduledAt)
              const isOverdue = matchDate < new Date(Date.now() - 48 * 60 * 60 * 1000) // More than 48 hours ago
              
              return (
                <div 
                  key={submission.id} 
                  className={`bg-gray-700 rounded-lg p-4 border-l-4 ${
                    isOverdue ? 'border-red-500' : 'border-orange-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg">
                          {submission.seasonMatch.homeTeam.name} vs {submission.seasonMatch.awayTeam.name}
                        </span>
                        {isOverdue && (
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      
                      <div className="text-gray-300 space-y-1">
                        <p>
                          <span className="font-semibold">Submitted Score:</span>{' '}
                          {submission.homeScore} - {submission.awayScore}
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Submitted by:</span>{' '}
                          {submission.submittingTeam.name} ({submission.submittedBy.name})
                        </p>
                        <p className="text-sm text-gray-400">
                          📅 Match Date: {matchDate.toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-400">
                          📤 Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {canReview ? (
                        <button
                          onClick={() => handleReviewScore(submission)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded whitespace-nowrap"
                        >
                          Review & Confirm →
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReviewScore(submission)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded whitespace-nowrap"
                        >
                          View Details →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unrecorded Matches */}
      {unrecordedMatches.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-red-400">
            📝 Unrecorded Matches ({unrecordedMatches.length})
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            These matches have been played but no scores have been submitted yet
          </p>
          
          <div className="space-y-4">
            {unrecordedMatches.map((match) => {
              const canSubmit = isUserAdminOfTeam(match.homeTeam.id) || isUserAdminOfTeam(match.awayTeam.id)
              const matchDate = new Date(match.scheduledAt)
              const daysAgo = Math.floor((Date.now() - matchDate.getTime()) / (24 * 60 * 60 * 1000))
              const isUrgent = daysAgo > 7
              
              return (
                <div 
                  key={match.id} 
                  className={`bg-gray-700 rounded-lg p-4 border-l-4 ${
                    isUrgent ? 'border-red-500' : 'border-yellow-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg">
                          {match.homeTeam.name} vs {match.awayTeam.name}
                        </span>
                        {isUrgent && (
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                            URGENT ({daysAgo} days ago)
                          </span>
                        )}
                        {!isUrgent && daysAgo > 0 && (
                          <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                            {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago
                          </span>
                        )}
                      </div>
                      
                      <div className="text-gray-300 space-y-1">
                        <p className="text-sm text-gray-400">
                          📅 Played: {matchDate.toLocaleDateString()} at{' '}
                          {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {match.location && (
                          <p className="text-sm text-gray-400">
                            📍 {match.location}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {canSubmit ? (
                        <button
                          onClick={() => handleSubmitScore(match)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded whitespace-nowrap"
                        >
                          Submit Score →
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubmitScore(match)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded whitespace-nowrap"
                        >
                          View Match →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
