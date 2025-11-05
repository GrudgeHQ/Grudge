'use client'

import { useState, useEffect } from 'react'
import LeagueStandings from './LeagueStandings'
import LeagueStatsOverview from './LeagueStatsOverview'
import { getSportTerminology } from '@/lib/sportTerminology'

interface LeagueLeaderboardProps {
  leagueId: string
  seasonId?: string
}

interface LeagueStats {
  league: {
    id: string
    name: string
    sport: string
    creator: {
      id: string
      name: string
      email: string
    }
  }
  standings: Array<{
    teamId: string
    teamName: string
    gamesPlayed: number
    wins: number
    losses: number
    draws: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    points: number
    winPercentage: number
    members: Array<{
      id: string
      name: string
      email: string
      isAdmin: boolean
    }>
  }>
  summary: {
    totalTeams: number
    totalGames: number
    totalGoals: number
    averageGoalsPerGame: number
  }
  recentMatches: Array<{
    id: string
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    scheduledAt: string
    type: 'regular' | 'league'
  }>
  topScoringTeams: Array<{
    teamName: string
    goalsFor: number
    gamesPlayed: number
    averageGoalsPerGame: string
  }>
  bestDefensiveTeams: Array<{
    teamName: string
    goalsAgainst: number
    gamesPlayed: number
    averageGoalsAgainstPerGame: string
  }>
  isLeagueManager: boolean
}

export default function LeagueLeaderboard({ leagueId }: LeagueLeaderboardProps) {
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'standings' | 'overview'>('standings')

  useEffect(() => {
    if (!leagueId) return
    loadLeagueStats()
  }, [leagueId])

  const loadLeagueStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/leagues/${leagueId}/stats`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load league statistics')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      console.error('Error loading league stats:', err)
      setError(err.message || 'Failed to load league statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <div className="text-gray-400">Loading league statistics...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">❌ Error loading statistics</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={loadLeagueStats}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="text-center py-12 text-gray-400">No statistics available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* League Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              📊 {stats.league.name} Statistics
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>🏆 {stats.league.sport}</span>
              <span>👥 {stats.summary.totalTeams} teams</span>
              <span>⚽ {stats.summary.totalGames} games played</span>
              {stats.isLeagueManager && (
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">League Manager</span>
              )}
            </div>
          </div>
          <button
            onClick={loadLeagueStats}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 hover:text-white transition-colors"
            title="Refresh statistics"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg">
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'standings'
                ? 'text-white bg-slate-700 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            🏆 Standings & Rankings
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-white bg-slate-700 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            📈 Stats & Overview
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'standings' ? (
            <LeagueStandings standings={stats.standings} sport={stats.league.sport} isLoading={loading} />
          ) : (
            <LeagueStatsOverview
              sport={stats.league.sport}
              summary={stats.summary}
              recentMatches={stats.recentMatches}
              topScoringTeams={stats.topScoringTeams}
              bestDefensiveTeams={stats.bestDefensiveTeams}
              isLoading={loading}
            />
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      {stats.summary.totalGames > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-center text-sm text-gray-400">
            League Statistics • Last updated: {new Date().toLocaleString()} • 
            Total of <span className="text-white font-medium">{stats.summary.totalGoals}</span> {(() => {
              const terminology = getSportTerminology(stats.league.sport)
              return terminology.scoreFor.replace(' For', '').toLowerCase()
            })()} scored in{' '}
            <span className="text-white font-medium">{stats.summary.totalGames}</span> games
          </div>
        </div>
      )}
    </div>
  )
}
