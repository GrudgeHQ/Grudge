'use client'

import { useState, useEffect } from 'react'
import LeagueStandings from './LeagueStandings'

interface SeasonStandingsProps {
  leagueId: string
  seasonId?: string
}

interface Season {
  id: string
  name: string
  status: string
  scheduleType: string
  startDate: string | null
  endDate: string | null
  teams: Array<{
    id: string
    name: string
    sport: string
  }>
  matchCount: number
  completedMatches: number
}

export default function SeasonStandings({ leagueId, seasonId }: SeasonStandingsProps) {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [standings, setStandings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSeason()
  }, [leagueId, seasonId])

  const loadSeason = async () => {
    try {
      setLoading(true)
      if (seasonId) {
        // Fetch specific season
        const seasonResponse = await fetch(`/api/leagues/${leagueId}/seasons/${seasonId}`)
        if (!seasonResponse.ok) {
          throw new Error('Failed to load season')
        }
        const seasonData = await seasonResponse.json()
        setCurrentSeason(seasonData.season)
        // Load standings for this season
        const standingsResponse = await fetch(`/api/leagues/${leagueId}/seasons/${seasonId}/standings`)
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json()
          setStandings(standingsData.standings)
        } else {
          setStandings([])
        }
      } else {
        // Fallback: get current active season
        const seasonResponse = await fetch(`/api/leagues/${leagueId}/current-season`)
        if (!seasonResponse.ok) {
          throw new Error('Failed to load current season')
        }
        const seasonData = await seasonResponse.json()
        setCurrentSeason(seasonData.currentSeason)
        if (seasonData.currentSeason) {
          // Load standings for this season
          const standingsResponse = await fetch(`/api/leagues/${leagueId}/seasons/${seasonData.currentSeason.id}/standings`)
          if (standingsResponse.ok) {
            const standingsData = await standingsResponse.json()
            setStandings(standingsData.standings)
          }
        } else {
          setStandings([])
        }
      }
    } catch (err) {
      console.error('Error loading season standings:', err)
      setError('Failed to load season standings')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg p-6">
        <div className="text-center py-8 text-slate-400">Loading season standings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-lg p-6">
        <div className="text-center py-8 text-red-400">{error}</div>
      </div>
    )
  }

  if (!currentSeason) {
    return (
      <div className="bg-slate-900 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-white">Season Standings</h3>
        <div className="text-center py-8 text-slate-400">
          <p className="mb-4">No active season found.</p>
          <p className="text-sm">League managers can create a new season to start tracking standings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">{currentSeason.name}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            currentSeason.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
            currentSeason.status === 'DRAFT' ? 'bg-yellow-500/20 text-yellow-400' :
            currentSeason.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {currentSeason.status}
          </span>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <span>📅 {currentSeason.scheduleType.replace('_', ' ')}</span>
          <span>👥 {Array.isArray(currentSeason.teams) ? currentSeason.teams.length : 0} teams</span>
          <span>⚽ {currentSeason.completedMatches}/{currentSeason.matchCount} matches played</span>
        </div>
        
        {currentSeason.startDate && (
          <div className="mt-2 text-sm text-slate-400">
            Season: {new Date(currentSeason.startDate).toLocaleDateString()} - {
              currentSeason.endDate ? new Date(currentSeason.endDate).toLocaleDateString() : 'Ongoing'
            }
          </div>
        )}
      </div>

      <LeagueStandings
        standings={standings}
        sport={Array.isArray(currentSeason.teams) && currentSeason.teams[0]?.sport ? currentSeason.teams[0].sport : 'soccer'}
        seasonName={currentSeason.name}
        seasonId={currentSeason.id}
        isLoading={false}
      />
    </div>
  )
}