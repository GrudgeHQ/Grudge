import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// Temporary enums until Prisma client is regenerated
enum SeasonScheduleType {
  ROUND_ROBIN = 'ROUND_ROBIN',
  FIXED_GAMES = 'FIXED_GAMES'
}

enum SeasonStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}



// POST /api/leagues/[leagueId]/seasons/[seasonId]/generate-schedule - Generate season schedule
export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; seasonId: string }> }
) {
  try {
    const { leagueId, seasonId } = await params
    const session = (await getServerSession(authOptions as any)) as any
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get season with teams
    const season = await prisma.season.findUnique({
      where: { id: seasonId, leagueId },
      include: {
        league: true,
        seasonTeams: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        seasonMatches: true
      }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Verify user is league manager
    if (season.league.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only league managers can generate schedules' }, { status: 403 })
    }

    // Can only generate schedule for draft seasons
    if (season.status !== SeasonStatus.DRAFT) {
      return NextResponse.json({ error: 'Schedule can only be generated for draft seasons' }, { status: 400 })
    }

    // Clear existing matches
    if (season.seasonMatches.length > 0) {
      await prisma.seasonMatch.deleteMany({
        where: { seasonId }
      })
    }

  const teams = season.seasonTeams.map((st: any) => ({ id: st.teamId, name: st.team.name }))
    
    if (teams.length < 2) {
      return NextResponse.json({ error: 'At least 2 teams are required to generate a schedule' }, { status: 400 })
    }

    let matches: Array<{
      homeTeamId: string
      awayTeamId: string
      round?: number
      week?: number
    }> = []

    if (season.scheduleType === SeasonScheduleType.ROUND_ROBIN) {
      // Generate round-robin schedule
      matches = generateRoundRobinSchedule(teams, season.gamesPerOpponent || 1)
    } else if (season.scheduleType === SeasonScheduleType.FIXED_GAMES) {
      // Generate randomized schedule with fixed number of games per team
      matches = generateFixedGamesSchedule(teams, season.totalGamesPerTeam || 10)
    }

    if (matches.length === 0) {
      return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 })
    }

    // Create matches in database
    const seasonMatches = await prisma.seasonMatch.createMany({
      data: matches.map(match => ({
        seasonId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        round: match.round,
        week: match.week,
        status: 'SCHEDULED',
        createdById: user!.id
      }))
    })

    // Get the created matches with team details
    const createdMatches = await prisma.seasonMatch.findMany({
      where: { seasonId },
      include: {
        homeTeam: {
          select: { id: true, name: true }
        },
        awayTeam: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { round: 'asc' },
        { week: 'asc' }
      ]
    })

    return NextResponse.json({ 
      matches: createdMatches,
      totalMatches: matches.length,
      message: `Generated ${matches.length} matches for the season`
    })

  } catch (error) {
    console.error('Error generating schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate round-robin schedule
function generateRoundRobinSchedule(
  teams: Array<{ id: string; name: string }>, 
  gamesPerOpponent: number
): Array<{ homeTeamId: string; awayTeamId: string; round: number; week: number }> {
  const matches: Array<{ homeTeamId: string; awayTeamId: string; round: number; week: number }> = []
  let matchId = 0
  
  // Generate matches for each round (gamesPerOpponent times)
  for (let gameNum = 1; gameNum <= gamesPerOpponent; gameNum++) {
    let week = 1
    
    // Generate all possible pairings
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matchId++
        
        // Alternate home/away for fairness across multiple rounds
        const isHomeFirst = (gameNum + i + j) % 2 === 0
        
        matches.push({
          homeTeamId: isHomeFirst ? teams[i].id : teams[j].id,
          awayTeamId: isHomeFirst ? teams[j].id : teams[i].id,
          round: gameNum,
          week: week
        })
        
        // Increment week every few matches to spread them out
        if (matchId % Math.max(1, Math.floor(teams.length / 2)) === 0) {
          week++
        }
      }
    }
  }
  
  return matches
}

// Helper function to generate fixed games schedule with randomized opponents
function generateFixedGamesSchedule(
  teams: Array<{ id: string; name: string }>, 
  totalGamesPerTeam: number
): Array<{ homeTeamId: string; awayTeamId: string; round: number; week: number }> {
  const matches: Array<{ homeTeamId: string; awayTeamId: string; round: number; week: number }> = []
  
  // Track games played by each team
  const teamGames: { [teamId: string]: number } = {}
  teams.forEach(team => {
    teamGames[team.id] = 0
  })
  
  // Track opponent matchups to try to distribute evenly
  const matchups: { [key: string]: number } = {}
  
  let week = 1
  let attempts = 0
  const maxAttempts = totalGamesPerTeam * teams.length * 10 // Prevent infinite loops
  
  while (attempts < maxAttempts) {
    attempts++
    
    // Find teams that still need games
    const availableTeams = teams.filter(team => teamGames[team.id] < totalGamesPerTeam)
    
    if (availableTeams.length < 2) {
      break // All teams have played their required games
    }
    
    // Shuffle available teams for randomness
    const shuffledTeams = [...availableTeams].sort(() => Math.random() - 0.5)
    
    // Try to pair teams for matches
    const weekMatches: Array<{ homeTeamId: string; awayTeamId: string }> = []
    const usedThisWeek = new Set<string>()
    
    for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
      const team1 = shuffledTeams[i]
      const team2 = shuffledTeams[i + 1]
      
      // Skip if either team is already used this week
      if (usedThisWeek.has(team1.id) || usedThisWeek.has(team2.id)) {
        continue
      }
      
      // Skip if both teams have played their required games
      if (teamGames[team1.id] >= totalGamesPerTeam || teamGames[team2.id] >= totalGamesPerTeam) {
        continue
      }
      
      // Create matchup key (sorted to handle both directions)
      const matchupKey = [team1.id, team2.id].sort().join('-')
      
      // Prefer matchups that haven't been played as much
      const currentMatchupCount = matchups[matchupKey] || 0
      const maxMatchups = Math.ceil(totalGamesPerTeam / (teams.length - 1))
      
      if (currentMatchupCount >= maxMatchups) {
        continue // This matchup has been played enough
      }
      
      // Randomly assign home/away
      const isTeam1Home = Math.random() > 0.5
      
      weekMatches.push({
        homeTeamId: isTeam1Home ? team1.id : team2.id,
        awayTeamId: isTeam1Home ? team2.id : team1.id
      })
      
      // Update counters
      teamGames[team1.id]++
      teamGames[team2.id]++
      matchups[matchupKey] = currentMatchupCount + 1
      usedThisWeek.add(team1.id)
      usedThisWeek.add(team2.id)
    }
    
    // Add week matches to the schedule
    weekMatches.forEach((match, index) => {
      matches.push({
        ...match,
        round: Math.ceil(matches.length / Math.max(1, Math.floor(teams.length / 2))),
        week: week
      })
    })
    
    if (weekMatches.length > 0) {
      week++
    }
    
    // If we couldn't make any matches this round, break to prevent infinite loop
    if (weekMatches.length === 0) {
      // Try to fill remaining games with any available opponents
      const remainingTeams = teams.filter(team => teamGames[team.id] < totalGamesPerTeam)
      
      if (remainingTeams.length >= 2) {
        // Just pair them up randomly to finish the schedule
        for (let i = 0; i < remainingTeams.length - 1; i++) {
          for (let j = i + 1; j < remainingTeams.length; j++) {
            if (teamGames[remainingTeams[i].id] < totalGamesPerTeam && 
                teamGames[remainingTeams[j].id] < totalGamesPerTeam) {
              
              matches.push({
                homeTeamId: remainingTeams[i].id,
                awayTeamId: remainingTeams[j].id,
                round: Math.ceil(matches.length / Math.max(1, Math.floor(teams.length / 2))),
                week: week
              })
              
              teamGames[remainingTeams[i].id]++
              teamGames[remainingTeams[j].id]++
              week++
              
              if (teamGames[remainingTeams[i].id] >= totalGamesPerTeam) break
            }
          }
          if (teamGames[remainingTeams[i].id] >= totalGamesPerTeam) continue
        }
      }
      break
    }
  }
  
  return matches
}