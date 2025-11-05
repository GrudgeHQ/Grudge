'use client'

import { useState, useEffect } from 'react'
import { useTeamFilter } from '../context/TeamFilterContext'
import Link from 'next/link'
import InviteTeamButton from '../components/InviteTeamButton'

function getRoleBadge(role: string, isAdmin: boolean) {
  const badges = {
    COACH: { label: 'Coach', color: 'bg-purple-600/20 text-purple-400 border-purple-600/30' },
    COORDINATOR: { label: 'Coordinator', color: 'bg-green-600/20 text-green-400 border-green-600/30' },
    CAPTAIN: { label: 'Captain', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' },
    CO_CAPTAIN: { label: 'Co-Captain', color: 'bg-orange-600/20 text-orange-400 border-orange-600/30' },
    ADMIN: { label: 'Admin', color: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
    MEMBER: { label: 'Member', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' }
  }
  
  return badges[role as keyof typeof badges] || badges.MEMBER
}

interface TeamMember {
  id: string
  userId: string
  role: string
  isAdmin: boolean
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface Team {
  id: string
  name: string
  sport: string
  inviteCode?: string  // Only available to admins
  members: TeamMember[]
}

interface UserTeams {
  teams: Array<{
    teamId: string
    isAdmin: boolean
    team: Team
  }>
}

export default function RosterPage() {
  const { selectedTeamId } = useTeamFilter()
  const [userTeams, setUserTeams] = useState<UserTeams | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserTeams()
  }, [])

  const loadUserTeams = async () => {
    try {
      const response = await fetch('/api/user/teams')
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view rosters')
          return
        }
        throw new Error('Failed to load teams')
      }
      
      const data = await response.json()
      console.log('User teams data:', data) // Debug log
      setUserTeams(data)
    } catch (err) {
      setError('Failed to load team information')
      console.error('Error loading teams:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">Team Roster</h1>
        <div className="text-center py-12">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">Team Roster</h1>
        <div className="text-center py-12">
          <p className="text-gray-400">{error}</p>
        </div>
      </main>
    )
  }

  if (!userTeams || userTeams.teams.length === 0) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">Team Roster</h1>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-4">You are not a member of any teams yet.</p>
          <Link 
            href="/teams/join" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
          >
            Join a Team
          </Link>
        </div>
      </main>
    )
  }

  // Filter teams based on selected team
  const filteredTeams = selectedTeamId === 'all' 
    ? userTeams.teams 
    : userTeams.teams.filter(membership => membership.teamId === selectedTeamId)

  if (selectedTeamId !== 'all' && filteredTeams.length === 0) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">Team Roster</h1>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-4">Selected team not found or you're not a member.</p>
          <p className="text-gray-500 text-sm">Please select a different team from the dropdown above.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">
        {selectedTeamId === 'all' ? 'All Team Rosters' : 'Team Roster'}
      </h1>

      <div className="space-y-6">
        {filteredTeams.map((membership) => {
          const team = membership?.team
          if (!team) return null
          
          const sortedMembers = (team.members || []).sort((a: TeamMember, b: TeamMember) => {
            // Sort admins first, then by role, then by name
            if (a.isAdmin && !b.isAdmin) return -1
            if (!a.isAdmin && b.isAdmin) return 1
            if (a.role !== b.role) return a.role.localeCompare(b.role)
            const aName = a.user?.name || a.user?.email || ''
            const bName = b.user?.name || b.user?.email || ''
            return aName.localeCompare(bName)
          })

          return (
            <div key={team.id} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                  <p className="text-sm text-gray-400">{team.sport}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Show invite button only to admins */}
                  {membership.isAdmin && team.inviteCode && (
                    <InviteTeamButton teamName={team.name} inviteCode={team.inviteCode} />
                  )}
                  <Link
                    href={`/teams/${team.id}`}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
                  >
                    View Team
                  </Link>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-200">
                    Roster ({(team.members || []).length} member{(team.members || []).length !== 1 ? 's' : ''})
                  </h3>
                  {membership.isAdmin && (
                    <span className="text-xs text-green-400 bg-green-600/20 px-2 py-1 rounded border border-green-600/30">
                      You are an admin
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {sortedMembers.map((member: TeamMember) => (
                    <div
                      key={member.id}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 hover:border-slate-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium">
                              {member.user?.name || member.user?.email || 'Unknown User'}
                            </h4>
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
            </div>
          )
        })}
      </div>
    </main>
  )
}
