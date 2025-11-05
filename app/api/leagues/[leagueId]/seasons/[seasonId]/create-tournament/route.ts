import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; seasonId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, seasonId } = await params
    const body = await request.json()
    const { 
      name: tournamentName,
      format: tournamentFormat = 'SINGLE_ELIMINATION',
      maxTeams,
      startDate,
      description
    } = body

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is league manager
    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        creatorId: user.id
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'Not authorized to manage this league' }, { status: 403 })
    }

    // Verify the season exists and is completed
    const season = await prisma.season.findFirst({
      where: {
        id: seasonId,
        leagueId: leagueId,
        status: 'COMPLETED'
      },
      include: {
        seasonStandings: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { points: 'desc' },
            { goalDifference: 'desc' },
            { goalsFor: 'desc' }
          ]
        }
      }
    })

    if (!season) {
      console.error('Season not found or not completed. SeasonId:', seasonId, 'LeagueId:', leagueId)
      return NextResponse.json({ error: 'Season not found or not completed' }, { status: 404 })
    }

    console.log('Season found:', season.name, 'Status:', season.status, 'Standings count:', season.seasonStandings.length)

    // If no standings exist, create default standings based on season teams
    if (season.seasonStandings.length === 0) {
      console.log('No standings found, using season teams for seeding')
      
      // Get season teams
      const seasonTeams = await (prisma as any).seasonTeam.findMany({
        where: { seasonId: seasonId },
        include: {
          team: {
            select: { id: true, name: true }
          }
        }
      })

      if (seasonTeams.length < 2) {
        return NextResponse.json({ error: 'At least 2 teams required for tournament' }, { status: 400 })
      }

      // Use season teams directly with sequential seeding
      const topTeams = seasonTeams.map((st: any, index: number) => ({
        teamId: st.teamId,
        team: st.team,
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
        seed: index + 1
      }))
      
      const numTeamsToInclude = maxTeams || topTeams.length

      // Create tournament with teams
      const tournament = await (prisma as any).tournament.create({
        data: {
          name: tournamentName,
          description: description || `Championship tournament for ${season.name}`,
          format: tournamentFormat,
          maxTeams: numTeamsToInclude,
          startedAt: startDate ? new Date(startDate) : new Date(),
          leagueId: leagueId,
          seasonId: seasonId,
          createdById: user.id,
          status: 'CREATED'
        }
      })

      console.log('Tournament created:', tournament.id)

      // Add teams to tournament
      await Promise.all(
        topTeams.slice(0, numTeamsToInclude).map(async (team: any, index: number) => {
          return (prisma as any).tournamentTeam.create({
            data: {
              tournamentId: tournament.id,
              teamId: team.teamId,
              seed: index + 1
            }
          })
        })
      )

      return NextResponse.json({
        success: true,
        message: `Tournament "${tournamentName}" created successfully with ${numTeamsToInclude} teams!`,
        tournament: {
          ...tournament,
          teams: numTeamsToInclude,
          seededFrom: season.name,
          note: 'Teams seeded in order of season registration (no match data available)'
        }
      })
    }

    // Check if tournament already exists for this season
    const existingTournament = await (prisma as any).tournament.findUnique({
      where: { seasonId: seasonId },
      include: {
        teams: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (existingTournament) {
      return NextResponse.json({
        error: 'A tournament already exists for this season',
        tournament: existingTournament
      }, { status: 409 })
    }

    // Determine number of teams to include
    const numTeamsToInclude = maxTeams || season.seasonStandings.length
    const topTeams = season.seasonStandings.slice(0, numTeamsToInclude)

    if (topTeams.length < 2) {
      return NextResponse.json({ error: 'At least 2 teams required for tournament' }, { status: 400 })
    }

    // Create the tournament linked to this season
    const tournament = await (prisma as any).tournament.create({
      data: {
        name: tournamentName,
        description: description || `Championship tournament seeded from ${season.name} final standings`,
        format: tournamentFormat,
        maxTeams: numTeamsToInclude,
        startedAt: startDate ? new Date(startDate) : new Date(),
        leagueId: leagueId,
        seasonId: seasonId,
        createdById: user.id,
        status: 'CREATED'
      }
    })

    console.log('Tournament created:', tournament.id)

    // Add teams to tournament based on season standings (seeded by final position)
    const tournamentTeamIds = await Promise.all(
  topTeams.map(async (standing: any, index: number) => {
        return (prisma as any).tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            teamId: standing.teamId,
            seed: index + 1 // 1st place gets seed 1, 2nd place gets seed 2, etc.
          }
        })
      })
    )

    console.log('Tournament teams created:', tournamentTeamIds.length)

    // Fetch the tournament teams with their team details for bracket generation
    const tournamentTeams = await (prisma as any).tournamentTeam.findMany({
      where: {
        tournamentId: tournament.id
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        seed: 'asc'
      }
    })

    const result = {
      tournament,
      tournamentTeams
    }

    // Don't generate bracket yet - it will be generated when the tournament is started
    // This avoids duplicate rounds being created

    return NextResponse.json({
      success: true,
      message: `Tournament "${tournamentName}" created successfully with ${result.tournamentTeams.length} seeded teams!`,
      tournament: {
        ...result.tournament,
        teams: result.tournamentTeams.length,
        seededFrom: season.name
      }
    })
  } catch (error: any) {
    console.error('Failed to create tournament from standings:', error)
    const errorMessage = error?.message || 'Failed to create tournament'
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined 
    }, { status: 500 })
  }
}

async function generateEliminationBracket(tournamentId: string, tournamentTeams: any[]) {
  // Find the next power of 2 for bracket size
  const numTeams = tournamentTeams.length
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numTeams)))
  const totalRounds = Math.log2(bracketSize)

  console.log(`Generating bracket for ${numTeams} teams (bracket size: ${bracketSize}, rounds: ${totalRounds})`)

  // Create tournament rounds
  const rounds = []
  for (let i = 1; i <= totalRounds; i++) {
    const roundName = i === totalRounds ? 'Final' :
                     i === totalRounds - 1 ? 'Semifinals' :
                     i === totalRounds - 2 ? 'Quarterfinals' :
                     `Round ${i}`
    
    const round = await prisma.tournamentRound.create({
      data: {
        tournamentId,
        name: roundName,
        roundNumber: i,
        isComplete: false
      }
    })
    rounds.push(round)
  }

  // Sort tournament teams by seed to ensure proper bracket ordering
  const sortedTeams = [...tournamentTeams].sort((a, b) => a.seed - b.seed)
  console.log(`Tournament teams by seed:`, sortedTeams.map(t => `#${t.seed} ${t.team?.name || t.teamId}`).join(', '))
  
  // Calculate which teams get byes based on standard tournament seeding
  // In a bracket with byes, top seeds advance directly to later rounds
  const byeTeams: Map<number, string> = new Map() // roundIndex -> teamId
  const firstRoundPairings: Array<{ topSeed: any, bottomSeed: any, pairingIndex: number }> = []
  
  // Determine first round matchups
  for (let i = 0; i < bracketSize / 2; i++) {
    const topSeedIndex = i
    const bottomSeedIndex = bracketSize - 1 - i
    
    const team1 = topSeedIndex < sortedTeams.length ? sortedTeams[topSeedIndex] : null
    const team2 = bottomSeedIndex < sortedTeams.length ? sortedTeams[bottomSeedIndex] : null
    
    if (team1 && team2) {
      // Both teams exist - this is a real match
      firstRoundPairings.push({ topSeed: team1, bottomSeed: team2, pairingIndex: i })
      console.log(`Round 1 Match: #${team1.seed} ${team1.team?.name} vs #${team2.seed} ${team2.team?.name}`)
    } else if (team1 && !team2) {
      // Top seed gets a bye
      byeTeams.set(i, team1.id)
      console.log(`Bye: #${team1.seed} ${team1.team?.name} advances to round 2`)
    }
  }
  
  // Create matches starting from round 1 (only for teams that actually play)
  let matchNumber = 1
  const roundMatches: any[][] = []

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const matches = []
    
    if (roundIndex === 0) {
      // First round - create only actual matches (no bye placeholders)
      for (const pairing of firstRoundPairings) {
        const match = await prisma.tournamentMatch.create({
          data: {
            tournamentId,
            roundId: rounds[roundIndex].id,
            matchNumber: matchNumber++,
            homeTeamId: pairing.topSeed.id,
            awayTeamId: pairing.bottomSeed.id,
            status: 'PENDING',
            bracket: 'main'
          }
        })
        matches.push({ ...match, pairingIndex: pairing.pairingIndex })
      }
    } else {
      // Later rounds - create matches for next round
      const matchesInRound = Math.pow(2, rounds.length - 1 - roundIndex)
      
      for (let matchInRound = 0; matchInRound < matchesInRound; matchInRound++) {
        const match = await prisma.tournamentMatch.create({
          data: {
            tournamentId,
            roundId: rounds[roundIndex].id,
            matchNumber: matchNumber++,
            homeTeamId: null,
            awayTeamId: null,
            status: 'PENDING',
            bracket: 'main'
          }
        })
        matches.push(match)
      }
    }
    
    roundMatches.push(matches)
  }

  // Link first round matches to second round and place bye teams
  if (roundMatches.length > 1) {
    const firstRound = roundMatches[0]
    const secondRound = roundMatches[1]
    
    for (const match of firstRound) {
      const nextMatchIndex = Math.floor(match.pairingIndex / 2)
      const nextMatch = secondRound[nextMatchIndex]
      
      // Link the match
      await prisma.tournamentMatch.update({
        where: { id: match.id },
        data: { nextMatchId: nextMatch.id }
      })
      
      // Determine which slot in next match (home or away)
      const isFirstFeeder = match.pairingIndex % 2 === 0
      
      // Update next match to show it's fed by this match
      const updateData: any = {}
      // We'll leave slots null for now - they'll be filled when match completes
      
      await prisma.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: updateData
      })
    }
    
    // Place bye teams directly into second round
    for (const [pairingIndex, teamId] of byeTeams.entries()) {
      const nextMatchIndex = Math.floor(pairingIndex / 2)
      const nextMatch = secondRound[nextMatchIndex]
      const isFirstFeeder = pairingIndex % 2 === 0
      
      console.log(`Placing bye team ${teamId} in round 2 match ${nextMatch.id} as ${isFirstFeeder ? 'home' : 'away'} team`)
      
      const updateData: any = {}
      if (isFirstFeeder) {
        updateData.homeTeamId = teamId
      } else {
        updateData.awayTeamId = teamId
      }
      
      await prisma.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: updateData
      })
    }
  }
  
  // Link remaining rounds
  for (let roundIndex = 1; roundIndex < rounds.length - 1; roundIndex++) {
    const currentRoundMatches = roundMatches[roundIndex]
    const nextRoundMatches = roundMatches[roundIndex + 1]

    for (let i = 0; i < currentRoundMatches.length; i++) {
      const nextMatchIndex = Math.floor(i / 2)
      const nextMatch = nextRoundMatches[nextMatchIndex]

      await prisma.tournamentMatch.update({
        where: { id: currentRoundMatches[i].id },
        data: { nextMatchId: nextMatch.id }
      })
    }
  }

  console.log(`Created ${matchNumber - 1} total matches: ${firstRoundPairings.length} in round 1, ${byeTeams.size} teams with byes`)
}

async function generateGroupStage(tournamentId: string, tournamentTeams: any[]) {
  // Calculate optimal group configuration
  const numTeams = tournamentTeams.length
  const optimalGroupSize = Math.min(4, Math.max(3, Math.floor(numTeams / 4)))
  const numGroups = Math.ceil(numTeams / optimalGroupSize)
  
  // This is a placeholder for group stage generation
  console.log(`Generated ${numGroups} groups of ~${optimalGroupSize} teams each in tournament ${tournamentId}`)
}