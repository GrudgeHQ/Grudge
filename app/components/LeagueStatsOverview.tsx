'use client'

import { getSportTerminology, getSportIcon, getDefensiveInfo } from '@/lib/sportTerminology'

interface RecentMatch {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  scheduledAt: string
  type: 'regular' | 'league'
}

interface LeagueStatsOverviewProps {
  sport: string
  summary: {
    totalTeams: number
    totalGames: number
    totalGoals: number
    averageGoalsPerGame: number
  }
  recentMatches: RecentMatch[]
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
  isLoading?: boolean
}

export default function LeagueStatsOverview({ 
  sport,
  summary, 
  recentMatches, 
  topScoringTeams, 
  bestDefensiveTeams, 
  isLoading 
}: LeagueStatsOverviewProps) {
  const terminology = getSportTerminology(sport)
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="text-center py-8 text-gray-400">Loading league statistics...</div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* League Summary Stats */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">League Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{summary.totalTeams}</div>
            <div className="text-sm text-gray-400">Teams</div>
          </div>
          <div className="text-center p-4 bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{summary.totalGames}</div>
            <div className="text-sm text-gray-400">Games Played</div>
          </div>
          <div className="text-center p-4 bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{summary.totalGoals}</div>
            <div className="text-sm text-gray-400">Total {terminology.scoreFor.replace(' For', '')}</div>
          </div>
          <div className="text-center p-4 bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">{summary.averageGoalsPerGame}</div>
            <div className="text-sm text-gray-400">Avg {terminology.scoreFor.replace(' For', '')}/Game</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Matches */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Recent Matches</h3>
          {recentMatches.length === 0 ? (
            <div className="text-center py-6 text-gray-400">No matches played yet</div>
          ) : (
            <div className="space-y-3">
              {recentMatches.map(match => (
                <div key={match.id} className="bg-slate-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-white font-medium truncate">{match.homeTeam}</span>
                        <div className="flex items-center gap-1 bg-slate-600 px-2 py-1 rounded">
                          <span className="text-white font-bold">{match.homeScore}</span>
                          <span className="text-gray-400">-</span>
                          <span className="text-white font-bold">{match.awayScore}</span>
                        </div>
                        <span className="text-white font-medium truncate">{match.awayTeam}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      match.type === 'league' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {match.type === 'league' ? 'League' : 'Regular'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(match.scheduledAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Scoring Teams */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            {getSportIcon(sport)} Top {terminology.scoreFor.replace(' For', '')} Teams
          </h3>
          {topScoringTeams.length === 0 ? (
            <div className="text-center py-6 text-gray-400">No data available</div>
          ) : (
            <div className="space-y-3">
              {topScoringTeams.map((team, index) => (
                <div key={team.teamName} className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-medium">{team.teamName}</div>
                      <div className="text-xs text-gray-400">{team.gamesPlayed} games played</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">{team.goalsFor}</div>
                    <div className="text-xs text-gray-400">{team.averageGoalsPerGame}/{terminology.scoreFor.includes('Goals') ? 'game' : terminology.scoreFor.includes('Points') ? 'game' : terminology.scoreFor.includes('Runs') ? 'game' : 'match'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Best Defensive Teams */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
          {getDefensiveInfo(sport).icon} {getDefensiveInfo(sport).label}
        </h3>
        {bestDefensiveTeams.length === 0 ? (
          <div className="text-center py-6 text-gray-400">No data available</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bestDefensiveTeams.map((team, index) => (
              <div key={team.teamName} className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="text-green-400 font-bold">{team.goalsAgainst}</div>
                </div>
                <div className="text-white font-medium mb-1">{team.teamName}</div>
                <div className="text-xs text-gray-400">
                  {team.averageGoalsAgainstPerGame} {terminology.scoreFor.replace(' For', '').toLowerCase()}/game • {team.gamesPlayed} games
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
