import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/leagues/[leagueId]/propose-match - Propose a head-to-head match between league teams
export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
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

  const { opponentTeamId, scheduledAt, location, description } = await request.json()

  if (!opponentTeamId || !scheduledAt) {
    return NextResponse.json({ 
      error: 'Opponent team and scheduled time are required' 
    }, { status: 400 })
  }

  // Verify the league exists
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: true
    }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Find user's team in this league and verify they're an admin
  const userTeamMembership = await prisma.teamMember.findFirst({
    where: {
      userId: user.id,
      isAdmin: true,
      team: {
        leagues: {
          some: {
            leagueId: leagueId
          }
        }
      }
    },
    include: {
      team: true
    }
  })

  if (!userTeamMembership) {
    return NextResponse.json({ 
      error: 'You must be an admin of a team in this league to propose matches' 
    }, { status: 403 })
  }

  const proposingTeamId = userTeamMembership.teamId

  if (proposingTeamId === opponentTeamId) {
    return NextResponse.json({ error: 'Cannot propose a match against your own team' }, { status: 400 })
  }

  // Verify opponent team is in the league
  const opponentTeamInLeague = league.teams.some((t: any) => t.teamId === opponentTeamId)

  if (!opponentTeamInLeague) {
    return NextResponse.json({ 
      error: 'Opponent team must be a member of this league' 
    }, { status: 400 })
  }

  // Check for existing proposal for the same match
  const existingProposal = await prisma.matchProposal.findFirst({
    where: {
      leagueId,
      scheduledAt: new Date(scheduledAt),
      status: 'PENDING',
      OR: [
        {
          proposingTeamId,
          opponentTeamId
        },
        {
          proposingTeamId: opponentTeamId,
          opponentTeamId: proposingTeamId
        }
      ]
    }
  })

  if (existingProposal) {
    return NextResponse.json({ 
      error: 'A proposal for this match already exists' 
    }, { status: 400 })
  }

  // Create the match proposal
  const proposal = await prisma.matchProposal.create({
    data: {
      leagueId,
      proposingTeamId,
      opponentTeamId,
      proposedById: user.id,
      scheduledAt: new Date(scheduledAt),
      location: location || null,
      description: description || null
    },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      proposingTeam: {
        select: {
          id: true,
          name: true
        }
      },
      opponentTeam: {
        select: {
          id: true,
          name: true,
          members: {
            where: { isAdmin: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      },
      proposedBy: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  // Create notification for league manager
  await prisma.notification.create({
    data: {
      userId: proposal.league.creator?.id,
      type: 'MATCH_PROPOSAL_CREATED',
      payload: {
        proposalId: proposal.id,
        leagueId: proposal.leagueId,
        leagueName: proposal.league.name,
        proposingTeamName: proposal.proposingTeam.name,
        opponentTeamName: proposal.opponentTeam.name,
        proposedByName: proposal.proposedBy.name,
        scheduledAt: proposal.scheduledAt.toISOString(),
        location: proposal.location,
        description: proposal.description
      }
    }
  })

  // Create notifications for opponent team administrators
  for (const member of proposal.opponentTeam.members) {
    await prisma.notification.create({
      data: {
        userId: member.user.id,
        type: 'MATCH_PROPOSAL_RECEIVED',
        payload: {
          proposalId: proposal.id,
          leagueId: proposal.leagueId,
          leagueName: proposal.league.name,
          proposingTeamName: proposal.proposingTeam.name,
          opponentTeamName: proposal.opponentTeam.name,
          proposedByName: proposal.proposedBy.name,
          scheduledAt: proposal.scheduledAt.toISOString(),
          location: proposal.location,
          description: proposal.description
        }
      }
    })
  }

  return NextResponse.json({ 
    proposal: {
      id: proposal.id,
      status: proposal.status,
      scheduledAt: proposal.scheduledAt,
      location: proposal.location,
      description: proposal.description,
      proposingTeam: proposal.proposingTeam,
      opponentTeam: proposal.opponentTeam,
      createdAt: proposal.createdAt
    }
  })
}

// GET /api/leagues/[leagueId]/propose-match - Get match proposals for a league
export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
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

  // Check if user has access to this league (either league manager or team member)
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        include: {
          team: {
            include: {
              members: {
                where: { userId: user.id }
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

  const isLeagueManager = league.creatorId === user.id
  const isTeamMember = league.teams.some((lt: any) => lt.team.members.length > 0)

  if (!isLeagueManager && !isTeamMember) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get proposals based on user role
  let proposals
  if (isLeagueManager) {
    // League manager sees all proposals
    proposals = await prisma.matchProposal.findMany({
      where: { leagueId },
      include: {
        proposingTeam: {
          select: {
            id: true,
            name: true
          }
        },
        opponentTeam: {
          select: {
            id: true,
            name: true
          }
        },
        proposedBy: {
          select: {
            id: true,
            name: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } else {
    // Team members see proposals involving their teams
    const userTeamIds = league.teams
  .filter((lt: any) => lt.team.members.length > 0)
  .map((lt: any) => lt.teamId)

    proposals = await prisma.matchProposal.findMany({
      where: {
        leagueId,
        OR: [
          { proposingTeamId: { in: userTeamIds } },
          { opponentTeamId: { in: userTeamIds } }
        ]
      },
      include: {
        proposingTeam: {
          select: {
            id: true,
            name: true
          }
        },
        opponentTeam: {
          select: {
            id: true,
            name: true
          }
        },
        proposedBy: {
          select: {
            id: true,
            name: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return NextResponse.json({ 
    proposals,
    isLeagueManager,
    canPropose: isTeamMember && !isLeagueManager // Team members (but not league manager) can propose
  })
}