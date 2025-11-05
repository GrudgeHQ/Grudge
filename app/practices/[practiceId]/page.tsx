"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AddToCalendar from '@/app/components/AddToCalendar'

export default function PracticeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const practiceId = params.practiceId as string
  const [practice, setPractice] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [myAttendance, setMyAttendance] = useState<'GOING' | 'NOT_GOING' | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    scheduledAt: '',
    location: ''
  })

  useEffect(() => {
    loadPractice()
    loadAttendance()
  }, [practiceId])

  function loadPractice() {
    fetch(`/api/practices/${practiceId}`)
      .then((r) => r.json())
      .then((d) => {
        setPractice(d.practice)
        setEditForm({
          scheduledAt: d.practice.scheduledAt ? new Date(d.practice.scheduledAt).toISOString().slice(0, 16) : '',
          location: d.practice.location || ''
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  function loadAttendance() {
    fetch(`/api/practices/${practiceId}/attendance`)
      .then((r) => r.json())
      .then((d) => {
        setAttendance(d.attendance || [])
        setMyAttendance(d.myAttendance || null)
        setIsAdmin(d.isAdmin || false)
      })
      .catch(() => {})
  }

  async function updateAttendance(status: 'GOING' | 'NOT_GOING') {
    try {
      const res = await fetch(`/api/practices/${practiceId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        setMyAttendance(status)
        loadAttendance()
      }
    } catch (e) {
      // ignore
    }
  }

  async function updatePractice(e: React.FormEvent) {
    e.preventDefault()

    try {
      const res = await fetch(`/api/practices/${practiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: editForm.scheduledAt,
          location: editForm.location
        }),
      })

      if (res.ok) {
        setIsEditing(false)
        loadPractice()
      }
    } catch (e) {
      // ignore
    }
  }

  async function deletePractice() {
    if (!confirm('Are you sure you want to delete this practice?')) {
      return
    }

    try {
      const res = await fetch(`/api/practices/${practiceId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/practices')
      }
    } catch (e) {
      // ignore
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading practice...</div>
      </main>
    )
  }

  if (!practice) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-400">Practice not found</div>
      </main>
    )
  }

  const date = new Date(practice.scheduledAt)
  const isPast = date < new Date()
  const going = attendance.filter((a) => a.status === 'GOING')
  const notGoing = attendance.filter((a) => a.status === 'NOT_GOING')

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Practices
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        {!isEditing ? (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Practice Session</h1>
                <div className="text-gray-400 space-y-1">
                  <div className="text-lg">📅 {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  {practice.location && <div className="text-lg">📍 {practice.location}</div>}
                  {practice.team && <div className="text-sm text-blue-400 mt-2">⚽ {practice.team.name}</div>}
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm px-3 py-1 rounded ${isPast ? 'bg-gray-600/20 text-gray-400 border border-gray-600/30' : 'bg-green-600/20 text-green-400 border border-green-600/30'}`}>
                  {isPast ? 'Completed' : 'Upcoming'}
                </span>
              </div>
            </div>

            {!isPast && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <AddToCalendar
                  title={`${practice.team?.name || 'Team'} Practice`}
                  description={`Practice session for ${practice.team?.name || 'the team'}`}
                  location={practice.location || ''}
                  startTime={date}
                  endTime={new Date(date.getTime() + 2 * 60 * 60 * 1000)} // 2 hours duration
                  url={typeof window !== 'undefined' ? window.location.href : ''}
                />
              </div>
            )}

            {isAdmin && !isPast && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
                >
                  Edit Practice
                </button>
                <button
                  onClick={deletePractice}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all"
                >
                  Delete Practice
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={updatePractice} className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Practice</h2>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Date & Time</label>
              <input
                type="datetime-local"
                value={editForm.scheduledAt}
                onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
                required
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Location</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {!isPast && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Your Attendance</h2>
          <div className="flex gap-4">
            <button
              onClick={() => updateAttendance('GOING')}
              className={`flex-1 px-6 py-3 rounded-lg text-lg font-medium transition-all active:scale-95 ${
                myAttendance === 'GOING'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ✓ Going
            </button>
            <button
              onClick={() => updateAttendance('NOT_GOING')}
              className={`flex-1 px-6 py-3 rounded-lg text-lg font-medium transition-all active:scale-95 ${
                myAttendance === 'NOT_GOING'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ✗ Not Going
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Attendance ({going.length + notGoing.length})</h2>

        {going.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-green-400 mb-2">Going ({going.length})</h3>
            <div className="space-y-2">
              {going.map((a) => (
                <div key={a.userId} className="flex items-center gap-3 p-2 bg-slate-700/50 rounded">
                  <span className="text-green-500">✓</span>
                  <span className="text-white">{a.user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {notGoing.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-red-400 mb-2">Not Going ({notGoing.length})</h3>
            <div className="space-y-2">
              {notGoing.map((a) => (
                <div key={a.userId} className="flex items-center gap-3 p-2 bg-slate-700/50 rounded">
                  <span className="text-red-500">✗</span>
                  <span className="text-white">{a.user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {going.length === 0 && notGoing.length === 0 && (
          <div className="text-gray-400 text-center py-4">No attendance recorded yet</div>
        )}
      </div>
    </main>
  )
}
