import { useState, useEffect } from 'react'

interface TeamJoinRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'DENIED'
  requestedAt: string
  requestedBy: {
    id: string
    name: string
    email: string
    phone?: string
    bio?: string
    createdAt: string
  }
}

interface TeamJoinRequestsManagerProps {
  teamId: string
  teamName: string
}

export default function TeamJoinRequestsManager({ teamId, teamName }: TeamJoinRequestsManagerProps) {
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadJoinRequests()
  }, [teamId])

  const loadJoinRequests = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/teams/${teamId}/join-requests`)
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Only team administrators can view join requests')
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
      
      const res = await fetch(`/api/teams/join-requests/${requestId}/respond`, {
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
      const actionText = action === 'approve' ? 'approved' : 'denied'
      alert(`Join request ${actionText} successfully! ${data.requestedUser} has been notified.`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-purple-500/30">
        <h2 className="text-xl font-bold mb-4 text-purple-400">Team Join Requests</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-gray-400">Loading join requests...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-purple-500/30">
      <h2 className="text-xl font-bold mb-4 text-purple-400">Team Join Requests</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-100">
          {error}
        </div>
      )}
      
      {joinRequests.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <p className="text-gray-400">No pending join requests</p>
          <p className="text-sm text-gray-500 mt-2">
            Users who request to join "{teamName}" will appear here for your approval.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {joinRequests.map((request) => (
            <div key={request.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {(request.requestedBy.name || request.requestedBy.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {request.requestedBy.name || 'Unnamed User'}
                      </h3>
                      <p className="text-sm text-gray-400">{request.requestedBy.email}</p>
                      {request.requestedBy.phone && (
                        <p className="text-sm text-gray-400">{request.requestedBy.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  {request.requestedBy.bio && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium">Bio:</span> {request.requestedBy.bio}
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-400">
                      Requested on: {new Date(request.requestedAt).toLocaleDateString()} at {new Date(request.requestedAt).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Member since: {new Date(request.requestedBy.createdAt).toLocaleDateString()}
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
      
      <div className="mt-4 p-3 bg-purple-500/20 border border-purple-500 rounded">
        <p className="text-sm text-purple-100">
          <strong>Team Administrator:</strong> You can approve or deny user requests to join your team. 
          Approved users will be automatically added as team members and notified of their acceptance.
        </p>
      </div>
    </div>
  )
}
