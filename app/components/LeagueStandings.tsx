'use client'

import { useState } from 'react'
import { getSportTerminology, getStandingsValue } from '@/lib/sportTerminology'

interface TeamStats {
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
}

interface LeagueStandingsProps {
  standings: TeamStats[]
  sport: string
  isLoading?: boolean
  seasonName?: string
  seasonId?: string
}

type SortKey = 'points' | 'wins' | 'goalDifference' | 'goalsFor' | 'winPercentage' | 'teamName'

export default function LeagueStandings({ standings, sport, isLoading, seasonName, seasonId }: LeagueStandingsProps) {
  const [sortBy, setSortBy] = useState<SortKey>('points')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showDetails, setShowDetails] = useState<string | null>(null)
  
  const terminology = getSportTerminology(sport)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-white">
          {seasonName ? `${seasonName} - Standings` : 'League Standings'}
        </h2>
        <div className="text-center py-8 text-gray-400">Loading standings...</div>
      </div>
    )
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-white">
          {seasonName ? `${seasonName} - Standings` : 'League Standings'}
        </h2>
        <div className="text-center py-8 text-gray-400">
          {seasonId ? 'No matches played in this season yet' : 'No active season with matches'}
        </div>
      </div>
    )
  }

  const sortedStandings = [...standings].sort((a, b) => {
    let aVal = a[sortBy]
    let bVal = b[sortBy]
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = (bVal as string).toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder(key === 'teamName' ? 'asc' : 'desc')
    }
  }

  const getSortIcon = (key: SortKey) => {
    if (sortBy !== key) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `${position}.`
    }
  }

    return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4 text-white">
        {seasonName ? `${seasonName} - Standings` : 'League Standings'}
      </h2>      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left py-3 px-2 text-gray-300 font-medium">Pos</th>
              <th 
                className="text-left py-3 px-2 text-gray-300 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('teamName')}
              >
                Team {getSortIcon('teamName')}
              </th>
              <th className="text-center py-3 px-2 text-gray-300 font-medium">GP</th>
              <th 
                className="text-center py-3 px-2 text-gray-300 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('wins')}
              >
                W {getSortIcon('wins')}
              </th>
              <th className="text-center py-3 px-2 text-gray-300 font-medium">D</th>
              <th className="text-center py-3 px-2 text-gray-300 font-medium">L</th>
              <th 
                className="text-center py-3 px-2 text-gray-300 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('goalsFor')}
              >
                {terminology.scoreForAbbr} {getSortIcon('goalsFor')}
              </th>
              <th className="text-center py-3 px-2 text-gray-300 font-medium">{terminology.scoreAgainstAbbr}</th>
              <th 
                className="text-center py-3 px-2 text-gray-300 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('goalDifference')}
              >
                +/- {getSortIcon('goalDifference')}
              </th>
              {terminology.pointsSystem ? (
                <th 
                  className="text-center py-3 px-2 text-gray-300 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('points')}
                >
                  {terminology.pointsLabel} {getSortIcon('points')}
                </th>
              ) : (
                <th 
                  className="text-center py-3 px-2 text-gray-300 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('winPercentage')}
                >
                  Win% {getSortIcon('winPercentage')}
                </th>
              )}
              <th 
                className="text-center py-3 px-2 text-gray-300 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('winPercentage')}
              >
                Win% {getSortIcon('winPercentage')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team, index) => (
              <tr 
                key={team.teamId} 
                className={`border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-900/20 to-transparent' : ''
                }`}
              >
                <td className="py-3 px-2 text-center">
                  <span className="text-lg">{getPositionIcon(index + 1)}</span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium text-white">{team.teamName}</div>
                      <div className="text-xs text-gray-400">{team.members.length} members</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-gray-300">{team.gamesPlayed}</td>
                <td className="py-3 px-2 text-center text-green-400 font-medium">{team.wins}</td>
                <td className="py-3 px-2 text-center text-yellow-400">{team.draws}</td>
                <td className="py-3 px-2 text-center text-red-400">{team.losses}</td>
                <td className="py-3 px-2 text-center text-blue-400 font-medium">{team.goalsFor}</td>
                <td className="py-3 px-2 text-center text-gray-300">{team.goalsAgainst}</td>
                <td className={`py-3 px-2 text-center font-medium ${
                  team.goalDifference > 0 ? 'text-green-400' : 
                  team.goalDifference < 0 ? 'text-red-400' : 'text-gray-300'
                }`}>
                  {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                </td>
                <td className="py-3 px-2 text-center text-white font-bold text-lg">
                  {terminology.pointsSystem ? team.points : `${team.winPercentage.toFixed(1)}%`}
                </td>
                <td className="py-3 px-2 text-center text-gray-300">
                  {team.winPercentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedStandings.map((team, index) => (
          <div 
            key={team.teamId}
            className={`bg-slate-700 rounded-lg p-4 ${
              index < 3 ? 'ring-2 ring-yellow-600/50' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getPositionIcon(index + 1)}</span>
                <div>
                  <div className="font-medium text-white">{team.teamName}</div>
                  <div className="text-xs text-gray-400">{team.members.length} members</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">
                  {terminology.pointsSystem ? `${team.points} ${terminology.pointsLabel.toLowerCase()}` : `${team.winPercentage.toFixed(1)}%`}
                </div>
                <div className="text-sm text-gray-400">{team.winPercentage.toFixed(1)}% win</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400">Record</div>
                <div className="text-white font-medium">
                  <span className="text-green-400">{team.wins}</span>-
                  <span className="text-red-400">{team.losses}</span>-
                  <span className="text-yellow-400">{team.draws}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">{terminology.scoreFor.replace(' For', '')}</div>
                <div className="text-white font-medium">
                  <span className="text-blue-400">{team.goalsFor}</span>-{team.goalsAgainst}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Diff</div>
                <div className={`font-medium ${
                  team.goalDifference > 0 ? 'text-green-400' : 
                  team.goalDifference < 0 ? 'text-red-400' : 'text-gray-300'
                }`}>
                  {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(showDetails === team.teamId ? null : team.teamId)}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              {showDetails === team.teamId ? 'Hide' : 'Show'} Team Details
            </button>

            {showDetails === team.teamId && (
              <div className="mt-3 pt-3 border-t border-slate-600">
                <div className="text-sm text-gray-400 mb-2">Team Members:</div>
                <div className="space-y-1">
                  {team.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{member.name || member.email}</span>
                      {member.isAdmin && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Admin</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-600 text-xs text-gray-400">
        <div className="flex flex-wrap gap-4">
          <span>GP = Games Played</span>
          <span>W = Wins</span>
          <span>D = Draws</span>
          <span>L = Losses</span>
          <span>{terminology.scoreForAbbr} = {terminology.scoreFor}</span>
          <span>{terminology.scoreAgainstAbbr} = {terminology.scoreAgainst}</span>
          <span>+/- = {terminology.scoreDifference}</span>
          {terminology.pointsSystem ? (
            <span>{terminology.pointsLabel} = Points (3 for win, 1 for draw)</span>
          ) : (
            <span>Win% = Win Percentage</span>
          )}
        </div>
      </div>
    </div>
  )
}
