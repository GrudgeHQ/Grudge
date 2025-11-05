'use client'

import { useState, useEffect } from 'react'
import { getRoleBadge, shouldHaveAdminAccess, LEADERSHIP_ROLES } from '@/lib/teamRoles'

interface TeamMember {
  id: string
  userId: string
  role: string
  isAdmin: boolean
  joinedAt: Date | string
  user: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface TeamRoleManagerProps {
  teamId: string
  members: TeamMember[]
  onMemberUpdate: () => void
}

function getRoleBadgeWithIcon(role: string, isAdmin: boolean) {
  const baseBadge = getRoleBadge(role, isAdmin)
  const icons = {
    COACH: '🏃',
    COORDINATOR: '📋', 
    CAPTAIN: '⭐',
    CO_CAPTAIN: '👥',
    ADMIN: '🔧',
    MEMBER: '👤'
  }
  
  return {
    ...baseBadge,
    icon: icons[role as keyof typeof icons] || icons.MEMBER
  }
}

function getRoleDescription(role: string) {
  const descriptions = {
    CAPTAIN: 'Team leader with full authority and responsibilities',
    CO_CAPTAIN: 'Assistant leader who supports the Captain',
    COACH: 'Responsible for training, strategy, and player development',
    COORDINATOR: 'Handles logistics, scheduling, and organization',
    ADMIN: 'Administrative privileges for team management',
    MEMBER: 'Regular team member with standard participation rights'
  }
  
  return descriptions[role as keyof typeof descriptions] || 'Team member'
}

export default function TeamRoleManager({ teamId, members, onMemberUpdate }: TeamRoleManagerProps) {
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const roles = [
    { value: 'CAPTAIN', label: 'Captain', icon: '⭐', restriction: 'Only one per team' },
    { value: 'CO_CAPTAIN', label: 'Co-Captain', icon: '👥', restriction: 'Assists the Captain' },
    { value: 'COACH', label: 'Coach', icon: '🏃', restriction: 'Training & strategy' },
    { value: 'COORDINATOR', label: 'Coordinator', icon: '📋', restriction: 'Logistics & scheduling' },
    { value: 'ADMIN', label: 'Administrator', icon: '🔧', restriction: 'General admin privileges' },
    { value: 'MEMBER', label: 'Member', icon: '👤', restriction: 'Standard participation' }
  ]

  const startEditing = (member: TeamMember) => {
    setEditingMember(member.id)
    setSelectedRole(member.role)
    setMessage(null)
  }

  const cancelEditing = () => {
    setEditingMember(null)
    setSelectedRole('')
    setMessage(null)
  }

  const updateMemberRole = async (memberId: string, userId: string) => {
    if (!selectedRole) return

    try {
      setLoading(memberId)
      setMessage(null)

      const response = await fetch(`/api/teams/${teamId}/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          role: selectedRole
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update role')
      }

      setMessage('Role updated successfully!')
      setEditingMember(null)
      setSelectedRole('')
      onMemberUpdate()

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('Error updating role:', error)
      setMessage(error.message || 'Failed to update role')
    } finally {
      setLoading(null)
    }
  }

  const toggleAdminStatus = async (member: TeamMember) => {
    try {
      setLoading(member.id)
      setMessage(null)

      const endpoint = member.isAdmin 
        ? `/api/teams/${teamId}/demote`
        : `/api/teams/${teamId}/promote`

      const body = member.isAdmin 
        ? { userId: member.userId }
        : { userId: member.userId, role: member.role }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${member.isAdmin ? 'remove' : 'grant'} admin privileges`)
      }

      setMessage(`${member.isAdmin ? 'Removed' : 'Granted'} admin privileges successfully!`)
      onMemberUpdate()

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('Error toggling admin status:', error)
      setMessage(error.message || `Failed to ${member.isAdmin ? 'remove' : 'grant'} admin privileges`)
    } finally {
      setLoading(null)
    }
  }

  const currentCaptain = members.find(m => m.role === 'CAPTAIN')
  
  // Find any inconsistent role/admin assignments
  const inconsistentMembers = members.filter(member => 
    shouldHaveAdminAccess(member.role) && !member.isAdmin
  )

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      {inconsistentMembers.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">⚠️</span>
            <h4 className="font-semibold text-yellow-300">Role Inconsistency Detected</h4>
          </div>
          <p className="text-yellow-200 text-sm mb-2">
            The following members have leadership roles but lack admin access:
          </p>
          <ul className="text-sm text-yellow-100 mb-3">
            {inconsistentMembers.map(member => (
              <li key={member.id}>
                • {member.user?.name || member.user?.email} ({member.role})
              </li>
            ))}
          </ul>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/fix-role-consistency', {
                  method: 'POST'
                })
                if (response.ok) {
                  setMessage('Role inconsistencies fixed successfully!')
                  onMemberUpdate()
                }
              } catch (error) {
                setMessage('Failed to fix role inconsistencies')
              }
            }}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded"
          >
            Fix Automatically
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Team Role Management</h3>
          <p className="text-gray-400 text-sm">
            Assign specific roles to team members. Each role has different responsibilities and permissions.
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('successfully') 
            ? 'bg-green-500/20 border border-green-500 text-green-100' 
            : 'bg-red-500/20 border border-red-500 text-red-100'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-3">
        {members
          .sort((a, b) => {
            // Sort by: Captain first, then other admins, then by role, then by name
            if (a.role === 'CAPTAIN') return -1
            if (b.role === 'CAPTAIN') return 1
            if (a.isAdmin && !b.isAdmin) return -1
            if (!a.isAdmin && b.isAdmin) return 1
            if (a.role !== b.role) return a.role.localeCompare(b.role)
            const aName = a.user?.name || a.user?.email || ''
            const bName = b.user?.name || b.user?.email || ''
            return aName.localeCompare(bName)
          })
          .map((member) => {
            const badge = getRoleBadgeWithIcon(member.role, member.isAdmin)
            const isEditing = editingMember === member.id

            return (
              <div
                key={member.id}
                className={`rounded-lg p-4 border transition-all ${
                  isEditing 
                    ? 'bg-slate-700 border-blue-500' 
                    : 'bg-slate-750 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-medium">
                        {member.user?.name || member.user?.email || 'Unknown User'}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${badge.color} flex items-center gap-1`}>
                        <span>{badge.icon}</span>
                        {badge.label}
                      </span>
                      {member.isAdmin && (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-medium rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    
                    {!isEditing && (
                      <p className="text-gray-400 text-sm">
                        {getRoleDescription(member.role)}
                      </p>
                    )}

                    {isEditing && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Select Role
                          </label>
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {roles.map((role) => (
                              <option
                                key={role.value}
                                value={role.value}
                                disabled={role.value === 'CAPTAIN' && currentCaptain && currentCaptain.userId !== member.userId}
                              >
                                {role.icon} {role.label}
                                {role.value === 'CAPTAIN' && currentCaptain && currentCaptain.userId !== member.userId 
                                  ? ' (Taken)' 
                                  : ''}
                              </option>
                            ))}
                          </select>
                          
                          {selectedRole && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <span>{roles.find(r => r.value === selectedRole)?.icon}</span>
                              {roles.find(r => r.value === selectedRole)?.restriction}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateMemberRole(member.id, member.userId)}
                            disabled={loading === member.id || !selectedRole || selectedRole === member.role}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm rounded transition-colors disabled:cursor-not-allowed"
                          >
                            {loading === member.id ? 'Updating...' : 'Update Role'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(member)}
                        disabled={loading === member.id}
                        className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 text-white rounded transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Change Role
                      </button>
                      
                      <button
                        onClick={() => toggleAdminStatus(member)}
                        disabled={loading === member.id}
                        className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-1 ${
                          member.isAdmin
                            ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white'
                        }`}
                      >
                        {loading === member.id ? (
                          'Loading...'
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d={member.isAdmin ? "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" : "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"} />
                            </svg>
                            {member.isAdmin ? 'Remove Admin' : 'Grant Admin'}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* Role Information */}
      <div className="mt-6 pt-4 border-t border-slate-600">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Role Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {roles.map((role) => (
            <div key={role.value} className="flex items-center gap-2 text-gray-400">
              <span className="text-sm">{role.icon}</span>
              <span className="font-medium">{role.label}:</span>
              <span>{role.restriction}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}