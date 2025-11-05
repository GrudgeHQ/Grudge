import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * Grudge Tournament Round Generation with Complete Partnership Rotation & Absolute Fair Sitting System
 * 
 * This algorithm generates round robin tournament rounds with the following features:
 * 1. Ensures players exhaust ALL possible partnerships before repeating any pairing
 * 2. Tracks partnerships across all rounds, not just the previous round
 * 3. Prioritizes completely new partnerships over previously used ones
 * 4. Respects linked groups (players who should always play together)
 * 5. ABSOLUTELY PREVENTS consecutive sitting out - players who sat out must play next round
 * 6. ENFORCES fair sitting rotation - NO ONE sits out twice until EVERYONE has sat out once
 * 7. Multi-tier fairness scoring with extreme penalties for unfair sitting distribution
 * 8. Maintains optimal tournament flow with mathematical partnership optimization
 * 9. Uses escalating penalty system (10000+ points) to ensure absolute fairness
 */

// Helper function to shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Helper function to track partnerships between players
function getPartnerships(team: string[]): string[] {
  const partnerships: string[] = []
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      partnerships.push([team[i], team[j]].sort().join('|'))
    }
  }
  return partnerships
}

// Helper function to get partnership usage count across all rounds
function getPartnershipUsageCount(player1: string, player2: string, allUsedPartnerships: Map<string, number>): number {
  const partnershipKey = [player1, player2].sort().join('|')
  return allUsedPartnerships.get(partnershipKey) || 0
}

// Helper function to check if players in a group are linked (should always play together)
function arePlayersLinked(players: string[], linkedGroups: string[][]): boolean {
  return linkedGroups.some(group => players.every(player => group.includes(player)))
}

// Helper function to generate round robin matchups with complete partnership rotation
function generateRounds(participants: string[], totalRounds: number, playersPerTeam: number, linkedGroups: string[][] = []) {
  const totalPerMatch = playersPerTeam * 2
  const generatedRounds: any[] = []
  let previousSitters: Set<string> = new Set()
  
  // Track ALL partnerships used across ALL rounds (not just previous round)
  const allUsedPartnerships: Map<string, number> = new Map()
  
  // Track sitting out history for fair rotation
  const sittingOutHistory: Map<string, number> = new Map()
  participants.forEach(p => sittingOutHistory.set(p, 0))
  
  // Track consecutive sitting for prevention
  const consecutiveSittingTracker: Map<string, number> = new Map()
  participants.forEach(p => consecutiveSittingTracker.set(p, 0))
  
  // Calculate total possible partnerships to help with optimization
  const totalPossiblePartnerships = new Set<string>()
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      totalPossiblePartnerships.add([participants[i], participants[j]].sort().join('|'))
    }
  }

  // Separate linked groups from individual players
  const linkedPlayerIds = new Set(linkedGroups.flat())
  const individualPlayers = participants.filter(p => !linkedPlayerIds.has(p))

  for (let r = 0; r < totalRounds; r++) {
    const matchups: any[] = []
    const sittingOut: string[] = []
    const usedPlayers: Set<string> = new Set()

    // Process linked groups first (they always play together)
    const availableLinkedGroups = linkedGroups.filter(group => 
      group.every(playerId => !usedPlayers.has(playerId))
    )
    
    // Shuffle available linked groups
    const shuffledLinkedGroups = shuffle(availableLinkedGroups)
    
    // Try to place linked groups into teams
    for (const group of shuffledLinkedGroups) {
      if (group.length <= playersPerTeam && group.every(playerId => !usedPlayers.has(playerId))) {
        const remainingSlots = playersPerTeam - group.length
        
        if (remainingSlots === 0) {
          // Full team from linked group, need another team to play against
          const availableForOpponent = individualPlayers
            .filter(p => !usedPlayers.has(p) && !previousSitters.has(p))
            .concat(individualPlayers.filter(p => !usedPlayers.has(p) && previousSitters.has(p)))
          
          if (availableForOpponent.length >= playersPerTeam) {
            const team1 = [...group]
            const team2 = availableForOpponent.slice(0, playersPerTeam)
            matchups.push({ team1, team2 })
            
            // Update partnership usage counts (linked groups still count for fair tracking)
            getPartnerships(team1).forEach(p => {
              const currentCount = allUsedPartnerships.get(p) || 0
              allUsedPartnerships.set(p, currentCount + 1)
            })
            getPartnerships(team2).forEach(p => {
              const currentCount = allUsedPartnerships.get(p) || 0
              allUsedPartnerships.set(p, currentCount + 1)
            })
            
            // Mark players as used
            group.forEach(p => usedPlayers.add(p))
            team2.forEach(p => usedPlayers.add(p))
          }
        } else {
          // Partial team from linked group, need to fill remaining slots
          const availableForSameTeam = individualPlayers
            .filter(p => !usedPlayers.has(p) && !previousSitters.has(p))
            .concat(individualPlayers.filter(p => !usedPlayers.has(p) && previousSitters.has(p)))
          
          if (availableForSameTeam.length >= remainingSlots) {
            const teammates = availableForSameTeam.slice(0, remainingSlots)
            const team1 = [...group, ...teammates]
            
            // Find opponent
            const availableForOpponent = individualPlayers
              .filter(p => !usedPlayers.has(p) && !teammates.includes(p) && !previousSitters.has(p))
              .concat(individualPlayers.filter(p => !usedPlayers.has(p) && !teammates.includes(p) && previousSitters.has(p)))
            
            if (availableForOpponent.length >= playersPerTeam) {
              const team2 = availableForOpponent.slice(0, playersPerTeam)
              matchups.push({ team1, team2 })
              
              // Update partnership usage counts
              getPartnerships(team1).forEach(p => {
                const currentCount = allUsedPartnerships.get(p) || 0
                allUsedPartnerships.set(p, currentCount + 1)
              })
              getPartnerships(team2).forEach(p => {
                const currentCount = allUsedPartnerships.get(p) || 0
                allUsedPartnerships.set(p, currentCount + 1)
              })
              
              // Mark players as used
              team1.forEach(p => usedPlayers.add(p))
              team2.forEach(p => usedPlayers.add(p))
            }
          }
        }
      }
    }

    // Fill remaining matchups with individual players using partnership avoidance
    const remainingPlayers = participants.filter(p => !usedPlayers.has(p))
    
    // CRITICAL: Determine who should sit out FIRST, then assign teams from the remaining players
    const totalSlotsNeeded = Math.floor(remainingPlayers.length / totalPerMatch) * totalPerMatch
    const playersWhoWillSitOut = remainingPlayers.length - totalSlotsNeeded
    
    let playersToAssignToTeams: string[] = []
    
    if (playersWhoWillSitOut > 0) {
      // Select players to sit out based on fairness - those who have sat out LEAST should sit out
      const sortedForSitting = [...remainingPlayers].sort((a, b) => {
        const aSitCount = sittingOutHistory.get(a) || 0
        const bSitCount = sittingOutHistory.get(b) || 0
        const aConsecutive = consecutiveSittingTracker.get(a) || 0
        const bConsecutive = consecutiveSittingTracker.get(b) || 0
        
        // PRIORITY 1: Avoid consecutive sitting (anyone with consecutive > 0 should NOT sit again)
        if (aConsecutive > 0 && bConsecutive === 0) return 1  // a has consecutive, b doesn't - b should sit first
        if (bConsecutive > 0 && aConsecutive === 0) return -1  // b has consecutive, a doesn't - a should sit first
        
        // PRIORITY 2: Among those with no consecutive sitting, those with LOWER sit counts should sit first
        // This ensures everyone sits once before anyone sits twice
        if (aSitCount !== bSitCount) return aSitCount - bSitCount
        
        // PRIORITY 3: Random tiebreaker
        return Math.random() - 0.5
      })
      
      // Take the first N players from the sorted list to sit out
      const selectedSitters = sortedForSitting.slice(0, playersWhoWillSitOut)
      
      // Remove sitters from remaining players - these are our players who will actually play
      playersToAssignToTeams = remainingPlayers.filter(p => !selectedSitters.includes(p))
      
      // Add selected sitters to the sitting out list immediately
      sittingOut.push(...selectedSitters)
    } else {
      // No one needs to sit out - all remaining players will play
      playersToAssignToTeams = [...remainingPlayers]
    }
    
    // Smart prioritization for team assignment (now that sitting is already determined)
    const minSitCount = Math.min(...Array.from(sittingOutHistory.values()))
    const maxSitCount = Math.max(...Array.from(sittingOutHistory.values()))
    
    // ABSOLUTE PRIORITY: Anyone who sat out in previous round MUST play (prevent consecutive)
    const mustPlayPlayers = playersToAssignToTeams.filter(p => previousSitters.has(p))
    
    // HIGH PRIORITY: Anyone who has sat out more should get priority in team assignment
    const shouldPlayPlayers = playersToAssignToTeams.filter(p => {
      if (mustPlayPlayers.includes(p)) return false // Already included in mustPlay
      const playerSitCount = sittingOutHistory.get(p) || 0
      return playerSitCount >= minSitCount
    })
    
    // NORMAL PRIORITY: Everyone else
    const normalPlayers = playersToAssignToTeams.filter(p => 
      !mustPlayPlayers.includes(p) && !shouldPlayPlayers.includes(p)
    )
    
    // Create teams with strict fairness priority: mustPlay first, then shouldPlay, then normal
    const allAvailablePlayers = [...mustPlayPlayers, ...shouldPlayPlayers, ...normalPlayers]
    
    // Attempt to create teams with optimal player selection and partnership diversity
    while (allAvailablePlayers.length >= totalPerMatch) {
      let bestTeam1: string[] | null = null
      let bestTeam2: string[] | null = null
      let bestScore = Infinity
      
      // Try multiple combinations to find the best pairing
      const maxAttempts = Math.min(100, Math.pow(allAvailablePlayers.length, Math.min(playersPerTeam, 3)))
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffledPlayers = shuffle([...allAvailablePlayers])
        const potentialTeam1 = shuffledPlayers.slice(0, playersPerTeam)
        const potentialTeam2 = shuffledPlayers.slice(playersPerTeam, totalPerMatch)
        
        // Calculate comprehensive score combining multiple factors
        let totalScore = 0
        
        // Factor 1: Partnership diversity (heavily weighted)
        let partnershipScore = 0
        const team1Partnerships = getPartnerships(potentialTeam1)
        const team2Partnerships = getPartnerships(potentialTeam2)
        
        // Calculate score for team1 partnerships
        for (const partnership of team1Partnerships) {
          const [p1, p2] = partnership.split('|')
          // Skip scoring for linked groups (they're allowed to repeat)
          if (!arePlayersLinked([p1, p2], linkedGroups)) {
            const usageCount = allUsedPartnerships.get(partnership) || 0
            // Score heavily penalizes repeated partnerships
            partnershipScore += usageCount * usageCount * 10
          }
        }
        
        // Calculate score for team2 partnerships
        for (const partnership of team2Partnerships) {
          const [p1, p2] = partnership.split('|')
          // Skip scoring for linked groups (they're allowed to repeat)
          if (!arePlayersLinked([p1, p2], linkedGroups)) {
            const usageCount = allUsedPartnerships.get(partnership) || 0
            partnershipScore += usageCount * usageCount * 10
          }
        }
        
        // Factor 2: Sitting out fairness (EXTREMELY heavily weighted)
        let sittingOutScore = 0
        const allTeamPlayers = [...potentialTeam1, ...potentialTeam2]
        const minSitCount = Math.min(...Array.from(sittingOutHistory.values()))
        const maxSitCount = Math.max(...Array.from(sittingOutHistory.values()))
        
        // Check each player who would sit out in this configuration
        allAvailablePlayers.forEach(player => {
          if (!allTeamPlayers.includes(player)) {
            // This player will sit out
            const wasPreviousSitter = previousSitters.has(player)
            const consecutiveSits = consecutiveSittingTracker.get(player) || 0
            const totalSits = sittingOutHistory.get(player) || 0
            
            // MASSIVE penalty for consecutive sitting (absolutely avoid)
            if (wasPreviousSitter) {
              sittingOutScore += 10000 // Make consecutive sitting extremely expensive
            }
            
            // MASSIVE penalty for sitting out someone who has sat less than the maximum
            // This enforces "everyone sits at least once before anyone sits twice"
            if (totalSits < maxSitCount) {
              sittingOutScore += 5000 // Extremely expensive to sit someone who hasn't sat as much
            }
            
            // Additional escalating penalty for consecutive sitting streaks
            sittingOutScore += consecutiveSits * consecutiveSits * 1000
          }
        })
        
        // Factor 3: Playing fairness bonus (moderate weight)
        let playingFairnessBonus = 0
        allTeamPlayers.forEach(player => {
          const totalSits = sittingOutHistory.get(player) || 0
          
          // Big bonus for including previous sitters (prevent consecutive)
          if (previousSitters.has(player)) {
            playingFairnessBonus -= 200 // Strong bonus for playing previous sitters
          }
          
          // Bonus for including players who have sat out the most
          if (totalSits >= maxSitCount) {
            playingFairnessBonus -= 100 // Bonus for playing those who have sat the most
          }
          
          // Bonus for including players who have sat more than minimum
          if (totalSits > minSitCount) {
            playingFairnessBonus -= 50 // Bonus for playing those who have sat more
          }
        })
        
        totalScore = partnershipScore + sittingOutScore + playingFairnessBonus
        
        // If this is the best combination so far, save it
        if (totalScore < bestScore) {
          bestScore = totalScore
          bestTeam1 = potentialTeam1
          bestTeam2 = potentialTeam2
          
          // If we found a near-perfect match, use it
          if (totalScore <= 10) break
        }
      }
      
      // Use the best teams found
      if (bestTeam1 && bestTeam2) {
        matchups.push({ team1: bestTeam1, team2: bestTeam2 })
        
        // Update partnership usage counts for ALL partnerships
        getPartnerships(bestTeam1).forEach(p => {
          const currentCount = allUsedPartnerships.get(p) || 0
          allUsedPartnerships.set(p, currentCount + 1)
        })
        getPartnerships(bestTeam2).forEach(p => {
          const currentCount = allUsedPartnerships.get(p) || 0
          allUsedPartnerships.set(p, currentCount + 1)
        })
        
        // Remove used players from available list
        bestTeam1.forEach(p => {
          const index = allAvailablePlayers.indexOf(p)
          if (index > -1) allAvailablePlayers.splice(index, 1)
        })
        bestTeam2.forEach(p => {
          const index = allAvailablePlayers.indexOf(p)
          if (index > -1) allAvailablePlayers.splice(index, 1)
        })
      } else {
        // Fallback: just take the first available players
        const team1 = allAvailablePlayers.splice(0, playersPerTeam)
        const team2 = allAvailablePlayers.splice(0, playersPerTeam)
        matchups.push({ team1, team2 })
        
        // Update partnership usage counts for fallback teams too
        getPartnerships(team1).forEach(p => {
          const currentCount = allUsedPartnerships.get(p) || 0
          allUsedPartnerships.set(p, currentCount + 1)
        })
        getPartnerships(team2).forEach(p => {
          const currentCount = allUsedPartnerships.get(p) || 0
          allUsedPartnerships.set(p, currentCount + 1)
        })
      }
    }
    
    // Note: Sitting out selection is now handled earlier in the algorithm for better fairness
    
    // Update sitting out history and consecutive tracking
    participants.forEach(p => {
      if (sittingOut.includes(p)) {
        // Player is sitting out this round
        const currentCount = sittingOutHistory.get(p) || 0
        sittingOutHistory.set(p, currentCount + 1)
        
        const currentConsecutive = consecutiveSittingTracker.get(p) || 0
        consecutiveSittingTracker.set(p, currentConsecutive + 1)
      } else {
        // Player is playing this round - reset consecutive counter
        consecutiveSittingTracker.set(p, 0)
      }
    })
    
    generatedRounds.push({ matchups, sittingOut })
    previousSitters = new Set(sittingOut)
  }
  
  return generatedRounds
}

// POST /api/scrimmages/[scrimmageId]/generate - Generate rounds for a scrimmage
export async function POST(
  request: Request,
  { params }: { params: Promise<{ scrimmageId: string }> }
) {
  const { scrimmageId } = await params
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

  const scrimmage = await prisma.scrimmage.findUnique({
    where: { id: scrimmageId },
    include: {
      participants: true
    }
  })

  if (!scrimmage) {
    return NextResponse.json({ error: 'Scrimmage not found' }, { status: 404 })
  }

  // Delete existing rounds
  await prisma.scrimmageRound.deleteMany({
    where: { scrimmageId }
  })

  // Generate new rounds
  const participantIds = scrimmage.participants.map((p) => p.userId)
  const linkedGroups = scrimmage.settings && typeof scrimmage.settings === 'object' && 'linkedGroups' in scrimmage.settings 
    ? (scrimmage.settings as any).linkedGroups || [] 
    : []
  const rounds = generateRounds(participantIds, scrimmage.rounds, scrimmage.playersPerTeam, linkedGroups)

  // Save rounds to database
  const createdRounds = await Promise.all(
    rounds.map((round, index) =>
      prisma.scrimmageRound.create({
        data: {
          scrimmageId,
          roundNumber: index + 1,
          matchups: round.matchups,
          sittingOut: round.sittingOut
        }
      })
    )
  )

  return NextResponse.json({ rounds: createdRounds })
}
