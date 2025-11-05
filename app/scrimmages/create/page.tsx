"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTeamFilter } from '@/app/context/TeamFilterContext'

export default function CreateScrimmagePage() {
  const router = useRouter()
  const { selectedTeamId } = useTeamFilter()
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [leagueInfo, setLeagueInfo] = useState<any>(null)
  const [leagueMembers, setLeagueMembers] = useState<any[]>([])
  const [participantSource, setParticipantSource] = useState<'team' | 'league'>('team')
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [linkedGroups, setLinkedGroups] = useState<string[][]>([])
  const [showLinkedGroups, setShowLinkedGroups] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    rounds: 3,
    playersPerTeam: 2,
    timedRounds: false,
    roundDuration: 10
  })

  useEffect(() => {
    loadTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam)
      checkTeamLeague(selectedTeam)
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedTeamId && selectedTeamId !== 'all' && teams.length > 0) {
      setSelectedTeam(selectedTeamId)
    }
  }, [selectedTeamId, teams])

  async function loadTeams() {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      setTeams(data.teams || [])
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  async function loadTeamMembers(teamId: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`)
      const data = await res.json()
      setTeamMembers(data.members || [])
    } catch (e) {
      // ignore
    }
  }

  async function checkTeamLeague(teamId: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/league`)
      const data = await res.json()
      
      if (res.ok && data.league) {
        setLeagueInfo(data.league)
        // If league exists, load league members
        loadLeagueMembers(data.league.id)
      } else {
        setLeagueInfo(null)
        setLeagueMembers([])
        setParticipantSource('team') // Reset to team only if no league
      }
    } catch (err) {
      setLeagueInfo(null)
      setLeagueMembers([])
      setParticipantSource('team')
    }
  }

  async function loadLeagueMembers(leagueId: string) {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/members`)
      const data = await res.json()
      setLeagueMembers(data.members || [])
    } catch (e) {
      setLeagueMembers([])
    }
  }

  function toggleParticipant(userId: string) {
    const newSet = new Set(selectedParticipants)
    if (newSet.has(userId)) {
      newSet.delete(userId)
    } else {
      newSet.add(userId)
    }
    setSelectedParticipants(newSet)
  }

  function selectAll() {
    const currentMembers = participantSource === 'league' ? leagueMembers : teamMembers
    setSelectedParticipants(new Set(currentMembers.map((m) => m.user.id)))
  }

  function deselectAll() {
    setSelectedParticipants(new Set())
  }

  // Reset selected participants when changing source
  const handleParticipantSourceChange = (source: 'team' | 'league') => {
    setParticipantSource(source)
    setSelectedParticipants(new Set()) // Clear selections when switching
    setLinkedGroups([]) // Clear linked groups when switching
  }

  // Linked groups management
  const addLinkedGroup = () => {
    if (linkedGroups.length < Math.floor(selectedParticipants.size / form.playersPerTeam)) {
      setLinkedGroups([...linkedGroups, []])
    }
  }

  const removeLinkedGroup = (groupIndex: number) => {
    const newGroups = linkedGroups.filter((_, index) => index !== groupIndex)
    setLinkedGroups(newGroups)
  }

  const addPlayerToGroup = (groupIndex: number, userId: string) => {
    const newGroups = [...linkedGroups]
    // Remove from any existing group first
    newGroups.forEach(group => {
      const index = group.indexOf(userId)
      if (index > -1) group.splice(index, 1)
    })
    // Add to the specified group if it's not full
    if (newGroups[groupIndex].length < form.playersPerTeam) {
      newGroups[groupIndex].push(userId)
    }
    setLinkedGroups(newGroups)
  }

  const removePlayerFromGroup = (groupIndex: number, userId: string) => {
    const newGroups = [...linkedGroups]
    const playerIndex = newGroups[groupIndex].indexOf(userId)
    if (playerIndex > -1) {
      newGroups[groupIndex].splice(playerIndex, 1)
    }
    setLinkedGroups(newGroups)
  }

  const getPlayerName = (userId: string) => {
    const currentMembers = participantSource === 'league' ? leagueMembers : teamMembers
    const member = currentMembers.find((m) => m.user.id === userId)
    return member?.user.name || member?.user.email || 'Unknown'
  }

  const getAvailablePlayersForGroups = () => {
    const groupedPlayers = new Set(linkedGroups.flat())
    return Array.from(selectedParticipants).filter(userId => !groupedPlayers.has(userId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedTeam) {
      alert('Please select a team')
      return
    }

    if (selectedParticipants.size === 0) {
      alert('Please select at least one participant')
      return
    }

    const minPlayers = form.playersPerTeam * 2
    if (selectedParticipants.size < minPlayers) {
      alert(`You need at least ${minPlayers} participants for ${form.playersPerTeam}v${form.playersPerTeam} matches`)
      return
    }

    setSubmitting(true)

    try {
      const currentMembers = participantSource === 'league' ? leagueMembers : teamMembers
      const participants = Array.from(selectedParticipants).map((userId) => {
        const member = currentMembers.find((m) => m.user.id === userId)
        return {
          userId,
          userName: member?.user.name || 'Unknown'
        }
      })

      const res = await fetch('/api/scrimmages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam,
          name: form.name || null,
          rounds: form.rounds,
          playersPerTeam: form.playersPerTeam,
          timedRounds: form.timedRounds,
          roundDuration: form.timedRounds ? form.roundDuration : null,
          participants,
          linkedGroups: linkedGroups.filter(group => group.length > 0) // Only send non-empty groups
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/scrimmages/${data.scrimmage.id}`)
      } else {
        alert('Failed to create grudge')
        setSubmitting(false)
      }
    } catch (e) {
      alert('An error occurred')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading...</div>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Grudge
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-white mb-6">Create Round Robin Tournament</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Team <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a team</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tournament Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Tournament Name <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Friday Night Grudge"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Number of Rounds <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.rounds}
                onChange={(e) => setForm({ ...form, rounds: parseInt(e.target.value) || 1 })}
                required
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Players Per Team <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="11"
                value={form.playersPerTeam}
                onChange={(e) => setForm({ ...form, playersPerTeam: parseInt(e.target.value) || 1 })}
                required
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-400 mt-1">
                Format: {form.playersPerTeam} vs {form.playersPerTeam}
              </div>
            </div>
          </div>

          {/* Timed Rounds */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.timedRounds}
                onChange={(e) => setForm({ ...form, timedRounds: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-300">Timed Rounds</span>
            </label>
            {form.timedRounds && (
              <div className="mt-3 ml-6">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Round Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={form.roundDuration}
                  onChange={(e) => setForm({ ...form, roundDuration: parseInt(e.target.value) || 10 })}
                  className="w-full max-w-xs bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Participant Source Selection */}
          {selectedTeam && (
            <div>
              {leagueInfo ? (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Participant Source
                </label>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="participantSource"
                      value="team"
                      checked={participantSource === 'team'}
                      onChange={(e) => handleParticipantSourceChange(e.target.value as 'team')}
                      className="mr-3 text-blue-500"
                    />
                    <div>
                      <span className="text-gray-300">Team Members Only</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Include only members from your selected team
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="participantSource"
                      value="league"
                      checked={participantSource === 'league'}
                      onChange={(e) => handleParticipantSourceChange(e.target.value as 'league')}
                      className="mr-3 text-blue-500"
                    />
                    <div>
                      <span className="text-gray-300">League Members</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Include members from all teams in <span className="text-blue-400">{leagueInfo.name}</span>
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <div className="text-sm text-gray-300 mb-1">Participant Source: Team Members Only</div>
                <div className="text-xs text-gray-400">
                  Your team is not in a league. Only team members can participate.
                  <Link href="/leagues" className="text-blue-400 hover:underline ml-1">
                    Join a league
                  </Link> to include members from other teams.
                </div>
              </div>
            )}
            </div>
          )}

          {/* Participant Selection */}
          {selectedTeam && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Select Participants <span className="text-red-400">*</span>
                  <span className="text-gray-500 ml-2">({selectedParticipants.size} selected)</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 transition-all"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
{(() => {
                const currentMembers = participantSource === 'league' ? leagueMembers : teamMembers
                const sourceLabel = participantSource === 'league' ? 'league members' : 'team members'
                
                return currentMembers.length === 0 ? (
                  <div className="text-sm text-gray-400 p-4 bg-slate-700 rounded border border-slate-600">
                    No {sourceLabel} found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto p-3 bg-slate-700 rounded border border-slate-600">
                    {currentMembers.map((member) => (
                      <label
                        key={member.user.id}
                        className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                          selectedParticipants.has(member.user.id)
                            ? 'bg-blue-600/20 border border-blue-500'
                            : 'bg-slate-800 border border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedParticipants.has(member.user.id)}
                          onChange={() => toggleParticipant(member.user.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-white">{member.user.name || member.user.email}</span>
                          {participantSource === 'league' && (
                            <span className="text-xs text-gray-400">{member.team.name}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )
              })()}
              
              {selectedParticipants.size > 0 && (
                <div className="mt-2 text-sm text-gray-400">
                  {selectedParticipants.size < form.playersPerTeam * 2 && (
                    <div className="text-yellow-400">
                      ⚠️ Need at least {form.playersPerTeam * 2} participants for {form.playersPerTeam}v{form.playersPerTeam}
                    </div>
                  )}
                  {selectedParticipants.size % (form.playersPerTeam * 2) !== 0 && selectedParticipants.size >= form.playersPerTeam * 2 && (
                    <div className="text-blue-400">
                      ℹ️ With {selectedParticipants.size} participants, {selectedParticipants.size % (form.playersPerTeam * 2)} will sit out each round
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Linked Player Groups */}
          {selectedTeam && selectedParticipants.size >= form.playersPerTeam * 2 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Linked Player Groups <span className="text-gray-500">(optional)</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Players in the same group will always be on the same team together
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLinkedGroups(!showLinkedGroups)}
                  className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-all"
                >
                  {showLinkedGroups ? 'Hide' : 'Setup Groups'}
                </button>
              </div>

              {showLinkedGroups && (
                <div className="space-y-4 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                  {/* Add Group Button */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">
                      Groups: {linkedGroups.length} (max: {Math.floor(selectedParticipants.size / form.playersPerTeam)})
                    </div>
                    <button
                      type="button"
                      onClick={addLinkedGroup}
                      disabled={linkedGroups.length >= Math.floor(selectedParticipants.size / form.playersPerTeam)}
                      className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      + Add Group
                    </button>
                  </div>

                  {/* Linked Groups */}
                  {linkedGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border border-slate-600 rounded-lg p-3 bg-slate-800">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-white">
                          Group {groupIndex + 1} ({group.length}/{form.playersPerTeam})
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeLinkedGroup(groupIndex)}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Players in Group */}
                      <div className="space-y-2 mb-3">
                        {group.map((userId) => (
                          <div key={userId} className="flex items-center justify-between p-2 bg-slate-700 border border-slate-600 rounded">
                            <span className="text-sm text-white">{getPlayerName(userId)}</span>
                            <button
                              type="button"
                              onClick={() => removePlayerFromGroup(groupIndex, userId)}
                              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Available Players to Add */}
                      {group.length < form.playersPerTeam && (
                        <div>
                          <div className="text-xs text-gray-400 mb-2">Add player to group:</div>
                          <div className="flex flex-wrap gap-1">
                            {getAvailablePlayersForGroups().map((userId) => (
                              <button
                                key={userId}
                                type="button"
                                onClick={() => addPlayerToGroup(groupIndex, userId)}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
                              >
                                {getPlayerName(userId)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Available Players (not in any group) */}
                  {getAvailablePlayersForGroups().length > 0 && (
                    <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">
                        Available Players ({getAvailablePlayersForGroups().length})
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        These players will be randomly assigned to teams in each round
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getAvailablePlayersForGroups().map((userId) => (
                          <span
                            key={userId}
                            className="text-xs px-2 py-1 bg-gray-600 text-white rounded"
                          >
                            {getPlayerName(userId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="submit"
              disabled={submitting || selectedParticipants.size < form.playersPerTeam * 2}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Grudge'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 active:bg-slate-700 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

