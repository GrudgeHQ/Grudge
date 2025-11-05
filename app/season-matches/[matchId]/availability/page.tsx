'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface MatchWithAvailability {
  id: string
  scheduledAt: string | null
  location: string | null
  description: string | null
  notes: string | null
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  season: {
    name: string
    league: { name: string }
  }
  availabilityRequests: {
    id: string
    status: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE'
    notes?: string
    respondedAt?: string
    user: {
      id: string
      name: string | null
      email: string
    }
    team: {
      id: string
      name: string
    }
  }[]
}

interface AvailabilityPageProps {
  params: Promise<{ matchId: string }>
}

export default function MatchAvailabilityPage({ params }: AvailabilityPageProps) {
  const [match, setMatch] = useState<MatchWithAvailability | null>(null)
  const [loading, setLoading] = useState(true)
  const [userResponse, setUserResponse] = useState({
    status: 'MAYBE' as 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setMatchId(resolvedParams.matchId)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (sessionStatus === 'loading' || !matchId) return
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }
    fetchMatch()
  }, [matchId, session, sessionStatus])

  const fetchMatch = async () => {
    if (!session?.user?.email || !matchId) {
      console.log('No session or matchId available, waiting...')
      return
    }

    try {
      const response = await fetch(`/api/season-matches/${matchId}/availability`)
      const contentType = response.headers.get('content-type') || ''
      if (response.ok) {
        const data = contentType.includes('application/json') ? await response.json() : null
        if (!data || !data.match) {
          throw new Error('Invalid response from server')
        }
        setMatch(data.match)
        
        // Find current user's response if it exists
        const userAvailability = data.match.availabilityRequests.find(
          (req: any) => req.user.email === session.user?.email
        )
        
        if (userAvailability) {
          setUserResponse({
            status: userAvailability.status,
            notes: userAvailability.notes || ''
          })
        }
      } else {
        let errorMsg = ''
        if (contentType.includes('application/json')) {
          try {
            const err = await response.json()
            errorMsg = err?.error || ''
          } catch {}
        } else {
          try {
            const text = await response.text()
            errorMsg = text?.slice(0, 200)
          } catch {}
        }
        alert(errorMsg || 'Failed to load match details')
        router.back()
      }
    } catch (error) {
      console.error('Error fetching match:', error)
      alert('Failed to load match details')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAvailability = async () => {
    if (!matchId) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/season-matches/${matchId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userResponse)
      })

      if (response.ok) {
        alert('Availability updated successfully!')
        fetchMatch() // Refresh the data
      } else {
        const ct = response.headers.get('content-type') || ''
        let errorMsg = ''
        if (ct.includes('application/json')) {
          try {
            const err = await response.json()
            errorMsg = err?.error || ''
          } catch {}
        } else {
          try {
            const text = await response.text()
            errorMsg = text?.slice(0, 200)
          } catch {}
        }
        alert(errorMsg || 'Failed to update availability')
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      alert('Failed to update availability')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'MAYBE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'UNAVAILABLE': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-slate-600/20 text-slate-400 border-slate-600/30'
    }
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">Match Not Found</h1>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Get current user's email from session
  const userEmail = session?.user?.email || ''

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 mb-4"
          >
            ← Back
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Match Availability
          </h1>
          <p className="text-slate-400">
            {match.season.league.name} - {match.season.name}
          </p>
        </div>

        {/* Match Details */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {match.scheduledAt && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-1">Date & Time</h3>
                <p className="text-white">
                  {new Date(match.scheduledAt).toLocaleDateString()}{' '}
                  at{' '}
                  {new Date(match.scheduledAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            )}
            
            {match.location && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-1">Location</h3>
                <p className="text-white">📍 {match.location}</p>
              </div>
            )}
            
            {match.description && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-slate-300 mb-1">Description</h3>
                <p className="text-white">{match.description}</p>
              </div>
            )}
            
            {match.notes && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-slate-300 mb-1">Notes</h3>
                <p className="text-slate-400">{match.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Your Availability Response */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Availability</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Availability Status
              </label>
              <div className="flex space-x-4">
                {[
                  { value: 'AVAILABLE', label: 'Available', color: 'green' },
                  { value: 'MAYBE', label: 'Maybe', color: 'yellow' },
                  { value: 'UNAVAILABLE', label: 'Unavailable', color: 'red' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setUserResponse(prev => ({ ...prev, status: option.value as any }))}
                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                      userResponse.status === option.value
                        ? option.color === 'green' 
                          ? 'bg-green-500/20 text-green-400 border-green-500'
                          : option.color === 'yellow'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                          : 'bg-red-500/20 text-red-400 border-red-500'
                        : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={userResponse.notes}
                onChange={(e) => setUserResponse(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about your availability..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            
            <button
              onClick={handleSubmitAvailability}
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Availability'}
            </button>
          </div>
        </div>

        {/* Team Responses */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Team Responses ({match.availabilityRequests.length})
          </h3>
          
          <div className="space-y-3">
            {match.availabilityRequests.map((response) => (
              <div key={response.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <div>
                  <div className="font-medium text-white">
                    {response.user.name || response.user.email}
                  </div>
                  <div className="text-sm text-slate-400">
                    {response.team.name}
                  </div>
                  {response.notes && (
                    <div className="text-sm text-slate-300 mt-1">
                      "{response.notes}"
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(response.status)}`}>
                    {response.status}
                  </span>
                  {response.respondedAt && (
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(response.respondedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {match.availabilityRequests.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No responses yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}