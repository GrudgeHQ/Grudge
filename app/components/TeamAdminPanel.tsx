"use client"
import React, { useState, useEffect } from 'react'
import ConfirmModal from './ConfirmModal'
import TeamJoinRequestsManager from './TeamJoinRequestsManager'

interface Team {
  id: string
  name: string
  sport: string
  inviteCode: string
  password: string | null
}

export default function TeamAdminPanel({ teamId, members }: { teamId: string, members: any[] }) {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [transferTo, setTransferTo] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined)
  const [modalMessage, setModalMessage] = useState<string | undefined>(undefined)
  const [modalAction, setModalAction] = useState<(() => void) | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [teamName, setTeamName] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [updatingTeam, setUpdatingTeam] = useState(false)
  const [showRoleSelection, setShowRoleSelection] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN')

  useEffect(() => {
    loadTeam()
  }, [teamId])

  async function loadTeam() {
    try {
      const res = await fetch(`/api/teams/${teamId}`)
      if (res.ok) {
        const data = await res.json()
        setTeam(data.team)
        setTeamName(data.team.name)
        setTeamPassword('') // Don't show current password for security
      }
    } catch (error) {
      console.error('Failed to load team:', error)
    } finally {
      setLoadingTeam(false)
    }
  }

  async function postJson(url: string, body: any) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res
  }

  async function promote(userId: string, role: string = 'ADMIN') {
    setLoadingMap((m) => ({ ...m, [userId]: true }))
    const res = await postJson(`/api/teams/${teamId}/promote`, { userId, role })
    if (res.ok) {
      const data = await res.json()
      setMessage('Member promoted to administrator')
      
      // If promoting with a specific role, redirect to profile for role confirmation
      if (role !== 'ADMIN') {
        setTimeout(() => {
          // Redirect to profile page with role selection prompt
          window.location.href = `/profile?promoted=true&role=${role}&team=${teamId}`
        }, 1500)
      }
    } else {
      const errorData = await res.json()
      setMessage(errorData.error || 'Failed to promote member')
    }
    setLoadingMap((m) => ({ ...m, [userId]: false }))
  }

  function showRoleSelectionModal(userId: string) {
    setShowRoleSelection(userId)
    setSelectedRole('ADMIN')
  }

  async function promoteWithRole() {
    if (!showRoleSelection) return
    
    await promote(showRoleSelection, selectedRole)
    setShowRoleSelection(null)
  }

  async function demote(userId: string) {
    setModalTitle('Demote member')
    setModalMessage('Are you sure you want to demote this member from admin?')
    setModalAction(() => async () => {
      setModalOpen(false)
      setLoadingMap((m) => ({ ...m, [userId]: true }))
      const res = await postJson(`/api/teams/${teamId}/demote`, { userId })
      if (res.ok) setMessage('Demoted')
      else setMessage('Failed to demote')
      setLoadingMap((m) => ({ ...m, [userId]: false }))
    })
    setModalOpen(true)
  }

  async function removeMember(userId: string) {
    const member = members.find(m => m.userId === userId)
    const memberName = member?.user?.name || member?.user?.email || 'this member'
    
    setModalTitle('⚠️ Remove Team Member - Permanent Action')
    setModalMessage(
      `Are you sure you want to remove ${memberName} from the team?\n\n` +
      `⚠️ THIS ACTION IS PERMANENT AND CANNOT BE UNDONE ⚠️\n\n` +
      `The member will lose access to:\n` +
      `• All team matches and statistics\n` +
      `• Team chat and communications\n` +
      `• Practice schedules and attendance\n` +
      `• League participation with this team\n\n` +
      `They will need a new invitation to rejoin the team.`
    )
    setModalAction(() => async () => {
      setModalOpen(false)
      setLoadingMap((m) => ({ ...m, [userId]: true }))
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage(`Successfully removed ${memberName} from the team`)
        // Refresh the page to update member list
        window.location.reload()
      } else {
        const errorData = await res.json().catch(() => ({}))
        setMessage(errorData.error || 'Failed to remove member')
      }
      setLoadingMap((m) => ({ ...m, [userId]: false }))
    })
    setModalOpen(true)
  }

  async function updateTeam() {
    if (!teamName.trim()) {
      setMessage('Team name is required')
      return
    }

    setUpdatingTeam(true)
    setMessage('')

    try {
      const updateData: any = { name: teamName.trim() }
      
      // Only include password if it's changed (not empty)
      if (teamPassword.trim()) {
        updateData.password = teamPassword.trim()
      } else if (teamPassword === '' && team?.password) {
        // If password field is empty and team currently has a password, keep current password
        // To actually remove password, user would need to explicitly clear it
      }

      const res = await fetch(`/api/teams/${teamId}/update`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(updateData)
      })
      
      if (res.ok) {
        const data = await res.json()
        setTeam(data.team)
        setMessage('Team updated successfully!')
        setTeamPassword('') // Clear password field after successful update
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000)
      } else {
        const errorData = await res.json()
        setMessage(errorData.error || 'Failed to update team')
      }
    } catch (error) {
      setMessage('Failed to update team')
    } finally {
      setUpdatingTeam(false)
    }
  }

  async function relinquish(transferToUserId?: string | null) {
    const msg = transferToUserId ? 'Transfer admin to selected member and relinquish your admin?' : 'Relinquish your admin role? If you are the last admin this will fail.'
    setModalTitle('Relinquish admin')
    setModalMessage(msg)
    setModalAction(() => async () => {
      setModalOpen(false)
      const body = transferToUserId ? { transferToUserId } : {}
      const res = await fetch(`/api/teams/${teamId}/relinquish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) setMessage('Relinquished admin')
      else {
        const txt = await res.text()
        setMessage('Failed to relinquish: ' + txt)
      }
    })
    setModalOpen(true)
  }

  if (loadingTeam) {
    return <div className="text-gray-400">Loading team settings...</div>
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.includes('successfully') || message.includes('updated') 
            ? 'bg-green-500/20 border border-green-500 text-green-100' 
            : 'bg-red-500/20 border border-red-500 text-red-100'
        }`}>
          {message}
        </div>
      )}

      {/* Team Settings Section */}
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Team Settings</h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg className={`w-5 h-5 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {team && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Current Name:</span>
                <div className="text-white font-medium">{team.name}</div>
              </div>
              <div>
                <span className="text-gray-400">Sport:</span>
                <div className="text-white font-medium">{team.sport}</div>
              </div>
              <div>
                <span className="text-gray-400">Invite Code:</span>
                <div className="text-blue-400 font-mono">{team.inviteCode}</div>
              </div>
              <div>
                <span className="text-gray-400">Password Protected:</span>
                <div className="text-white">{team.password ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {showSettings && (
              <div className="border-t border-gray-800 pt-4 mt-4">
                <h4 className="text-lg font-semibold text-white mb-4">Edit Team Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="Enter team name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Team Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={teamPassword}
                      onChange={(e) => setTeamPassword(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="Enter new password or leave empty to keep current"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Leave empty to keep current password. Users need this password to join your team.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={updateTeam}
                      disabled={updatingTeam || !teamName.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {updatingTeam ? 'Updating...' : 'Update Team'}
                    </button>
                    <button
                      onClick={() => {
                        setShowSettings(false)
                        setTeamName(team.name)
                        setTeamPassword('')
                        setMessage('')
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team Join Requests Management */}
      {team && (
        <TeamJoinRequestsManager 
          teamId={teamId} 
          teamName={team.name}
        />
      )}

      {/* Member Management Section */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Manage Members</h3>
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.userId} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="font-medium text-white">{m.user?.name ?? m.user?.email}</div>
                <div className="text-sm text-gray-400">
                  {m.role} {m.isAdmin && <span className="text-blue-400">(Admin)</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {!m.isAdmin && (
                  <button 
                    disabled={!!loadingMap[m.userId]} 
                    onClick={() => showRoleSelectionModal(m.userId)} 
                    className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {loadingMap[m.userId] ? 'Loading...' : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Grant Admin
                      </>
                    )}
                  </button>
                )}
                {m.isAdmin && (
                  <button 
                    disabled={!!loadingMap[m.userId]} 
                    onClick={() => demote(m.userId)} 
                    className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded transition-colors disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {loadingMap[m.userId] ? 'Loading...' : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        Remove Admin
                      </>
                    )}
                  </button>
                )}
                <button 
                  disabled={!!loadingMap[m.userId]} 
                  onClick={() => removeMember(m.userId)} 
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition-colors disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {loadingMap[m.userId] ? 'Loading...' : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Member
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Transfer Section */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Admin Management</h3>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <p className="text-yellow-200 text-sm">
            If there are other admins you can relinquish directly. If you're the last admin, 
            select a member to transfer admin rights to before relinquishing.
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Transfer Admin To</label>
            <select 
              value={transferTo ?? ''} 
              onChange={(e) => setTransferTo(e.target.value || null)} 
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            >
              <option value="">-- Select member --</option>
              {members.filter(m => !m.isAdmin).map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name ?? m.user?.email}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => relinquish()} 
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              Relinquish Only
            </button>
            <button 
              onClick={() => relinquish(transferTo)} 
              disabled={!transferTo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Transfer & Relinquish
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal 
        open={modalOpen} 
        title={modalTitle} 
        message={modalMessage} 
        onConfirm={() => modalAction && modalAction()} 
        onCancel={() => setModalOpen(false)} 
      />

      {/* Role Selection Modal */}
      {showRoleSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Grant Administrator Access</h3>
              <button
                onClick={() => setShowRoleSelection(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                <p className="text-blue-100 text-sm">
                  This member will become a team administrator with full management privileges. 
                  They will be redirected to their profile to select their preferred role display.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Administrator Role Display
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="ADMIN">Administrator</option>
                  <option value="CAPTAIN">Captain</option>
                  <option value="CO_CAPTAIN">Co-Captain</option>
                  <option value="COACH">Coach</option>
                  <option value="COORDINATOR">Coordinator</option>
                </select>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedRole === 'CAPTAIN' && "⭐ Each team can only have one Captain"}
                  {selectedRole === 'CO_CAPTAIN' && "👥 Assistant to the team Captain"}
                  {selectedRole === 'COACH' && "🏃 Responsible for training and strategy"}
                  {selectedRole === 'COORDINATOR' && "📋 Handles logistics and organization"}
                  {selectedRole === 'ADMIN' && "🔧 General administrative privileges"}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={promoteWithRole}
                  disabled={loadingMap[showRoleSelection]}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {loadingMap[showRoleSelection] ? 'Granting Access...' : 'Grant Administrator Access'}
                </button>
                <button
                  onClick={() => setShowRoleSelection(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
