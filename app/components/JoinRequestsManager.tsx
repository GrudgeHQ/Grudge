import { useState, useEffect } from 'react'

interface JoinRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'DENIED'
  createdAt: string
  team: {
    id: string
    name: string
    sport: string
    memberCount: number
  }
  requestedBy: {
    id: string
    name: string
    email: string
  }
}

interface JoinRequestsManagerProps {
  leagueId: string
  leagueName: string
}

export default function JoinRequestsManager({ leagueId, leagueName }: JoinRequestsManagerProps) {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadJoinRequests()
  }, [leagueId])

  const loadJoinRequests = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/leagues/${leagueId}/join-requests`)
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Only the League Manager can view join requests')
          return
        }
        throw new Error('Failed to load join requests')
      }
      
      const data = await res.json()
      setJoinRequests(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = async (requestId: string, action: 'approve' | 'deny') => {
    try {
      setProcessing(requestId)
      setError('')
      
      const res = await fetch(`/api/leagues/${leagueId}/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Failed to ${action} request`)
      }
      
      const data = await res.json()
      
      // Remove the processed request from the list
      setJoinRequests(prev => prev.filter(req => req.id !== requestId))
      
      // Show success message
      alert(`Join request ${action}d successfully!`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-green-500/30">
        <h2 className="text-xl font-bold mb-4 text-green-400">Join Requests</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          <span className="ml-3 text-gray-400">Loading join requests...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-green-500/30">
      <h2 className="text-xl font-bold mb-4 text-green-400">Join Requests</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-100">
          {error}
        </div>
      )}
      
      {joinRequests.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-400">No pending join requests</p>
          <p className="text-sm text-gray-500 mt-2">
            Teams that request to join "{leagueName}" will appear here for your approval.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {joinRequests.map((request) => (
            <div key={request.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{request.team.name}</h3>
                      <p className="text-sm text-gray-400">{request.team.sport} • {request.team.memberCount} members</p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-300">
                      Requested by: <span className="text-white font-medium">{request.requestedBy.name}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleRequest(request.id, 'approve')}
                    disabled={processing === request.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2"
                  >
                    {processing === request.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Approve
                  </button>
                  
                  <button
                    onClick={() => handleRequest(request.id, 'deny')}
                    disabled={processing === request.id}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2"
                  >
                    {processing === request.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    Deny
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded">
        <p className="text-sm text-green-100">
          <strong>As League Manager:</strong> You can approve or deny team requests to join your league. 
          Approved teams will be automatically added to the league and notified of their acceptance.
        </p>
      </div>
    </div>
  )
}
