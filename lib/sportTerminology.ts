// Sport-specific terminology mapping
export interface SportTerminology {
  scoreFor: string // What the team scores (goals, points, runs, etc.)
  scoreAgainst: string // What is scored against the team
  scoreForAbbr: string // Abbreviation for score for (GF, PF, RF, etc.)
  scoreAgainstAbbr: string // Abbreviation for score against (GA, PA, RA, etc.)
  scoreDifference: string // What to call the difference (+/-)
  pointsSystem: boolean // Whether the sport uses a points system for standings
  pointsLabel: string // Label for standings points (Pts, Win%, etc.)
}

const SPORT_TERMINOLOGY: Record<string, SportTerminology> = {
  // Ball Sports - Goals
  SOCCER: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against', 
    scoreForAbbr: 'GF',
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  HOCKEY: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against',
    scoreForAbbr: 'GF', 
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  ICE_HOCKEY: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against',
    scoreForAbbr: 'GF', 
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  FIELD_HOCKEY: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against',
    scoreForAbbr: 'GF', 
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  LACROSSE: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against',
    scoreForAbbr: 'GF', 
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  WATER_POLO: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against',
    scoreForAbbr: 'GF', 
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  HANDBALL: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against',
    scoreForAbbr: 'GF', 
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },

  // Ball Sports - Points
  BASKETBALL: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF', 
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  FOOTBALL: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA', 
    scoreDifference: 'Point Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  VOLLEYBALL: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  RUGBY: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },

  // Ball Sports - Runs
  BASEBALL: {
    scoreFor: 'Runs For',
    scoreAgainst: 'Runs Against',
    scoreForAbbr: 'RF',
    scoreAgainstAbbr: 'RA',
    scoreDifference: 'Run Difference', 
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  CRICKET: {
    scoreFor: 'Runs For',
    scoreAgainst: 'Runs Against',
    scoreForAbbr: 'RF',
    scoreAgainstAbbr: 'RA',
    scoreDifference: 'Run Difference', 
    pointsSystem: false,
    pointsLabel: 'Win%'
  },

  // Racquet Sports - Sets/Games
  TENNIS: {
    scoreFor: 'Sets Won',
    scoreAgainst: 'Sets Lost', 
    scoreForAbbr: 'SW',
    scoreAgainstAbbr: 'SL',
    scoreDifference: 'Set Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  BADMINTON: {
    scoreFor: 'Games Won',
    scoreAgainst: 'Games Lost',
    scoreForAbbr: 'GW',
    scoreAgainstAbbr: 'GL',
    scoreDifference: 'Game Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  TABLE_TENNIS: {
    scoreFor: 'Games Won',
    scoreAgainst: 'Games Lost',
    scoreForAbbr: 'GW',
    scoreAgainstAbbr: 'GL',
    scoreDifference: 'Game Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  PING_PONG: {
    scoreFor: 'Games Won',
    scoreAgainst: 'Games Lost',
    scoreForAbbr: 'GW',
    scoreAgainstAbbr: 'GL',
    scoreDifference: 'Game Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  SQUASH: {
    scoreFor: 'Games Won',
    scoreAgainst: 'Games Lost',
    scoreForAbbr: 'GW',
    scoreAgainstAbbr: 'GL',
    scoreDifference: 'Game Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  PICKLEBALL: {
    scoreFor: 'Games Won',
    scoreAgainst: 'Games Lost',
    scoreForAbbr: 'GW',
    scoreAgainstAbbr: 'GL',
    scoreDifference: 'Game Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },

  // Combat Sports - Points
  BOXING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  MMA: {
    scoreFor: 'Wins',
    scoreAgainst: 'Losses',
    scoreForAbbr: 'W',
    scoreAgainstAbbr: 'L',
    scoreDifference: 'Win Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  WRESTLING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },

  // Individual/Time Sports - Time/Score
  GOLF: {
    scoreFor: 'Strokes For',
    scoreAgainst: 'Strokes Against',
    scoreForAbbr: 'SF',
    scoreAgainstAbbr: 'SA',
    scoreDifference: 'Stroke Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  SWIMMING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  TRACK: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  CYCLING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },

  // Winter Sports
  SKIING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  SNOWBOARDING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },

  // Water Sports
  SURFING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  ROWING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  SAILING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },
  KAYAKING: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  },

  // Recreation/Fun Sports - Points
  BOWLING: {
    scoreFor: 'Pins For',
    scoreAgainst: 'Pins Against',
    scoreForAbbr: 'PiF',
    scoreAgainstAbbr: 'PiA',
    scoreDifference: 'Pin Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  CORNHOLE: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  DODGEBALL: {
    scoreFor: 'Players Out',
    scoreAgainst: 'Players Lost',
    scoreForAbbr: 'PO',
    scoreAgainstAbbr: 'PL',
    scoreDifference: 'Player Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  KICKBALL: {
    scoreFor: 'Runs For',
    scoreAgainst: 'Runs Against',
    scoreForAbbr: 'RF',
    scoreAgainstAbbr: 'RA',
    scoreDifference: 'Run Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },
  ULTIMATE_FRISBEE: {
    scoreFor: 'Points For',
    scoreAgainst: 'Points Against',
    scoreForAbbr: 'PF',
    scoreAgainstAbbr: 'PA',
    scoreDifference: 'Point Difference',
    pointsSystem: false,
    pointsLabel: 'Win%'
  },

  // Horse Sports
  POLO: {
    scoreFor: 'Goals For',
    scoreAgainst: 'Goals Against',
    scoreForAbbr: 'GF',
    scoreAgainstAbbr: 'GA',
    scoreDifference: 'Goal Difference',
    pointsSystem: true,
    pointsLabel: 'Pts'
  }
}

/**
 * Get sport-specific terminology for statistics display
 */
export function getSportTerminology(sport: string): SportTerminology {
  const terminology = SPORT_TERMINOLOGY[sport?.toUpperCase()]
  
  // Default to soccer terminology if sport not found
  return terminology || SPORT_TERMINOLOGY.SOCCER
}

/**
 * Format score display based on sport
 */
export function formatScore(scoreFor: number, scoreAgainst: number, sport: string): string {
  const terminology = getSportTerminology(sport)
  return `${scoreFor}-${scoreAgainst}`
}

/**
 * Get appropriate win percentage or points display based on sport
 */
interface StandingsTeam {
  points?: number;
  gamesPlayed?: number;
  wins?: number;
}

export function getStandingsValue(team: StandingsTeam, sport: string): { value: string | number, label: string } {
  const terminology = getSportTerminology(sport)
  
  if (terminology.pointsSystem) {
    return {
      value: team.points || 0,
      label: terminology.pointsLabel
    }
  } else {
    // Calculate win percentage for non-points sports
    const gamesPlayed = team.gamesPlayed ?? 0;
    const wins = team.wins ?? 0;
    const winPercentage = gamesPlayed > 0 
      ? ((wins / gamesPlayed) * 100).toFixed(1)
      : '0.0'
    return {
      value: `${winPercentage}%`,
      label: 'Win%'
    }
  }
}

/**
 * Get sport-specific summary statistics labels
 */
export function getSportSummaryLabels(sport: string) {
  const terminology = getSportTerminology(sport)
  
  return {
    totalScore: `Total ${terminology.scoreFor}`,
    averageScore: `Average ${terminology.scoreFor} Per Game`
  }
}

/**
 * Get sport-specific icon/emoji
 */
export function getSportIcon(sport: string): string {
  const sportIcons: Record<string, string> = {
    // Ball Sports - Goals
    SOCCER: '⚽',
    HOCKEY: '🏒',
    ICE_HOCKEY: '🏒',
    FIELD_HOCKEY: '🏑',
    LACROSSE: '🥍',
    WATER_POLO: '🤽',
    HANDBALL: '🤾',
    POLO: '🐎',

    // Ball Sports - Points
    BASKETBALL: '🏀',
    FOOTBALL: '🏈',
    VOLLEYBALL: '🏐',
    RUGBY: '🏉',

    // Ball Sports - Runs
    BASEBALL: '⚾',
    CRICKET: '🏏',
    KICKBALL: '⚾',

    // Racquet Sports
    TENNIS: '🎾',
    BADMINTON: '🏸',
    TABLE_TENNIS: '🏓',
    PING_PONG: '🏓',
    SQUASH: '🎾',
    PICKLEBALL: '🎾',

    // Combat Sports
    BOXING: '🥊',
    MMA: '🥋',
    WRESTLING: '🤼',

    // Individual Sports
    GOLF: '⛳',
    SWIMMING: '🏊',
    TRACK: '🏃',
    CYCLING: '🚴',

    // Winter Sports
    SKIING: '⛷️',
    SNOWBOARDING: '🏂',

    // Water Sports
    SURFING: '🏄',
    ROWING: '🚣',
    SAILING: '⛵',
    KAYAKING: '🛶',

    // Recreation Sports
    BOWLING: '🎳',
    CORNHOLE: '🎯',
    DODGEBALL: '🏐',
    ULTIMATE_FRISBEE: '🥏'
  }

  return sportIcons[sport?.toUpperCase()] || '🏆'
}

/**
 * Get sport-specific defensive terminology and icon
 */
export function getDefensiveInfo(sport: string): { icon: string; label: string } {
  const terminology = getSportTerminology(sport)
  
  const defensiveIcons: Record<string, string> = {
    // Goal sports use shield
    SOCCER: '🛡️',
    HOCKEY: '🛡️',
    ICE_HOCKEY: '🛡️',
    FIELD_HOCKEY: '🛡️',
    LACROSSE: '🛡️',
    WATER_POLO: '🛡️',
    HANDBALL: '🛡️',
    POLO: '🛡️',
    
    // Other sports use defensive icons
    BASKETBALL: '🚫',
    FOOTBALL: '🚫',
    VOLLEYBALL: '🛡️',
    RUGBY: '🛡️',
    BASEBALL: '🥎',
    CRICKET: '🏏',
    TENNIS: '🎾',
    BADMINTON: '🏸',
    TABLE_TENNIS: '🏓',
    PING_PONG: '🏓',
    SQUASH: '🎾',
    PICKLEBALL: '🎾',
    BOWLING: '🎳',
    CORNHOLE: '🎯',
    KICKBALL: '🥎',
    ULTIMATE_FRISBEE: '🥏',
    DODGEBALL: '🛡️'
  }

  const icon = defensiveIcons[sport?.toUpperCase()] || '🛡️'
  const label = `Best Defensive Teams`
  
  return { icon, label }
}

/**
 * Get appropriate game/match terminology for the sport
 */
export function getGameLabel(sport: string): string {
  const gameLabels: Record<string, string> = {
    TENNIS: 'match',
    BADMINTON: 'match',
    TABLE_TENNIS: 'match',
    PING_PONG: 'match',
    SQUASH: 'match',
    PICKLEBALL: 'match',
    GOLF: 'round',
    BOXING: 'fight',
    MMA: 'fight',
    WRESTLING: 'match',
    SWIMMING: 'meet',
    TRACK: 'meet',
    CYCLING: 'race',
    SKIING: 'race',
    SNOWBOARDING: 'race',
    SURFING: 'heat',
    ROWING: 'race',
    SAILING: 'race',
    KAYAKING: 'race'
  }

  return gameLabels[sport?.toUpperCase()] || 'game'
}