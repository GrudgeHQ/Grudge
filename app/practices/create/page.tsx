"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamFilter } from '../../context/TeamFilterContext'

export default function CreatePracticePage() {
  const router = useRouter()
  const { selectedTeamId } = useTeamFilter()
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    teamId: '',
    scheduledAt: '',
    location: ''
  })

  useEffect(() => {
    fetch('/api/teams')
      .then((r) => r.json())
      .then((d) => {
        const adminTeams = (d.teams || []).filter((t: any) => t.isAdmin)
        setTeams(adminTeams)
        
        // If a specific team is selected in the filter, use that team
        if (selectedTeamId !== 'all') {
          const selectedTeam = adminTeams.find((t: any) => t.teamId === selectedTeamId)
          if (selectedTeam) {
            setForm((prev) => ({ ...prev, teamId: selectedTeamId }))
          } else if (adminTeams.length === 1) {
            setForm((prev) => ({ ...prev, teamId: adminTeams[0].teamId }))
          }
        } else if (adminTeams.length === 1) {
          setForm((prev) => ({ ...prev, teamId: adminTeams[0].teamId }))
        }
        
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedTeamId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.teamId || !form.scheduledAt) {
      alert('Please select a team and date/time')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: form.teamId,
          scheduledAt: form.scheduledAt,
          location: form.location || null
        }),
      })

      if (res.ok) {
        router.push('/practices')
      } else {
        alert('Failed to create practice')
        setSubmitting(false)
      }
    } catch (e) {
      alert('Error creating practice')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading...</div>
      </main>
    )
  }

  if (teams.length === 0) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Create Practice</h1>
          <p className="text-gray-400">You must be an admin of at least one team to create practices.</p>
        </div>
      </main>
    )
  }

  // Check if user is creating for the selected team specifically
  const isCreatingForSelectedTeam = selectedTeamId !== 'all' && form.teamId === selectedTeamId
  const selectedTeamInfo = teams.find((t: any) => t.teamId === selectedTeamId)

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Create Practice</h1>

        {isCreatingForSelectedTeam && selectedTeamInfo && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="text-sm text-blue-300">
              Creating practice for selected team: <span className="font-semibold">{selectedTeamInfo.team.name}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Team <span className="text-red-500">*</span>
            </label>
            {isCreatingForSelectedTeam ? (
              // When a specific team is selected, show it as read-only with option to change
              <div className="space-y-2">
                <div className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2">
                  {selectedTeamInfo?.team.name} ({selectedTeamInfo?.team.sport})
                </div>
                <p className="text-xs text-gray-400">
                  Practice will be created for your selected team. 
                  <button 
                    type="button" 
                    onClick={() => setForm({ ...form, teamId: '' })}
                    className="text-blue-400 hover:underline ml-1"
                  >
                    Choose different team
                  </button>
                </p>
              </div>
            ) : (
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                required
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.team.name} ({team.team.sport})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              required
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Enter practice location..."
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Practice'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
