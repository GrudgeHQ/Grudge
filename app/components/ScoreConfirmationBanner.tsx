'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface PendingMatch {
  id: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  homeScore: number | null
  awayScore: number | null
  scheduledAt: string | null
  season: {
    id: string
    name: string
    league: {
      id: string
      name: string
    }
  }
}

export default function ScoreConfirmationBanner() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'authenticated') {
      loadPendingMatches()
    } else if (status === 'unauthenticated') {
      setLoading(false)
      setPendingMatches([])
    } else if (status === 'loading') {
      setLoading(true)
    }
  }, [status])

  const loadPendingMatches = async () => {
    try {
      const res = await fetch('/api/season-matches/pending-confirmation')
      if (res.ok) {
        const data = await res.json()
        setPendingMatches(data.matches || [])
      }
    } catch (err) {
      console.error('Failed to load pending score confirmations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = (matchId: string) => {
    setDismissed(prev => new Set([...prev, matchId]))
    // Store in session storage so it persists during the session
    const dismissedList = Array.from(dismissed)
    dismissedList.push(matchId)
    sessionStorage.setItem('dismissedScores', JSON.stringify(dismissedList))
  }

  const handleReviewScore = (matchId: string) => {
    router.push(`/season-matches/${matchId}`)
  }

  // Filter out dismissed matches
  const visibleMatches = pendingMatches.filter(m => !dismissed.has(m.id))

  // Don't render anything if loading or no matches
  if (loading || visibleMatches.length === 0 || !Array.isArray(visibleMatches)) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-600 to-orange-600 shadow-lg"
         style={{ display: visibleMatches.length > 0 ? 'block' : 'none' }}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full p-2">
              <svg className="w-6 h-6 text-yellow-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">
                ⚠️ Score Confirmation Required!
              </h3>
              <p className="text-yellow-100 text-sm">
                You have {visibleMatches.length} match score{visibleMatches.length > 1 ? 's' : ''} waiting for your confirmation
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleReviewScore(visibleMatches[0].id)}
              className="bg-white text-yellow-700 px-6 py-2 rounded-lg font-bold hover:bg-yellow-50 transition-colors"
            >
              Review Now
            </button>
          </div>
        </div>

        {/* List of pending matches */}
        <div className="mt-3 space-y-2">
          {visibleMatches.map(match => (
            <div key={match.id} className="bg-white/10 backdrop-blur rounded-lg p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white font-medium">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </div>
                <div className="text-yellow-100 text-sm">
                  {match.season.league.name} • {match.season.name}
                  {match.scheduledAt && ` • ${new Date(match.scheduledAt).toLocaleDateString()}`}
                </div>
                {match.homeScore !== null && match.awayScore !== null && (
                  <div className="text-white font-bold mt-1">
                    Reported Score: {match.homeScore} - {match.awayScore}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReviewScore(match.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium text-sm"
                >
                  ✅ Review
                </button>
                <button
                  onClick={() => handleDismiss(match.id)}
                  className="text-white hover:text-yellow-200 px-2"
                  title="Dismiss for now"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
