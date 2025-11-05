"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTeamFilter } from '../context/TeamFilterContext'

export default function ScrimmagesPage() {
  const { selectedTeamId } = useTeamFilter()
  const [scrimmages, setScrimmages] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [teamsRes, scrimmagesRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/scrimmages')
      ])

      const [teamsData, scrimmagesData] = await Promise.all([
        teamsRes.json(),
        scrimmagesRes.json()
      ])

      setTeams(teamsData.teams || [])
      setScrimmages(scrimmagesData.scrimmages || [])
    } catch (error) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12 text-gray-300">Loading grudges...</div>
      </main>
    )
  }

  // Filter scrimmages by selected team
  const filteredScrimmages = selectedTeamId === 'all' 
    ? scrimmages 
    : scrimmages.filter((s) => s.teamId === selectedTeamId)

  const selectedTeam = teams.find((t) => t.teamId === selectedTeamId)

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Grudge</h1>
        <Link
          href="/scrimmages/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
        >
          Create Grudge
        </Link>
      </div>

      {selectedTeam && (
        <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-sm text-gray-400">
            Showing grudges for <span className="font-semibold text-blue-400">{selectedTeam.team.name}</span>
          </div>
        </div>
      )}

      {filteredScrimmages.length === 0 ? (
        <div className="text-gray-400 bg-slate-800 border border-slate-700 p-8 rounded-lg text-center relative">
          <div className="text-lg mb-2">No grudges yet</div>
          <div className="text-sm mb-4">Create a round robin tournament to get started!</div>
          <div className="inline-block group">
            <span className="text-blue-400 cursor-pointer underline decoration-dotted" tabIndex={0}>
              What are grudges?
            </span>
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-slate-900 text-gray-200 text-sm rounded shadow-lg border border-slate-700 px-4 py-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10">
              <strong className="block text-blue-400 mb-2">Grudges Explained</strong>
              Grudges are special round robin tournaments or matchups created for fun, rivalry, or competitive spirit between teams or players. You can use grudges to organize recurring matchups, settle scores, or just add excitement to your games. When grudges are created, they will appear here for you to join, view results, or participate. If you have questions about grudges, ask your team admin or league manager.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScrimmages.map((scrimmage) => (
            <ScrimmageCard 
              key={scrimmage.id} 
              scrimmage={scrimmage} 
              showTeamName={selectedTeamId === 'all'}
              onDelete={loadData}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function ScrimmageCard({ scrimmage, showTeamName, onDelete }: { scrimmage: any; showTeamName: boolean; onDelete: () => void }) {
  const date = new Date(scrimmage.createdAt)
  const participantCount = scrimmage.participants?.length || 0
  const roundCount = scrimmage.scrimmageRounds?.length || 0
  const hasRounds = roundCount > 0

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this grudge?')) {
      return
    }

    try {
      const res = await fetch(`/api/scrimmages/${scrimmage.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        onDelete()
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <Link href={`/scrimmages/${scrimmage.id}`}>
      <div className="border border-slate-700 rounded-lg p-5 bg-slate-800 hover:border-slate-600 transition-colors">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">
              {scrimmage.name || 'Round Robin Tournament'}
            </h3>
            <div className="text-sm text-gray-400 space-y-1">
              {showTeamName && scrimmage.team && (
                <div className="text-blue-400 font-medium">⚽ {scrimmage.team.name}</div>
              )}
              <div>👥 {participantCount} participants</div>
              <div>🎯 {scrimmage.rounds} round{scrimmage.rounds > 1 ? 's' : ''} • {scrimmage.playersPerTeam} vs {scrimmage.playersPerTeam}</div>
              {scrimmage.timedRounds && scrimmage.roundDuration && (
                <div>⏱️ {scrimmage.roundDuration} minutes per round</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Created {date.toLocaleDateString()}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {hasRounds ? (
              <span className="text-sm px-3 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded">
                {roundCount} Round{roundCount > 1 ? 's' : ''} Generated
              </span>
            ) : (
              <span className="text-sm px-3 py-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded">
                Not Generated
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDelete()
              }}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
