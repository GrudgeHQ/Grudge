"use client"
import React, { useEffect, useState } from 'react'
import { useTeamFilter } from '../context/TeamFilterContext'

export default function AssignmentsPage() {
  const { selectedTeamId } = useTeamFilter()
  const [assignments, setAssignments] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    // Load teams
    fetch('/api/teams')
      .then((r) => r.json())
      .then((d) => {
        setTeams(d.teams || [])
      })
      .catch(() => {})

    // Load assignments
    fetch('/api/assignments')
      .then((r) => r.json())
      .then((d) => { 
        setAssignments(d.assignments || [])
        setLoading(false) 
      })

    // Mark assignment notifications as read when user visits this page
    fetch('/api/notifications/mark-assignments-read', { method: 'POST' })
      .catch(() => {})
  }, [])

  async function confirm(id: string) {
    const res = await fetch(`/api/assignments/${id}/confirm`, { method: 'POST' })
    if (res.ok) {
      setAssignments((a) => a.map((it) => it.id === id ? { ...it, confirmed: true } : it))
    } else {
      alert('Failed to confirm')
    }
  }

  async function clearAllAssignments() {
    const pendingCount = pendingAssignments.length
    const futureAssignments = filteredAssignments.filter(a => 
      new Date(a.match?.scheduledAt) >= new Date()
    )
    
    if (pendingCount > 0) {
      alert(`You have ${pendingCount} pending assignment(s) that need confirmation. Please confirm them first before clearing your assignments.`)
      return
    }

    if (futureAssignments.length > 0) {
      alert(`You have ${futureAssignments.length} assignment(s) for future matches. Contact your team admin to be removed from specific matches.`)
      return
    }

    const pastAssignments = filteredAssignments.filter(a => 
      a.confirmed && new Date(a.match?.scheduledAt) < new Date()
    )

    if (pastAssignments.length === 0) {
      alert('No past assignments to clear.')
      return
    }

    if (!confirm(`Are you sure you want to clear ${pastAssignments.length} past assignment(s)? This action cannot be undone.`)) {
      return
    }

    setClearing(true)
    try {
      const res = await fetch('/api/assignments/clear', { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        // Reload assignments to reflect changes
        const updatedRes = await fetch('/api/assignments')
        const updatedData = await updatedRes.json()
        setAssignments(updatedData.assignments || [])
        alert(`Successfully cleared ${data.deletedCount} past assignment(s).`)
      } else {
        alert(data.error || 'Failed to clear assignments')
      }
    } catch (error) {
      alert('An error occurred while clearing assignments')
    } finally {
      setClearing(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-300">Loading...</div>

  // Filter assignments by selected team
  const filteredAssignments = selectedTeamId === 'all' 
    ? assignments 
    : assignments.filter((a) => a.match?.teamId === selectedTeamId)

  const pendingAssignments = filteredAssignments.filter((a) => !a.confirmed)
  const confirmedAssignments = filteredAssignments.filter((a) => a.confirmed)

  const selectedTeam = teams.find((t) => t.teamId === selectedTeamId)

  // Calculate clearable assignments (past confirmed assignments)
  const pastConfirmedAssignments = filteredAssignments.filter(a => 
    a.confirmed && new Date(a.match?.scheduledAt) < new Date()
  )
  
  const canClear = pendingAssignments.length === 0 && 
                   filteredAssignments.filter(a => new Date(a.match?.scheduledAt) >= new Date()).length === 0 && 
                   pastConfirmedAssignments.length > 0

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Your Assignments</h1>
        {filteredAssignments.length > 0 && (
          <button
            onClick={clearAllAssignments}
            disabled={!canClear || clearing}
            className={`px-4 py-2 rounded font-medium transition-all ${
              canClear && !clearing
                ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 active:scale-95'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
            }`}
            title={
              !canClear 
                ? pendingAssignments.length > 0 
                  ? 'You have pending assignments that need confirmation'
                  : filteredAssignments.filter(a => new Date(a.match?.scheduledAt) >= new Date()).length > 0
                  ? 'You have future assignments. Contact your team admin.'
                  : 'No past assignments to clear'
                : 'Clear all past assignments'
            }
          >
            {clearing ? 'Clearing...' : 'Clear Past Assignments'}
          </button>
        )}
      </div>

      {selectedTeam && (
        <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-sm text-gray-400">
            Filtering assignments for <span className="font-semibold text-blue-400">{selectedTeam.team.name}</span>
          </div>
        </div>
      )}

      {/* Clear Assignments Info */}
      {filteredAssignments.length > 0 && (
        <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Assignment Management</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <div>• You can clear past assignments once all current assignments are confirmed</div>
            <div>• Future assignments cannot be cleared - contact your team admin to be removed</div>
            <div>• Pending assignments must be confirmed before clearing any assignments</div>
          </div>
          <div className="mt-2 text-xs space-y-1">
            {pastConfirmedAssignments.length > 0 && (
              <div className="text-green-400">
                ✓ {pastConfirmedAssignments.length} past assignment(s) can be cleared
              </div>
            )}
            {pendingAssignments.length > 0 && (
              <div className="text-yellow-400">
                ⚠️ {pendingAssignments.length} pending assignment(s) need confirmation first
              </div>
            )}
            {filteredAssignments.filter(a => new Date(a.match?.scheduledAt) >= new Date()).length > 0 && (
              <div className="text-blue-400">
                📅 {filteredAssignments.filter(a => new Date(a.match?.scheduledAt) >= new Date()).length} upcoming assignment(s) (contact admin to remove)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-yellow-400">⚠️ Pending Confirmations</h2>
          <ul className="space-y-3">
            {pendingAssignments.map((a) => (
              <li key={a.id} className="bg-yellow-900/20 border border-yellow-700 p-4 rounded">
                <div className="font-medium text-white mb-1">
                  Match: {a.match?.opponentName ?? 'Unknown'}
                </div>
                <div className="text-sm text-gray-400 mb-1">
                  📅 {new Date(a.match?.scheduledAt).toLocaleString()}
                </div>
                {a.match?.location && (
                  <div className="text-sm text-gray-400 mb-2">📍 {a.match.location}</div>
                )}
                <div className="text-xs text-gray-500 mb-3">
                  Assigned: {new Date(a.assignedAt).toLocaleString()}
                </div>
                <button 
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all" 
                  onClick={() => confirm(a.id)}
                >
                  Confirm Attendance
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Confirmed Assignments */}
      {confirmedAssignments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-green-400">✓ Confirmed</h2>
          <ul className="space-y-3">
            {confirmedAssignments.map((a) => {
              const isPast = new Date(a.match?.scheduledAt) < new Date()
              const isFuture = new Date(a.match?.scheduledAt) >= new Date()
              
              return (
                <li 
                  key={a.id} 
                  className={`p-4 rounded border ${
                    isPast 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-slate-800 border-blue-600/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-white mb-1">
                        Match: {a.match?.opponentName ?? 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-400 mb-1">
                        📅 {new Date(a.match?.scheduledAt).toLocaleString()}
                      </div>
                      {a.match?.location && (
                        <div className="text-sm text-gray-400 mb-1">📍 {a.match.location}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        Assigned: {new Date(a.assignedAt).toLocaleString()}
                      </div>
                      <div className="mt-2 text-sm text-green-400">✓ Confirmed</div>
                    </div>
                    <div className="ml-4">
                      {isPast && (
                        <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded">
                          Past
                        </span>
                      )}
                      {isFuture && (
                        <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg relative">
          <p className="text-gray-400 mb-4">No assignments found</p>
          <div className="inline-block group">
            <span className="text-blue-400 cursor-pointer underline decoration-dotted" tabIndex={0}>
              What are assignments?
            </span>
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-slate-900 text-gray-200 text-sm rounded shadow-lg border border-slate-700 px-4 py-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10">
              <strong className="block text-blue-400 mb-2">Assignments Explained</strong>
              Assignments are tasks or responsibilities given to you by your team admin, such as attending matches, helping with setup, or other team duties. When you have assignments, they will appear here so you can confirm your attendance or see what is expected of you. If you have questions about your assignments, contact your team admin for details.
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
