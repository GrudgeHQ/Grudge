import { prisma } from './prisma'

interface TeamStanding {
  teamId: string
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export async function calculateSeasonStandings(seasonId: string): Promise<TeamStanding[]> {
  // Get all teams in the season
  const seasonTeams = await prisma.seasonTeam.findMany({
    where: { seasonId },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  // Get all completed matches for the season
  const completedMatches = await prisma.seasonMatch.findMany({
    where: {
      seasonId,
      status: 'COMPLETED',
      homeScore: { not: null },
      awayScore: { not: null }
    },
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true
        }
      },
      awayTeam: {
        select: {
          id: true,
          name: true  
        }
      }
    }
  })

  // Initialize standings for each team
  const standings: { [teamId: string]: TeamStanding } = {}
  
  seasonTeams.forEach(seasonTeam => {
    standings[seasonTeam.teamId] = {
      teamId: seasonTeam.teamId,
      teamName: seasonTeam.team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    }
  })

  // Process each completed match
  completedMatches.forEach(match => {
    const homeTeamId = match.homeTeam.id
    const awayTeamId = match.awayTeam.id
    const homeScore = match.homeScore!
    const awayScore = match.awayScore!

    // Update home team stats
    if (standings[homeTeamId]) {
      standings[homeTeamId].played++
      standings[homeTeamId].goalsFor += homeScore
      standings[homeTeamId].goalsAgainst += awayScore
      
      if (homeScore > awayScore) {
        standings[homeTeamId].won++
        standings[homeTeamId].points += 3
      } else if (homeScore === awayScore) {
        standings[homeTeamId].drawn++
        standings[homeTeamId].points += 1
      } else {
        standings[homeTeamId].lost++
      }
    }

    // Update away team stats
    if (standings[awayTeamId]) {
      standings[awayTeamId].played++
      standings[awayTeamId].goalsFor += awayScore
      standings[awayTeamId].goalsAgainst += homeScore
      
      if (awayScore > homeScore) {
        standings[awayTeamId].won++
        standings[awayTeamId].points += 3
      } else if (awayScore === homeScore) {
        standings[awayTeamId].drawn++
        standings[awayTeamId].points += 1
      } else {
        standings[awayTeamId].lost++
      }
    }
  })

  // Calculate goal difference for each team
  Object.values(standings).forEach(team => {
    team.goalDifference = team.goalsFor - team.goalsAgainst
  })

  // Sort standings by points (desc), then goal difference (desc), then goals for (desc)
  return Object.values(standings).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName)
  })
}

export async function updateSeasonMatchScore(
  seasonMatchId: string, 
  homeScore: number, 
  awayScore: number,
  status: 'COMPLETED' = 'COMPLETED'
) {
  // Update the season match with confirmed scores
  const updatedMatch = await prisma.seasonMatch.update({
    where: { id: seasonMatchId },
    data: {
      homeScore,
      awayScore,
      status,
      winnerId: homeScore > awayScore 
        ? (await prisma.seasonMatch.findUnique({
            where: { id: seasonMatchId },
            select: { homeTeamId: true }
          }))?.homeTeamId
        : awayScore > homeScore 
          ? (await prisma.seasonMatch.findUnique({
              where: { id: seasonMatchId },
              select: { awayTeamId: true }
            }))?.awayTeamId
          : null // Draw
    },
    include: {
      season: {
        select: {
          id: true,
          leagueId: true
        }
      }
    }
  })

  // Recalculate and store standings if needed (for performance optimization)
  // You could store standings in a separate table if real-time performance is critical
  
  return updatedMatch
}