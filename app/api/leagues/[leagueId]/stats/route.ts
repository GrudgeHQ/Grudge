import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has access to this league (is member of a team in the league)
    const userTeamInLeague = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: {
          members: {
            some: { userId: user.id }
          }
        }
      }
    })

    if (!userTeamInLeague) {
      return NextResponse.json({ error: 'Access denied - not a member of this league' }, { status: 403 })
    }

    // Get league information
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        teams: {
          include: {
            team: {
              include: {
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Get all completed matches for this league through LeagueMatch relation
    const completedMatches = await prisma.match.findMany({
      where: {
        leagueMatch: {
          leagueId: leagueId
        },
        homeScore: { not: null },
        awayScore: { not: null }
      },
      include: {
        team: {
          select: { id: true, name: true }
        },
        opponentTeam: {
          select: { id: true, name: true }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    })

    // Get all league match records
    const leagueMatches = await prisma.leagueMatch.findMany({
      where: {
        leagueId,
        homeScore: { not: null },
        awayScore: { not: null }
      },
      include: {
        homeTeam: {
          select: { id: true, name: true }
        },
        awayTeam: {
          select: { id: true, name: true }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    })

    // Calculate team statistics
    const teamStats = new Map()
    
    // Initialize stats for all teams in the league
    league.teams.forEach(({ team }) => {
      teamStats.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0, // 3 for win, 1 for draw, 0 for loss
        winPercentage: 0,
        members: team.members.map(m => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          isAdmin: m.isAdmin
        }))
      })
    })

    // Process regular matches
    completedMatches.forEach(match => {
      const homeTeam = match.team
      const awayTeam = match.opponentTeam
      const homeScore = match.homeScore!
      const awayScore = match.awayScore!

      if (homeTeam && awayTeam && teamStats.has(homeTeam.id) && teamStats.has(awayTeam.id)) {
        const homeStats = teamStats.get(homeTeam.id)
        const awayStats = teamStats.get(awayTeam.id)

        // Update games played
        homeStats.gamesPlayed++
        awayStats.gamesPlayed++

        // Update goals
        homeStats.goalsFor += homeScore
        homeStats.goalsAgainst += awayScore
        awayStats.goalsFor += awayScore
        awayStats.goalsAgainst += homeScore

        // Update wins/losses/draws
        if (homeScore > awayScore) {
          homeStats.wins++
          homeStats.points += 3
          awayStats.losses++
        } else if (homeScore < awayScore) {
          awayStats.wins++
          awayStats.points += 3
          homeStats.losses++
        } else {
          homeStats.draws++
          awayStats.draws++
          homeStats.points += 1
          awayStats.points += 1
        }
      }
    })

    // Process league matches
    leagueMatches.forEach(match => {
      const homeTeam = match.homeTeam
      const awayTeam = match.awayTeam
      const homeScore = match.homeScore!
      const awayScore = match.awayScore!

      if (teamStats.has(homeTeam.id) && teamStats.has(awayTeam.id)) {
        const homeStats = teamStats.get(homeTeam.id)
        const awayStats = teamStats.get(awayTeam.id)

        // Update games played
        homeStats.gamesPlayed++
        awayStats.gamesPlayed++

        // Update goals
        homeStats.goalsFor += homeScore
        homeStats.goalsAgainst += awayScore
        awayStats.goalsFor += awayScore
        awayStats.goalsAgainst += homeScore

        // Update wins/losses/draws
        if (homeScore > awayScore) {
          homeStats.wins++
          homeStats.points += 3
          awayStats.losses++
        } else if (homeScore < awayScore) {
          awayStats.wins++
          awayStats.points += 3
          homeStats.losses++
        } else {
          homeStats.draws++
          awayStats.draws++
          homeStats.points += 1
          awayStats.points += 1
        }
      }
    })

    // Calculate derived statistics
    Array.from(teamStats.values()).forEach(stats => {
      stats.goalDifference = stats.goalsFor - stats.goalsAgainst
      stats.winPercentage = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0
    })

    // Sort standings by points (descending), then by goal difference, then by goals for
    const standings = Array.from(teamStats.values()).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference
      return b.goalsFor - a.goalsFor
    })

    // Calculate league summary statistics
    const totalGames = standings.reduce((sum, team) => sum + team.gamesPlayed, 0) / 2 // Divide by 2 since each game involves 2 teams
    const totalGoals = standings.reduce((sum, team) => sum + team.goalsFor, 0)
    const averageGoalsPerGame = totalGames > 0 ? totalGoals / totalGames : 0

    // Get recent matches (last 10)
    const recentMatches = [
      ...completedMatches.map(match => ({
        id: match.id,
        homeTeam: match.team?.name || 'Unknown',
        awayTeam: match.opponentTeam?.name || match.opponentName || 'Unknown',
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        scheduledAt: match.scheduledAt,
        type: 'regular'
      })),
      ...leagueMatches.map(match => ({
        id: match.id,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        scheduledAt: match.scheduledAt,
        type: 'league'
      }))
    ]
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 10)

    // Calculate top scorers (teams with highest goals for)
    const topScoringTeams = standings.slice(0, 5).map(team => ({
      teamName: team.teamName,
      goalsFor: team.goalsFor,
      gamesPlayed: team.gamesPlayed,
      averageGoalsPerGame: team.gamesPlayed > 0 ? (team.goalsFor / team.gamesPlayed).toFixed(1) : '0.0'
    }))

    // Calculate best defense (teams with lowest goals against)
    const bestDefensiveTeams = standings
      .filter(team => team.gamesPlayed > 0)
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst)
      .slice(0, 5)
      .map(team => ({
        teamName: team.teamName,
        goalsAgainst: team.goalsAgainst,
        gamesPlayed: team.gamesPlayed,
        averageGoalsAgainstPerGame: (team.goalsAgainst / team.gamesPlayed).toFixed(1)
      }))

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        sport: league.sport,
        creator: league.creator
      },
      standings,
      summary: {
        totalTeams: league.teams.length,
        totalGames,
        totalGoals,
        averageGoalsPerGame: parseFloat(averageGoalsPerGame.toFixed(1))
      },
      recentMatches,
      topScoringTeams,
      bestDefensiveTeams,
      isLeagueManager: user.id === league.creatorId
    })

  } catch (error) {
    console.error('Error fetching league statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}