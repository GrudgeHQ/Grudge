import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper function to generate a unique invite code
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// GET /api/leagues - Get all leagues (user's leagues or all public)
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          team: true
        }
      }
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const teamIds = user.memberships.map((m: typeof user.memberships[number]) => m.teamId)

  // Get leagues where user's teams are members
  const leagues = await prisma.league.findMany({
    select: {
      id: true,
      name: true,
      sport: true,
      inviteCode: true,
      createdAt: true,
      creator: {
        select: {
          id: true,
          name: true
        }
      },
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              sport: true,
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                },
                orderBy: [
                  { isAdmin: 'desc' },
                  { user: { name: 'asc' } }
                ]
              }
            }
          }
        }
      },
      seasons: {
        where: {
          status: {
            in: ['DRAFT', 'ACTIVE', 'COMPLETED']
          }
        },
        include: {
          seasonMatches: {
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
            },
            orderBy: {
              scheduledAt: 'asc'
            }
          }
        }
      }
    },
    where: {
      teams: {
        some: {
          teamId: {
            in: teamIds
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return NextResponse.json({ leagues })
}

// POST /api/leagues - Create a new league
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, sport, teamId } = body

  if (!name || !sport || !teamId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify user is admin of the team
  const membership = user.memberships.find((m: typeof user.memberships[number]) => m.teamId === teamId)
  if (!membership || !membership.isAdmin) {
    return NextResponse.json({ error: 'You must be an admin to create a league' }, { status: 403 })
  }

  // Get the team to check sport
  const team = await prisma.team.findUnique({
    where: { id: teamId }
  })

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  if (team.sport !== sport) {
    return NextResponse.json({ error: 'Team sport must match league sport' }, { status: 400 })
  }

  // Check if team is already in a league
  const existingLeagueTeam = await prisma.leagueTeam.findFirst({
    where: { teamId },
    include: {
      league: {
        select: {
          name: true
        }
      }
    }
  })

  if (existingLeagueTeam) {
    return NextResponse.json({ 
      error: `Team is already in league "${existingLeagueTeam.league.name}". Each team can only be in one league at a time.` 
    }, { status: 400 })
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode()
  let existing = await prisma.league.findUnique({ where: { inviteCode } })
  while (existing) {
    inviteCode = generateInviteCode()
    existing = await prisma.league.findUnique({ where: { inviteCode } })
  }

  const league = await prisma.league.create({
    data: {
      name,
      sport,
      inviteCode,
      creatorId: user.id,
      teams: {
        create: {
          teamId
        }
      }
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true
        }
      },
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              sport: true
            }
          }
        }
      }
    }
  })

  return NextResponse.json({ league }, { status: 201 })
}
