"use client"
import React, { useState } from 'react'
import TeamAdminPanel from './TeamAdminPanel'
import TeamProfileManager from './TeamProfileManager'
import TeamRoleManager from './TeamRoleManager'
import TeamJoinRequestsManager from './TeamJoinRequestsManager'
import { getRoleBadge } from '@/lib/teamRoles'

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

interface TeamTabsProps {
  teamId: string
  members: any[]
  isAdmin: boolean
  isMember: boolean
  teamName?: string
}

export default function TeamTabs({ teamId, members, isAdmin, isMember, teamName }: TeamTabsProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'requests' | 'admin' | 'profile' | 'roles'>('roster')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleMemberUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
    // Trigger page refresh to get updated member data
    window.location.reload()
  }

  const tabs = [
    { id: 'roster' as const, label: 'Roster', show: true },
    { id: 'requests' as const, label: 'Join Requests', show: isAdmin },
    { id: 'profile' as const, label: 'Team Profile', show: isAdmin },
    { id: 'roles' as const, label: 'Role Management', show: isAdmin },
    { id: 'admin' as const, label: 'Team Settings', show: isAdmin }
  ].filter(tab => tab.show)

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-slate-700 mb-6">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-all active:scale-95 rounded-t-lg ${
                activeTab === tab.id
                  ? 'text-blue-400 bg-slate-800 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'roster' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Team Roster</h2>
            <div className="text-sm text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</div>
          </div>
          
          <div className="space-y-2">
            {members
              .sort((a, b) => {
                // Sort admins first, then by role, then by name
                if (a.isAdmin && !b.isAdmin) return -1
                if (!a.isAdmin && b.isAdmin) return 1
                if (a.role !== b.role) return a.role.localeCompare(b.role)
                const aName = a.user?.name || a.user?.email || ''
                const bName = b.user?.name || b.user?.email || ''
                return aName.localeCompare(bName)
              })
              .map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">
                          {member.user?.name || member.user?.email || 'Unknown User'}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadge(member.role, member.isAdmin).color}`}>
                          {getRoleBadge(member.role, member.isAdmin).label}
                        </span>
                        {member.isAdmin && (
                          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-medium rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && isAdmin && (
        <TeamJoinRequestsManager teamId={teamId} teamName={teamName || 'Team'} />
      )}

      {activeTab === 'profile' && isAdmin && (
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Team Profile Management</h2>
          <TeamProfileManager teamId={teamId} />
        </div>
      )}

      {activeTab === 'roles' && isAdmin && (
        <div>
          <TeamRoleManager 
            teamId={teamId} 
            members={members} 
            onMemberUpdate={handleMemberUpdate}
          />
        </div>
      )}

      {activeTab === 'admin' && isAdmin && (
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Team Settings</h2>
          <TeamAdminPanel teamId={teamId} members={members} />
        </div>
      )}
    </div>
  )
}
