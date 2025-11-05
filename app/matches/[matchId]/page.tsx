"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AddToCalendar from '@/app/components/AddToCalendar'
import ScoreSubmissionForm from '@/app/components/ScoreSubmissionForm'
import ScoreConfirmationCard from '@/app/components/ScoreConfirmationCard'
import MatchEditRequestForm from '@/app/components/MatchEditRequestForm'
import MatchEditRequestCard from '@/app/components/MatchEditRequestCard'

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params?.matchId as string
  const [match, setMatch] = useState<any>(null)
  const [availabilities, setAvailabilities] = useState<any[]>([])
  const [myAvailability, setMyAvailability] = useState<string>('MAYBE')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [assignments, setAssignments] = useState<any[]>([])
  const [assigning, setAssigning] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    opponentName: '',
    scheduledAt: '',
    location: '',
    requiredPlayers: ''
  })
  const [scoreSubmissions, setScoreSubmissions] = useState<any[]>([])
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [isProcessingConfirmation, setIsProcessingConfirmation] = useState(false)
  const [canSubmitScore, setCanSubmitScore] = useState(false)
  const [canConfirmScore, setCanConfirmScore] = useState(false)
  const [canEditSubmission, setCanEditSubmission] = useState(false)
  const [showEditRequestForm, setShowEditRequestForm] = useState(false)
  const [editRequests, setEditRequests] = useState<any[]>([])
  const [isSubmittingEditRequest, setIsSubmittingEditRequest] = useState(false)
  const [isProcessingEditRequest, setIsProcessingEditRequest] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLeagueManager, setIsLeagueManager] = useState(false)
  const [isExternalMatch, setIsExternalMatch] = useState(false)
  const [showScoreUpdateForm, setShowScoreUpdateForm] = useState(false)

  useEffect(() => {
    if (!matchId) return

    // Load match details
    fetch(`/api/matches?matchId=${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        const matches = d.matches || []
        const foundMatch = matches.find((m: any) => m.id === matchId)
        if (foundMatch) {
          setMatch(foundMatch)
          setEditForm({
            opponentName: foundMatch.opponentName || '',
            scheduledAt: foundMatch.scheduledAt ? new Date(foundMatch.scheduledAt).toISOString().slice(0, 16) : '',
            location: foundMatch.location || '',
            requiredPlayers: foundMatch.requiredPlayers ? foundMatch.requiredPlayers.toString() : ''
          })
        }
      })

    // Load availabilities
    fetch(`/api/matches/${matchId}/availability`)
      .then((r) => r.json())
      .then((d) => {
        const avails = d.availabilities || []
        const adminStatus = d.isAdmin || false
        setAvailabilities(avails)
        setIsAdmin(adminStatus)
        
        // Find current user's availability
        if (avails.length > 0) {
          // If not admin, there's only one availability (user's own)
          // If admin, find the current user's availability or use first as default
          const myAvail = avails[0]
          if (myAvail) {
            setMyAvailability(myAvail.status)
            setNotes(myAvail.notes || '')
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Load assignments (all members can see confirmed attendees)
    fetch(`/api/matches/${matchId}/assignments`)
      .then((r) => r.json())
      .then((d) => {
        setAssignments(d.assignments || [])
      })
      .catch(() => {})

    // Load score submissions for past matches  
    fetch(`/api/matches/${matchId}/scores`)
      .then((r) => r.json())
      .then((d) => {
        setScoreSubmissions(d.scoreSubmissions || [])
        setCanSubmitScore(d.canSubmit || false)
        setCanConfirmScore(d.canConfirm || false)
        setCanEditSubmission(d.canEditSubmission || false)
        setIsExternalMatch(d.isExternalMatch || false)
      })
      .catch(() => {})

    // Load current user info and edit requests
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch(`/api/matches/${matchId}/edit-request`).then(r => r.json())
    ]).then(([profileData, editRequestData]) => {
      if (profileData.user) {
        setCurrentUser(profileData.user)
      }
      
      if (editRequestData.requests) {
        setEditRequests(editRequestData.requests)
        setIsLeagueManager(editRequestData.isLeagueManager || false)
      }
    }).catch(() => {})
  }, [matchId])

  async function updateAvailability(status: string) {
    try {
      const res = await fetch(`/api/matches/${matchId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })

      if (res.ok) {
        setMyAvailability(status)
        // Reload availabilities
        const avails = await fetch(`/api/matches/${matchId}/availability`).then((r) => r.json())
        setAvailabilities(avails.availabilities || [])
      }
    } catch (e) {
      // ignore
    }
  }

  async function assignPlayer(userId: string) {
    setAssigning(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        // Reload assignments
        const data = await fetch(`/api/matches/${matchId}/assignments`).then((r) => r.json())
        setAssignments(data.assignments || [])
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to assign player')
      }
    } catch (e) {
      alert('Failed to assign player')
    } finally {
      setAssigning(false)
    }
  }

  async function removeAssignment(assignmentId: string) {
    if (!confirm('Are you sure you want to remove this assignment? The player will need to be reassigned.')) {
      return
    }

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Reload assignments
        const data = await fetch(`/api/matches/${matchId}/assignments`).then((r) => r.json())
        setAssignments(data.assignments || [])
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to remove assignment')
      }
    } catch (e) {
      alert('Failed to remove assignment')
    }
  }

  async function updateMatch() {
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentName: editForm.opponentName,
          scheduledAt: editForm.scheduledAt,
          location: editForm.location,
          requiredPlayers: editForm.requiredPlayers ? parseInt(editForm.requiredPlayers) : null
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMatch(data.match)
        setIsEditing(false)
        alert('Match updated successfully')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update match')
      }
    } catch (e) {
      alert('Failed to update match')
    }
  }

  async function deleteMatch() {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('Match deleted successfully')
        router.push('/matches')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete match')
      }
    } catch (e) {
      alert('Failed to delete match')
    }
  }

  async function submitScore(homeScore: number, awayScore: number, notes?: string) {
    setIsSubmittingScore(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScore, awayScore, notes }),
      })

      if (res.ok) {
        // Get the response data first for success message
        const result = await res.json()
        
        // Reload score submissions and match data
        const [scoresData, matchData] = await Promise.all([
          fetch(`/api/matches/${matchId}/scores`).then((r) => r.json()),
          fetch(`/api/matches?matchId=${matchId}`).then((r) => r.json())
        ])
        
        setScoreSubmissions(scoresData.scoreSubmissions || [])
        setCanSubmitScore(scoresData.canSubmit || false)
        setCanConfirmScore(scoresData.canConfirm || false)
        setCanEditSubmission(scoresData.canEditSubmission || false)
        setIsExternalMatch(scoresData.isExternalMatch || false)
        
        // Update match data to reflect new scores
        const matches = matchData.matches || []
        const foundMatch = matches.find((m: any) => m.id === matchId)
        if (foundMatch) {
          setMatch(foundMatch)
        }
        
        // Show appropriate success message
        if (isExternalMatch) {
          alert('Score updated successfully!')
        } else {
          if (result.isUpdate) {
            alert('Score updated successfully! The opposing team will be notified of the changes.')
          } else {
            alert('Score submitted successfully! The opposing team will be notified to confirm.')
          }
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to submit score')
      }
    } catch (e) {
      alert('Failed to submit score')
    } finally {
      setIsSubmittingScore(false)
    }
  }

  async function confirmScore(submissionId: string) {
    setIsProcessingConfirmation(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/scores/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      })

      if (res.ok) {
        // Reload score submissions and match data
        const [scoresData, matchData] = await Promise.all([
          fetch(`/api/matches/${matchId}/scores`).then((r) => r.json()),
          fetch(`/api/matches?matchId=${matchId}`).then((r) => r.json())
        ])
        
        setScoreSubmissions(scoresData.scoreSubmissions || [])
        setCanSubmitScore(scoresData.canSubmit || false)
        setCanConfirmScore(scoresData.canConfirm || false)
        setCanEditSubmission(scoresData.canEditSubmission || false)
        
        const matches = matchData.matches || []
        const foundMatch = matches.find((m: any) => m.id === matchId)
        if (foundMatch) {
          setMatch(foundMatch)
        }
        
        alert('Score confirmed successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to confirm score')
      }
    } catch (e) {
      alert('Failed to confirm score')
    } finally {
      setIsProcessingConfirmation(false)
    }
  }

  async function disputeScore(submissionId: string, reason: string) {
    setIsProcessingConfirmation(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/scores/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispute', reason }),
      })

      if (res.ok) {
        // Reload score submissions
        const data = await fetch(`/api/matches/${matchId}/scores`).then((r) => r.json())
        setScoreSubmissions(data.scoreSubmissions || [])
        setCanSubmitScore(data.canSubmit || false)
        setCanConfirmScore(data.canConfirm || false)
        setCanEditSubmission(data.canEditSubmission || false)
        alert('Score dispute submitted. League administrators have been notified.')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to dispute score')
      }
    } catch (e) {
      alert('Failed to dispute score')
    } finally {
      setIsProcessingConfirmation(false)
    }
  }

  // Load edit requests when component mounts
  useEffect(() => {
    if (!matchId) return

    // Load current user and check league manager status
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        setCurrentUser(d.user)
        // Check if user is league manager (will be determined when match is loaded)
      })
      .catch(() => {})

    // Load edit requests
    loadEditRequests()
  }, [matchId])

  // Check if user is league manager when match is loaded
  useEffect(() => {
    if (match && match.leagueId && currentUser) {
      fetch(`/api/leagues/${match.leagueId}`)
        .then((r) => r.json())
        .then((d) => {
          setIsLeagueManager(d.league?.creatorId === currentUser.id)
        })
        .catch(() => {})
    }
  }, [match, currentUser])

  async function loadEditRequests() {
    try {
      const res = await fetch(`/api/matches/${matchId}/edit-request`)
      if (res.ok) {
        const data = await res.json()
        setEditRequests(data.editRequests || [])
      }
    } catch (e) {
      console.error('Failed to load edit requests:', e)
    }
  }

  async function submitEditRequest(data: {
    newScheduledAt?: string
    newLocation?: string
    changeReason: string
  }) {
    setIsSubmittingEditRequest(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/edit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setShowEditRequestForm(false)
        await loadEditRequests()
        alert('Edit request submitted! The league manager will be notified.')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to submit edit request')
      }
    } catch (e) {
      alert('Failed to submit edit request')
    } finally {
      setIsSubmittingEditRequest(false)
    }
  }

  async function approveEditRequest(requestId: string, reason?: string) {
    setIsProcessingEditRequest(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/edit-request/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', reason }),
      })

      if (res.ok) {
        await Promise.all([loadEditRequests(), loadMatch()])
        alert('Edit request approved! Changes have been applied and teams notified.')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to approve edit request')
      }
    } catch (e) {
      alert('Failed to approve edit request')
    } finally {
      setIsProcessingEditRequest(false)
    }
  }

  async function denyEditRequest(requestId: string, reason: string) {
    setIsProcessingEditRequest(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/edit-request/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', reason }),
      })

      if (res.ok) {
        await loadEditRequests()
        alert('Edit request denied. Teams have been notified.')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to deny edit request')
      }
    } catch (e) {
      alert('Failed to deny edit request')
    } finally {
      setIsProcessingEditRequest(false)
    }
  }

  async function cancelEditRequest(requestId: string) {
    setIsProcessingEditRequest(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/edit-request/${requestId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadEditRequests()
        alert('Edit request cancelled.')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to cancel edit request')
      }
    } catch (e) {
      alert('Failed to cancel edit request')
    } finally {
      setIsProcessingEditRequest(false)
    }
  }

  async function loadMatch() {
    // Reload match details
    try {
      const res = await fetch(`/api/matches?matchId=${matchId}`)
      const data = await res.json()
      const matches = data.matches || []
      const foundMatch = matches.find((m: any) => m.id === matchId)
      if (foundMatch) {
        setMatch(foundMatch)
        setEditForm({
          opponentName: foundMatch.opponentName || '',
          scheduledAt: foundMatch.scheduledAt ? new Date(foundMatch.scheduledAt).toISOString().slice(0, 16) : '',
          location: foundMatch.location || '',
          requiredPlayers: foundMatch.requiredPlayers ? foundMatch.requiredPlayers.toString() : ''
        })
      }
    } catch (e) {
      console.error('Failed to reload match:', e)
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading match details...</div>
      </main>
    )
  }

  if (!match) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Match not found</p>
          <Link href="/matches" className="text-blue-400 hover:text-blue-300 hover:underline">
            ← Back to Matches
          </Link>
        </div>
      </main>
    )
  }

  const date = new Date(match.scheduledAt)
  const isPast = date < new Date()

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/matches" className="text-blue-400 hover:text-blue-300 hover:underline text-sm">
          ← Back to Matches
        </Link>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        {!isEditing ? (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">
                  vs {match.opponentName || 'TBD'}
                </h1>
                {match.homeScore !== null && match.awayScore !== null && (
                  <div className="text-2xl font-semibold text-blue-400">
                    {match.homeScore} - {match.awayScore}
                  </div>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <div className="text-sm text-gray-400">
                  {isPast ? 'Completed' : 'Upcoming'}
                </div>
                {isAdmin && !isPast && (
                  <>
                    {match.leagueId ? (
                      <button
                        onClick={() => setShowEditRequestForm(true)}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 active:bg-orange-800 active:scale-95 transition-all"
                      >
                        Request Edit
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={deleteMatch}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-300 mb-1">Date & Time</div>
                <div className="text-gray-400">📅 {date.toLocaleDateString()}</div>
                <div className="text-gray-400">🕐 {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              {match.location && (
                <div>
                  <div className="font-medium text-gray-300 mb-1">Location</div>
                  <div className="text-gray-400">📍 {match.location}</div>
                </div>
              )}
            </div>

            {!isPast && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <AddToCalendar
                  title={`Match vs ${match.opponentName || 'TBD'}`}
                  description={`${match.team?.name || 'Team'} match against ${match.opponentName || 'TBD'}`}
                  location={match.location || ''}
                  startTime={date}
                  endTime={new Date(date.getTime() + 2 * 60 * 60 * 1000)} // 2 hours duration
                  url={typeof window !== 'undefined' ? window.location.href : ''}
                />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Match Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Opponent Name</label>
              <input
                type="text"
                value={editForm.opponentName}
                onChange={(e) => setEditForm({ ...editForm, opponentName: e.target.value })}
                className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter opponent name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Date & Time</label>
              <input
                type="datetime-local"
                value={editForm.scheduledAt}
                onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
                className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Location (optional)</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Required Players (optional)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={editForm.requiredPlayers}
                onChange={(e) => setEditForm({ ...editForm, requiredPlayers: e.target.value })}
                className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 11"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={updateMatch}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Request Form Modal */}
      {showEditRequestForm && match.leagueId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Request Match Edit</h2>
                <button
                  onClick={() => setShowEditRequestForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <MatchEditRequestForm
                matchId={matchId}
                currentScheduledAt={new Date(match.scheduledAt)}
                currentLocation={match.location}
                onSubmit={submitEditRequest}
                onCancel={() => setShowEditRequestForm(false)}
                isSubmitting={isSubmittingEditRequest}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Requests Section - Show for league matches */}
      {match.leagueId && editRequests.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Match Edit Requests</h2>
          <p className="text-sm text-gray-400 mb-4">
            {isLeagueManager 
              ? "As the league manager, you can approve or deny edit requests from team administrators."
              : "Edit requests for this league match are shown below."}
          </p>
          
          <div className="space-y-4">
            {editRequests.map((request) => (
              <MatchEditRequestCard
                key={request.id}
                request={request}
                currentUserId={currentUser?.id}
                isLeagueManager={isLeagueManager}
                onApprove={approveEditRequest}
                onDeny={denyEditRequest}
                onCancel={cancelEditRequest}
                isProcessing={isProcessingEditRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* Score Management Section */}
      {isPast && (match.leagueId || isExternalMatch) && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Match Score</h2>
          
          {/* Display existing confirmed score */}
          {match.homeScore !== null && match.awayScore !== null && (
            <div className="mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  <span className={`${
                    match.homeScore > match.awayScore 
                      ? 'text-green-400' 
                      : match.homeScore < match.awayScore 
                        ? 'text-red-400' 
                        : 'text-yellow-400'
                  }`}>
                    {match.homeScore} - {match.awayScore}
                  </span>
                </div>
                <div className="mb-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    match.homeScore > match.awayScore
                      ? 'bg-green-900/30 text-green-400 border border-green-400/30'
                      : match.homeScore < match.awayScore
                        ? 'bg-red-900/30 text-red-400 border border-red-400/30'
                        : 'bg-yellow-900/30 text-yellow-400 border border-yellow-400/30'
                  }`}>
                    {match.homeScore > match.awayScore
                      ? '🎉 Victory!'
                      : match.homeScore < match.awayScore
                        ? '😞 Defeat'
                        : '🤝 Draw'}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {isExternalMatch ? 'Final Score' : 'Final Score (Confirmed)'}
                </div>
              </div>
              
              {/* Update Score button for external matches */}
              {isExternalMatch && canSubmitScore && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowScoreUpdateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update Score
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Score submission form for team admins */}
          {canSubmitScore && (match.homeScore === null || match.awayScore === null) && !showScoreUpdateForm && (
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="font-medium text-white mb-2">
                  {isExternalMatch ? 'Input Match Score' : 
                   canEditSubmission ? 'Submit/Update Match Score' : 'Submit Match Score'}
                </h3>
                <p className="text-sm text-gray-400">
                  {isExternalMatch 
                    ? 'As a team administrator, you can input the score for this external match.'
                    : canEditSubmission
                    ? 'As a team administrator, you can submit the score for this league match. You can also edit your pending submission using the form below or the edit button on your submission card.'
                    : 'As a team administrator, you can submit the score for this league match. The opposing team administrator will need to confirm it.'
                  }
                </p>
              </div>
              <ScoreSubmissionForm
                matchId={matchId}
                homeTeamName={match.team?.name || 'Home Team'}
                awayTeamName={match.opponentTeam?.name || match.opponentName || 'Away Team'}
                onSubmit={submitScore}
                isSubmitting={isSubmittingScore}
                initialHomeScore={canEditSubmission && scoreSubmissions.length > 0 ? scoreSubmissions[0].homeScore : undefined}
                initialAwayScore={canEditSubmission && scoreSubmissions.length > 0 ? scoreSubmissions[0].awayScore : undefined}
                isUpdate={canEditSubmission}
              />
            </div>
          )}

          {/* Score update form for external matches with existing scores */}
          {isExternalMatch && showScoreUpdateForm && match.homeScore !== null && match.awayScore !== null && (
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="font-medium text-white mb-2">Update Match Score</h3>
                <p className="text-sm text-gray-400">
                  As a team administrator, you can update the score for this external match.
                </p>
              </div>
              <ScoreSubmissionForm
                matchId={matchId}
                homeTeamName={match.team?.name || 'Home Team'}
                awayTeamName={match.opponentTeam?.name || match.opponentName || 'Away Team'}
                onSubmit={async (homeScore, awayScore, notes) => {
                  await submitScore(homeScore, awayScore, notes)
                  setShowScoreUpdateForm(false)
                }}
                isSubmitting={isSubmittingScore}
                initialHomeScore={match.homeScore}
                initialAwayScore={match.awayScore}
                isUpdate={true}
              />
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowScoreUpdateForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Score confirmation cards for pending submissions */}
          {scoreSubmissions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-white">Score Submissions</h3>
              {scoreSubmissions.map((submission) => (
                <ScoreConfirmationCard
                  key={submission.id}
                  submission={submission}
                  homeTeamName={match.team?.name || 'Home Team'}
                  awayTeamName={match.opponentName || 'Away Team'}
                  onConfirm={confirmScore}
                  onDispute={disputeScore}
                  onEdit={submission.canEdit ? submitScore : undefined}
                  isProcessing={isProcessingConfirmation}
                  canConfirm={canConfirmScore}
                />
              ))}
            </div>
          )}

          {/* Help text for non-admins */}
          {!canSubmitScore && !canConfirmScore && scoreSubmissions.length === 0 && match.homeScore === null && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No score submitted yet</div>
              <div className="text-sm text-gray-500">
                Only team administrators can {isExternalMatch ? 'input scores for external matches' : 'submit scores for league matches'}
              </div>
            </div>
          )}
        </div>
      )}

      {!isPast && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Your Availability</h2>
          
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => updateAvailability('AVAILABLE')}
              className={`flex-1 px-4 py-3 rounded font-medium transition-all active:scale-95 ${
                myAvailability === 'AVAILABLE'
                  ? 'bg-green-600 text-white active:bg-green-700'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600 active:bg-slate-500'
              }`}
            >
              ✓ Available
            </button>
            <button
              onClick={() => updateAvailability('MAYBE')}
              className={`flex-1 px-4 py-3 rounded font-medium transition-all active:scale-95 ${
                myAvailability === 'MAYBE'
                  ? 'bg-yellow-600 text-white active:bg-yellow-700'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600 active:bg-slate-500'
              }`}
            >
              ? Maybe
            </button>
            <button
              onClick={() => updateAvailability('UNAVAILABLE')}
              className={`flex-1 px-4 py-3 rounded font-medium transition-all active:scale-95 ${
                myAvailability === 'UNAVAILABLE'
                  ? 'bg-red-600 text-white active:bg-red-700'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600 active:bg-slate-500'
              }`}
            >
              ✗ Unavailable
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Notes (optional)</label>
            <textarea
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Will be 15 minutes late"
            />
            <button
              onClick={() => updateAvailability(myAvailability)}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 hover:underline active:text-blue-200 active:scale-95 transition-all"
            >
              Update notes
            </button>
          </div>
        </div>
      )}

      {isAdmin && availabilities.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Team Availability Summary</h2>
          <p className="text-sm text-gray-400 mb-4">
            As a team admin, you can see all team members' availability for this match.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-900/30 border border-green-700 rounded p-3">
              <div className="text-2xl font-bold text-green-400">
                {availabilities.filter((a) => a.status === 'AVAILABLE').length}
              </div>
              <div className="text-sm text-green-300">Available</div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3">
              <div className="text-2xl font-bold text-yellow-400">
                {availabilities.filter((a) => a.status === 'MAYBE').length}
              </div>
              <div className="text-sm text-yellow-300">Maybe</div>
            </div>
            <div className="bg-red-900/30 border border-red-700 rounded p-3">
              <div className="text-2xl font-bold text-red-400">
                {availabilities.filter((a) => a.status === 'UNAVAILABLE').length}
              </div>
              <div className="text-sm text-red-300">Unavailable</div>
            </div>
          </div>

          <div className="space-y-2">
            {availabilities.map((avail) => (
              <div key={avail.id} className="flex justify-between items-center p-3 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      avail.status === 'AVAILABLE'
                        ? 'bg-green-500'
                        : avail.status === 'MAYBE'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-white">
                      {avail.user?.name || avail.user?.email || `User #${avail.userId.slice(-6)}`}
                    </div>
                    {avail.notes && <div className="text-sm text-gray-400">{avail.notes}</div>}
                  </div>
                </div>
                <div className="text-sm text-gray-400 capitalize">
                  {avail.status.toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && availabilities.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Your Availability Status</h2>
          <p className="text-sm text-gray-400 mb-4">
            Your availability has been submitted. Only you and team admins can see your status.
          </p>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  myAvailability === 'AVAILABLE'
                    ? 'bg-green-500'
                    : myAvailability === 'MAYBE'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <div className="font-medium text-white capitalize">
                {myAvailability.toLowerCase()}
              </div>
            </div>
            {notes && (
              <div className="text-sm text-gray-400 mt-2">
                <span className="font-medium">Note:</span> {notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmed Attendees Section - Visible to all team members */}
      {assignments.filter((a) => a.confirmed).length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Confirmed Attendees ({assignments.filter((a) => a.confirmed).length})
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            These players have confirmed they will attend the match.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {assignments
              .filter((a) => a.confirmed)
              .map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 p-3 rounded bg-green-900/20 border border-green-700"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    <div className="font-medium text-white truncate">
                      {assignment.user?.name || assignment.user?.email || `User #${assignment.userId.slice(-6)}`}
                    </div>
                  </div>
                  {isAdmin && !isPast && (
                    <button
                      onClick={() => removeAssignment(assignment.id)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded hover:bg-red-700 transition-all active:scale-95 active:bg-red-800 text-xs"
                      title="Remove from match"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {isAdmin && !isPast && availabilities.filter((a) => a.status === 'AVAILABLE').length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Assign Players to Match</h2>
          <p className="text-sm text-gray-400 mb-4">
            Assign available players to this match. They will receive a notification and must confirm their attendance.
          </p>

          <div className="space-y-2">
            {availabilities
              .filter((a) => a.status === 'AVAILABLE')
              .map((avail) => {
                const isAssigned = assignments.some((assign) => assign.userId === avail.userId)
                const assignment = assignments.find((assign) => assign.userId === avail.userId)
                
                return (
                  <div
                    key={avail.id}
                    className="flex justify-between items-center p-3 rounded bg-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <div>
                        <div className="font-medium text-white">
                          {avail.user?.name || avail.user?.email || `User #${avail.userId.slice(-6)}`}
                        </div>
                        {avail.notes && (
                          <div className="text-sm text-gray-400">{avail.notes}</div>
                        )}
                        {isAssigned && assignment && (
                          <div className="text-xs mt-1">
                            {assignment.confirmed ? (
                              <span className="text-green-400">✓ Confirmed</span>
                            ) : (
                              <span className="text-yellow-400">⏳ Pending confirmation</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isAssigned ? (
                        <button
                          onClick={() => assignPlayer(avail.userId)}
                          disabled={assigning}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all active:scale-95 active:bg-blue-800"
                        >
                          {assigning ? 'Assigning...' : 'Assign'}
                        </button>
                      ) : (
                        <>
                          <div className="px-4 py-2 bg-slate-600 text-gray-300 rounded">
                            Assigned
                          </div>
                          <button
                            onClick={() => removeAssignment(assignment!.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-all active:scale-95 active:bg-red-800"
                            title="Remove assignment"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {assignments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-600">
              <div className="text-sm text-gray-400">
                <span className="font-medium text-white">{assignments.length}</span> player{assignments.length !== 1 ? 's' : ''} assigned •{' '}
                <span className="font-medium text-green-400">{assignments.filter((a) => a.confirmed).length}</span> confirmed •{' '}
                <span className="font-medium text-yellow-400">{assignments.filter((a) => !a.confirmed).length}</span> pending
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
