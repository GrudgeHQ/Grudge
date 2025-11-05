"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TeamMembership {
  id: string
  teamId: string
  role: string
  isAdmin: boolean
  team: {
    id: string
    name: string
    sport: string
  }
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: ''
  })
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [teamRoles, setTeamRoles] = useState<Record<string, string>>({})
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [promotionTeamId, setPromotionTeamId] = useState<string | null>(null)
  const [promotionRole, setPromotionRole] = useState<string>('ADMIN')
  const router = useRouter()

  useEffect(() => {
    // Check URL parameters for promotion modal
    const urlParams = new URLSearchParams(window.location.search)
    const promoted = urlParams.get('promoted')
    const role = urlParams.get('role')
    const teamId = urlParams.get('team')
    
    if (promoted === 'true' && teamId) {
      setPromotionTeamId(teamId)
      setPromotionRole(role || 'ADMIN')
      setShowPromotionModal(true)
      
      // Clean up URL
      window.history.replaceState({}, '', '/profile')
    }

    // Load current user profile
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setFormData({
            name: d.user.name || '',  
            email: d.user.email || '',
            phone: d.user.phone || '',
            bio: d.user.bio || ''
          })
          
          // Set memberships and initial team roles
          const userMemberships = d.user.memberships || []
          setMemberships(userMemberships)
          
          const roles: Record<string, string> = {}
          userMemberships.forEach((m: TeamMembership) => {
            if (m.isAdmin) {
              roles[m.teamId] = m.role
            }
          })
          setTeamRoles(roles)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load profile')
        setLoading(false)
      })
    
    // Handle promotion modal separately to avoid setState in render
    if (promoted === 'true' && teamId) {
      setPromotionTeamId(teamId)
      setPromotionRole(role || 'ADMIN')
      setShowPromotionModal(true)
      
      // Clean up URL
      window.history.replaceState({}, '', '/profile')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
          teamRoles: teamRoles
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update profile')
        setSaving(false)
        return
      }

      setSuccess('Profile updated successfully!')
      setSaving(false)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setSaving(false)
    }
  }

  async function confirmPromotionRole() {
    if (!promotionTeamId) return
    
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/teams/${promotionTeamId}/update-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: promotionRole
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update role')
        setSaving(false)
        return
      }

      // Update local state
      setTeamRoles(prev => ({ ...prev, [promotionTeamId]: promotionRole }))
      setShowPromotionModal(false)
      setSuccess('Welcome to the team leadership! Your role has been set successfully.')
      setSaving(false)
      
      // Refresh memberships
      window.location.reload()
    } catch (err) {
      setError('Failed to update role. Please try again.')
      setSaving(false)
    }
  }

  function getRoleBadge(role: string) {
    const badges = {
      COACH: { label: 'Coach', color: 'bg-purple-600/20 text-purple-400 border-purple-600/30' },
      COORDINATOR: { label: 'Coordinator', color: 'bg-green-600/20 text-green-400 border-green-600/30' },
      CAPTAIN: { label: 'Captain', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' },
      CO_CAPTAIN: { label: 'Co-Captain', color: 'bg-orange-600/20 text-orange-400 border-orange-600/30' },
      ADMIN: { label: 'Admin', color: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
      MEMBER: { label: 'Member', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' }
    }
    
    const badge = badges[role as keyof typeof badges] || badges.MEMBER
    return badge
  }

  if (loading) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading profile...</div>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-gray-400">Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="bg-slate-700/50 border border-slate-600 text-gray-400 rounded px-3 py-2 w-full cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Full Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., (555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Tell us a bit about yourself..."
          />
        </div>

        {memberships.filter(m => m.isAdmin).length > 0 && (
          <div className="border-t border-slate-700 pt-5">
            <h3 className="text-lg font-semibold text-white mb-3">Team Roles</h3>
            <p className="text-sm text-gray-400 mb-4">Set your role for teams where you are an admin</p>
            
            <div className="space-y-4">
              {memberships
                .filter(m => m.isAdmin)
                .map((membership) => (
                  <div key={membership.teamId} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-medium">{membership.team.name}</h4>
                        <p className="text-xs text-gray-400">{membership.team.sport}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadge(teamRoles[membership.teamId] || membership.role).color}`}>
                        {getRoleBadge(teamRoles[membership.teamId] || membership.role).label}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'COACH', label: 'Coach' },
                        { value: 'COORDINATOR', label: 'Coordinator' },
                        { value: 'CAPTAIN', label: 'Captain' },
                        { value: 'CO_CAPTAIN', label: 'Co-Captain' }
                      ].map((roleOption) => (
                        <button
                          key={roleOption.value}
                          type="button"
                          onClick={() => setTeamRoles({ ...teamRoles, [membership.teamId]: roleOption.value })}
                          className={`px-3 py-2 rounded text-sm font-medium transition-all active:scale-95 ${
                            (teamRoles[membership.teamId] || membership.role) === roleOption.value
                              ? `${getRoleBadge(roleOption.value).color} border-2`
                              : 'bg-slate-600 text-gray-300 border border-slate-500 hover:bg-slate-500'
                          }`}
                        >
                          {roleOption.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700 text-green-400 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700 active:bg-blue-800 active:scale-95 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-slate-600 bg-slate-700 text-white rounded font-semibold hover:bg-slate-600 active:bg-slate-800 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Promotion Role Selection Modal */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="mb-4">
                <span className="text-6xl">🎉</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Congratulations!</h3>
              <p className="text-slate-400">
                You've been granted administrator access to the team. Please select how you'd like to display your role.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                <p className="text-green-100 text-sm">
                  🛡️ <strong>Administrator Privileges Granted:</strong> You now have full team management access including member management, settings, and match scheduling.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Choose Your Role Display
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'CAPTAIN', label: 'Captain', desc: '⭐ Primary team leader and decision maker', warning: 'Only one captain per team' },
                    { value: 'CO_CAPTAIN', label: 'Co-Captain', desc: '👥 Assistant team leader and supporter' },
                    { value: 'COACH', label: 'Coach', desc: '🏃 Responsible for training and strategy' },
                    { value: 'COORDINATOR', label: 'Coordinator', desc: '📋 Handles logistics and organization' },
                    { value: 'ADMIN', label: 'Administrator', desc: '🔧 General administrative privileges' }
                  ].map((roleOption) => (
                    <div key={roleOption.value}>
                      <button
                        type="button"
                        onClick={() => setPromotionRole(roleOption.value)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          promotionRole === roleOption.value
                            ? 'bg-blue-600/20 border-blue-500 text-blue-100'
                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <div className="font-medium">{roleOption.label}</div>
                        <div className="text-sm opacity-80">{roleOption.desc}</div>
                        {roleOption.warning && promotionRole === roleOption.value && (
                          <div className="text-xs text-yellow-400 mt-1">⚠️ {roleOption.warning}</div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={confirmPromotionRole}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {saving ? 'Setting Role...' : 'Confirm Role'}
                </button>
                <button
                  onClick={() => {
                    setShowPromotionModal(false)
                    setPromotionRole('ADMIN')
                  }}
                  disabled={saving}
                  className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
