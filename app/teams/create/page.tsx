'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPORTS } from '@/lib/sports'

const ROLES = [
  { value: 'ADMIN', label: 'Administrator', description: 'Full team management access' },
  { value: 'CAPTAIN', label: 'Captain', description: 'Team leader and spokesperson' },
  { value: 'CO_CAPTAIN', label: 'Co-Captain', description: 'Assistant team leader' },
  { value: 'COACH', label: 'Coach', description: 'Team trainer and strategist' },
  { value: 'COORDINATOR', label: 'Coordinator', description: 'Organizes team activities' },
]

export default function CreateTeamPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('ADMIN') // Default to ADMIN since they'll have admin privileges
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !sport || !role) {
      setError('Team name, sport, and your role are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sport,
          password: password.trim() || null,
          creatorRole: role
        })
      })

      if (!res.ok) {
        let errorMessage = 'Failed to create team'
        try {
          const data = await res.json()
          errorMessage = data.error || errorMessage
        } catch (jsonError) {
          // If response is not JSON, use status text or generic message
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await res.json()
      } catch (jsonError) {
        throw new Error('Server returned invalid response')
      }
      
      // Dispatch event to refresh team selector (client-side only)
      if (typeof window !== 'undefined' && data.team?.id) {
        window.dispatchEvent(new CustomEvent('teamCreated', { 
          detail: { teamId: data.team.id, teamName: data.team.name } 
        }))
      }
      
      // Redirect to dashboard or team page
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Create New Team</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900/90 rounded-lg p-6 space-y-6 shadow-xl border border-gray-800">
          <div>
            <label className="block text-sm font-medium mb-2">
              Team Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 placeholder-gray-500"
              placeholder="e.g., Lightning Bolts"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Sport *
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select a sport...</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Role on the Team *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              required
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="mt-2 p-3 bg-gray-900/70 border border-gray-700 rounded">
              <p className="text-sm text-gray-300">
                <span className="font-medium text-blue-400">
                  {ROLES.find(r => r.value === role)?.label}:
                </span>
                {' '}
                {ROLES.find(r => r.value === role)?.description}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Team Password (Optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              placeholder="Leave empty for no password"
            />
            <p className="text-sm text-gray-400 mt-2">
              If set, users will need this password to join your team.
            </p>
          </div>

          <div className="bg-blue-500/20 border border-blue-500 text-blue-100 px-4 py-3 rounded">
            <h4 className="font-medium mb-2">Team Creator Benefits:</h4>
            <ul className="text-sm space-y-1">
              <li>• Full administrator privileges for team management</li>
              <li>• Your selected role determines how you're displayed to team members</li>
              <li>• You can change your display role later in team settings</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-2 rounded shadow-lg"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded shadow"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
