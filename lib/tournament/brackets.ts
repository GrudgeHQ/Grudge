/**
 * Tournament bracket generation utilities
 * Supports single, double, and triple elimination formats
 */

export interface TournamentTeam {
  id: string
  teamId: string
  seed: number
  receivedBye?: boolean
  team: {
    id: string
    name: string
  }
}

export interface TournamentMatch {
  id?: string
  matchNumber: number
  bracket: 'main' | 'consolation' | 'losers'
  roundId?: string
  homeTeamId?: string | null
  awayTeamId?: string | null
  winnerId?: string | null
  nextMatchId?: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WALKOVER'
}

export interface TournamentRound {
  id?: string
  roundNumber: number
  name: string
  bracket: 'main' | 'consolation' | 'losers'
  isComplete: boolean
  matches: TournamentMatch[]
}

export interface BracketStructure {
  rounds: TournamentRound[]
  totalMatches: number
}

/**
 * Calculate the number of rounds needed for a tournament
 */
export function calculateRounds(teamCount: number): number {
  return Math.ceil(Math.log2(teamCount))
}

/**
 * Calculate next power of 2 (for determining bracket size)
 */
export function nextPowerOfTwo(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

/**
 * Calculate number of byes needed
 */
export function calculateByes(teamCount: number): number {
  const bracketSize = nextPowerOfTwo(teamCount)
  return bracketSize - teamCount
}

/**
 * Distribute byes among teams (highest seeds get byes)
 */
export function distributeByes(teams: TournamentTeam[], randomByes: boolean = false): TournamentTeam[] {
  const byeCount = calculateByes(teams.length)
  if (byeCount === 0) return teams

  const teamsWithByes = [...teams]
  
  if (randomByes) {
    // Randomly assign byes
    const shuffled = [...teamsWithByes].sort(() => Math.random() - 0.5)
    for (let i = 0; i < byeCount; i++) {
      const team = shuffled[i]
      const originalIndex = teamsWithByes.findIndex(t => t.id === team.id)
      teamsWithByes[originalIndex] = { ...team, receivedBye: true }
    }
  } else {
    // Give byes to highest seeds (lowest seed numbers)
    for (let i = 0; i < byeCount; i++) {
      teamsWithByes[i] = { ...teamsWithByes[i], receivedBye: true }
    }
  }
  
  return teamsWithByes
}

/**
 * Generate single elimination bracket
 */
export function generateSingleElimination(teams: TournamentTeam[], randomByes: boolean = false): BracketStructure {
  if (teams.length < 2) {
    throw new Error('At least 2 teams required for tournament')
  }

  // Sort teams by seed
  const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed)
  const teamsWithByes = distributeByes(sortedTeams, randomByes)
  
  const totalRounds = calculateRounds(teams.length)
  const rounds: TournamentRound[] = []
  let matchNumber = 1

  // Generate first round with proper seeding
  const firstRoundMatches: TournamentMatch[] = []
  const bracketSize = nextPowerOfTwo(teams.length)
  
  // Create first round matchups using standard tournament seeding
  const firstRoundTeams = teamsWithByes.filter(t => !t.receivedBye)
  const byeTeams = teamsWithByes.filter(t => t.receivedBye)

  // Pair teams for first round (1 vs lowest, 2 vs second lowest, etc.)
  for (let i = 0; i < firstRoundTeams.length; i += 2) {
    if (i + 1 < firstRoundTeams.length) {
      firstRoundMatches.push({
        matchNumber: matchNumber++,
        bracket: 'main',
        homeTeamId: firstRoundTeams[i].id,
        awayTeamId: firstRoundTeams[i + 1].id,
        status: 'PENDING'
      })
    }
  }

  if (firstRoundMatches.length > 0) {
    rounds.push({
      roundNumber: 1,
      name: getRoundName(1, totalRounds, 'main'),
      bracket: 'main',
      isComplete: false,
      matches: firstRoundMatches
    })
  }

  // Generate subsequent rounds
  const currentRoundMatches = firstRoundMatches.length
  let teamsInNextRound = currentRoundMatches + byeTeams.length
  const allRounds: TournamentMatch[][] = [firstRoundMatches]

  for (let round = 2; round <= totalRounds; round++) {
    const roundMatches: TournamentMatch[] = []
    const matchesInRound = Math.floor(teamsInNextRound / 2)
    
    for (let i = 0; i < matchesInRound; i++) {
      let homeTeamId = null
      let awayTeamId = null
      
      // For round 2, pre-place bye teams in their slots
      if (round === 2 && byeTeams.length > 0) {
        // Standard tournament seeding: bye teams are placed based on their original bracket position
        // Each first round match feeds into a specific second round match
        // Matches 1 & 2 feed into semifinal 1, matches 3 & 4 feed into semifinal 2, etc.
        const matchPosition = i
        const firstFeedPosition = matchPosition * 2
        const secondFeedPosition = matchPosition * 2 + 1
        
        // Check if this position should have a bye team
        // In a 3-team bracket: positions 0 (top seed) gets bye, positions 2-3 play
        // So position 0 in round 2 should have the bye team as homeTeam
        if (firstFeedPosition >= firstRoundMatches.length && byeTeams.length > firstFeedPosition - firstRoundMatches.length) {
          homeTeamId = byeTeams[firstFeedPosition - firstRoundMatches.length].id
        }
        if (secondFeedPosition >= firstRoundMatches.length && byeTeams.length > secondFeedPosition - firstRoundMatches.length) {
          awayTeamId = byeTeams[secondFeedPosition - firstRoundMatches.length].id
        }
      }
      
      roundMatches.push({
        matchNumber: matchNumber++,
        bracket: 'main',
        homeTeamId,
        awayTeamId,
        status: 'PENDING'
      })
    }

    allRounds.push(roundMatches)
    
    rounds.push({
      roundNumber: round,
      name: getRoundName(round, totalRounds, 'main'),
      bracket: 'main',
      isComplete: false,
      matches: roundMatches
    })

    teamsInNextRound = matchesInRound
  }

  // IMPORTANT: Set nextMatchId for proper winner advancement
  // This is needed by the match update endpoint to know where to send winners
  for (let roundIndex = 0; roundIndex < allRounds.length - 1; roundIndex++) {
    const currentRound = allRounds[roundIndex]
    const nextRound = allRounds[roundIndex + 1]
    
    for (let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
      const nextMatchIndex = Math.floor(matchIndex / 2)
      // Store nextMatchId as a temporary property (will be set in database after match creation)
      // The start/route.ts will need to link these properly
  currentRound[matchIndex].nextMatchId = `ROUND_${roundIndex + 2}_MATCH_${nextMatchIndex}`
    }
  }

  return {
    rounds,
    totalMatches: matchNumber - 1
  }
}

/**
 * Generate double elimination bracket
 */
export function generateDoubleElimination(teams: TournamentTeam[], randomByes: boolean = false): BracketStructure {
  if (teams.length < 2) {
    throw new Error('At least 2 teams required for tournament')
  }

  // Generate winners bracket (same as single elimination)
  const winnersBracket = generateSingleElimination(teams, randomByes)
  
  // Generate losers bracket
  const losersBracket = generateLosersBracket(teams.length)
  
  // Combine brackets
  const allRounds = [...winnersBracket.rounds, ...losersBracket.rounds]
  
  // Add grand finals
  const grandFinals: TournamentRound = {
    roundNumber: allRounds.length + 1,
    name: 'Grand Finals',
    bracket: 'main',
    isComplete: false,
    matches: [{
      matchNumber: winnersBracket.totalMatches + losersBracket.totalMatches + 1,
      bracket: 'main',
      homeTeamId: null, // Winner of winners bracket
      awayTeamId: null, // Winner of losers bracket
      status: 'PENDING'
    }]
  }
  
  allRounds.push(grandFinals)

  return {
    rounds: allRounds,
    totalMatches: winnersBracket.totalMatches + losersBracket.totalMatches + 1
  }
}

/**
 * Generate losers bracket for double elimination
 */
function generateLosersBracket(teamCount: number): BracketStructure {
  const winnersBracketRounds = calculateRounds(teamCount)
  const rounds: TournamentRound[] = []
  let matchNumber = 1000 // Start losers bracket matches at 1000+ to avoid conflicts

  // Losers bracket has 2 * (winnersBracketRounds - 1) rounds
  const losersBracketRounds = 2 * (winnersBracketRounds - 1)
  
  for (let round = 1; round <= losersBracketRounds; round++) {
    const isEvenRound = round % 2 === 0
    const matchesInRound = isEvenRound 
      ? Math.floor(Math.pow(2, winnersBracketRounds - Math.floor(round / 2) - 1))
      : Math.floor(Math.pow(2, winnersBracketRounds - Math.ceil(round / 2)))

    const roundMatches: TournamentMatch[] = []
    
    for (let i = 0; i < matchesInRound; i++) {
      roundMatches.push({
        matchNumber: matchNumber++,
        bracket: 'losers',
        homeTeamId: null,
        awayTeamId: null,
        status: 'PENDING'
      })
    }

    rounds.push({
      roundNumber: round,
      name: `Losers Round ${round}`,
      bracket: 'losers',
      isComplete: false,
      matches: roundMatches
    })
  }

  return {
    rounds,
    totalMatches: matchNumber - 1000
  }
}

/**
 * Generate triple elimination bracket (similar to double but with additional bracket)
 */
export function generateTripleElimination(teams: TournamentTeam[], randomByes: boolean = false): BracketStructure {
  // For simplicity, triple elimination uses the same structure as double elimination
  // but with additional losers bracket rounds and consolation matches
  const doubleElimBracket = generateDoubleElimination(teams, randomByes)
  
  // Add additional consolation rounds
  const consolationRounds: TournamentRound[] = []
  let matchNumber = 2000 // Start consolation matches at 2000+
  
  // Add a few consolation rounds for 3rd place determination
  consolationRounds.push({
    roundNumber: 1,
    name: 'Consolation Round 1',
    bracket: 'consolation',
    isComplete: false,
    matches: [{
      matchNumber: matchNumber++,
      bracket: 'consolation',
      homeTeamId: null,
      awayTeamId: null,
      status: 'PENDING'
    }]
  })

  return {
    rounds: [...doubleElimBracket.rounds, ...consolationRounds],
    totalMatches: doubleElimBracket.totalMatches + 1
  }
}

/**
 * Get appropriate round name based on round number and total rounds
 */
function getRoundName(roundNumber: number, totalRounds: number, bracket: string): string {
  if (bracket === 'losers') {
    return `Losers Round ${roundNumber}`
  }
  
  if (bracket === 'consolation') {
    return `Consolation Round ${roundNumber}`
  }

  const roundsFromEnd = totalRounds - roundNumber

  switch (roundsFromEnd) {
    case 0:
      return 'Finals'
    case 1:
      return 'Semifinals'
    case 2:
      return 'Quarterfinals'
    case 3:
      return 'Round of 16'
    case 4:
      return 'Round of 32'
    default:
      return `Round ${roundNumber}`
  }
}

/**
 * Generate complete bracket structure based on format
 */
export function generateBracket(
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'TRIPLE_ELIMINATION',
  teams: TournamentTeam[],
  randomByes: boolean = false
): BracketStructure {
  switch (format) {
    case 'SINGLE_ELIMINATION':
      return generateSingleElimination(teams, randomByes)
    case 'DOUBLE_ELIMINATION':
      return generateDoubleElimination(teams, randomByes)
    case 'TRIPLE_ELIMINATION':
      return generateTripleElimination(teams, randomByes)
    default:
      throw new Error(`Unsupported tournament format: ${format}`)
  }
}
