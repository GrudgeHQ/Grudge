"use client"
import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react'
import Link from 'next/link'
import { useTeamFilter } from '../context/TeamFilterContext'
import LoadingSpinner from '../components/LoadingSpinner'

// Lazy load the calendar component
const AddToCalendar = lazy(() => import('../components/AddToCalendar'))

export default function PracticesPage() {
  const { selectedTeamId } = useTeamFilter()
  const [practices, setPractices] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadPractices = useCallback(async () => {
    try {
      // Load teams and practices in parallel
      const [teamsRes, practicesRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/practices')
      ])

      const [teamsData, practicesData] = await Promise.all([
        teamsRes.json(),
        practicesRes.json()
      ])

      setTeams(teamsData.teams || [])
      setPractices(practicesData.practices || [])
    } catch (error) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  // Memoize filtered and sorted practices to avoid recalculating on every render
  const { upcoming, past, selectedTeam } = useMemo(() => {
    const filteredPractices = selectedTeamId === 'all' 
      ? practices 
      : practices.filter((p) => p.teamId === selectedTeamId)

    const now = new Date()
    
    // Consider a practice "past" only if it was more than 2 hours ago (assumed practice duration)
    const upcomingPractices = filteredPractices.filter((p) => {
      const practiceDate = new Date(p.scheduledAt)
      const twoHoursAfter = new Date(practiceDate.getTime() + 2 * 60 * 60 * 1000)
      return twoHoursAfter > now
    })
    const pastPractices = filteredPractices.filter((p) => {
      const practiceDate = new Date(p.scheduledAt)
      const twoHoursAfter = new Date(practiceDate.getTime() + 2 * 60 * 60 * 1000)
      return twoHoursAfter <= now
    })

    const team = teams.find((t) => t.teamId === selectedTeamId)

    return {
      upcoming: upcomingPractices,
      past: pastPractices,
      selectedTeam: team
    }
  }, [practices, selectedTeamId, teams])

  const handleUpdate = useCallback(async () => {
    const res = await fetch('/api/practices')
    const data = await res.json()
    setPractices(data.practices || [])
  }, [])

  useEffect(() => {
    loadPractices()

    // Reload when page becomes visible (e.g., after navigation back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPractices()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadPractices])

  if (loading) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading practices...</div>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Practices</h1>
        <Link
          href="/practices/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
        >
          Create Practice
        </Link>
      </div>

      {selectedTeam && (
        <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-sm text-gray-400">
            Filtering practices for <span className="font-semibold text-blue-400">{selectedTeam.team.name}</span>
          </div>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Upcoming Practices</h2>
        {upcoming.length === 0 ? (
          <div className="text-gray-400 bg-slate-800 border border-slate-700 p-6 rounded-lg text-center">
            No upcoming practices scheduled
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((practice) => (
              <PracticeCard key={practice.id} practice={practice} showTeamName={selectedTeamId === 'all'} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Past Practices</h2>
        {past.length === 0 ? (
          <div className="text-gray-400 bg-slate-800 border border-slate-700 p-6 rounded-lg text-center">
            No past practices
          </div>
        ) : (
          <div className="space-y-4">
            {past.map((practice) => (
              <PracticeCard key={practice.id} practice={practice} showTeamName={selectedTeamId === 'all'} isPast onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const PracticeCard = React.memo(function PracticeCard({ practice, showTeamName, isPast = false, onUpdate }: { practice: any; showTeamName: boolean; isPast?: boolean; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [attendance, setAttendance] = useState<any[]>(practice.attendance || [])
  const [myAttendance, setMyAttendance] = useState<'GOING' | 'NOT_GOING' | null>(practice.myAttendance || null)
  const [isAdmin] = useState(false) // Will be determined by team membership, not fetched per practice
  const [editForm, setEditForm] = useState({
    scheduledAt: practice.scheduledAt ? new Date(practice.scheduledAt).toISOString().slice(0, 16) : '',
    location: practice.location || ''
  })
  const [localPractice, setLocalPractice] = useState(practice)

  async function updateAttendance(e: React.MouseEvent, status: 'GOING' | 'NOT_GOING') {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await fetch(`/api/practices/${practice.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        setMyAttendance(status)
        // Reload all practices to get updated attendance counts
        onUpdate()
      }
    } catch (e) {
      // ignore
    }
  }

  async function updatePractice(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await fetch(`/api/practices/${practice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: editForm.scheduledAt,
          location: editForm.location
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setLocalPractice(data.practice)
        setIsEditing(false)
        onUpdate()
      }
    } catch (e) {
      // ignore
    }
  }

  async function deletePractice(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this practice?')) {
      return
    }

    try {
      const res = await fetch(`/api/practices/${practice.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        onUpdate()
      }
    } catch (e) {
      // ignore
    }
  }

  const date = new Date(localPractice.scheduledAt)
  const goingCount = attendance.filter((a) => a.status === 'GOING').length

  return (
    <div className={`border border-slate-700 rounded-lg p-4 ${isPast ? 'bg-slate-800/50' : 'bg-slate-800'}`}>
      {!isEditing ? (
        <>
          <Link href={`/practices/${practice.id}`}>
            <div className="hover:opacity-80 transition-opacity">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      Practice Session
                    </h3>
                    {!isPast && goingCount > 0 && (
                      <span className="text-sm px-2 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded">
                        {goingCount} attending
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>📅 {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    {localPractice.location && <div>📍 {localPractice.location}</div>}
                    {showTeamName && practice.team && (
                      <div className="text-xs text-blue-400">⚽ {practice.team.name}</div>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col gap-2">
                  <div className="text-sm text-gray-500">
                    {isPast ? 'Completed' : 'Upcoming'}
                  </div>
                </div>
              </div>
            </div>
          </Link>
          
          {!isPast && (
            <div className="mt-3 pt-3 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
              <Suspense fallback={<LoadingSpinner size="sm" />}>
                <AddToCalendar
                  title={`${practice.team?.name || 'Team'} Practice`}
                  description={`Practice session for ${practice.team?.name || 'the team'}`}
                  location={localPractice.location || ''}
                  startTime={date}
                  endTime={new Date(date.getTime() + 2 * 60 * 60 * 1000)}
                  url={typeof window !== 'undefined' ? `${window.location.origin}/practices/${practice.id}` : ''}
                />
              </Suspense>
            </div>
          )}
          
          {isAdmin && !isPast && (
            <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
              >
                Edit
              </button>
              <button
                onClick={deletePractice}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all"
              >
                Del
              </button>
            </div>
          )}

          {!isPast && (
            <>
              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="text-xs text-gray-400 mb-2">Your Attendance:</div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => updateAttendance(e, 'GOING')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all active:scale-95 ${
                      myAttendance === 'GOING'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    ✓ Going
                  </button>
                  <button
                    onClick={(e) => updateAttendance(e, 'NOT_GOING')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all active:scale-95 ${
                      myAttendance === 'NOT_GOING'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    ✗ Not Going
                  </button>
                </div>
              </div>

              {attendance.length > 0 && (
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    {attendance.filter((a) => a.status === 'GOING').length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-green-400 mb-2">
                          Going ({attendance.filter((a) => a.status === 'GOING').length})
                        </div>
                        <div className="space-y-1">
                          {attendance
                            .filter((a) => a.status === 'GOING')
                            .map((a) => (
                              <div key={a.userId} className="text-xs text-gray-300 truncate">
                                ✓ {a.user.name}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    {attendance.filter((a) => a.status === 'NOT_GOING').length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-red-400 mb-2">
                          Not Going ({attendance.filter((a) => a.status === 'NOT_GOING').length})
                        </div>
                        <div className="space-y-1">
                          {attendance
                            .filter((a) => a.status === 'NOT_GOING')
                            .map((a) => (
                              <div key={a.userId} className="text-xs text-gray-300 truncate">
                                ✗ {a.user.name}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-white">Edit Practice</h3>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-400">Date & Time</label>
            <input
              type="datetime-local"
              value={editForm.scheduledAt}
              onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-400">Location</label>
            <input
              type="text"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={updatePractice}
              className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
            >
              Save
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
              className="flex-1 px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
