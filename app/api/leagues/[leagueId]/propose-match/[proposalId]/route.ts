import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/leagues/[leagueId]/propose-match/[proposalId] - Approve or deny a match proposal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; proposalId: string }> }
) {
  const { leagueId, proposalId } = await params
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

  const { action, reason } = await request.json()

  if (!action || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({ 
      error: 'Action must be either "approve" or "deny"' 
    }, { status: 400 })
  }

  // Verify the league exists and user is the league manager
  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  if (league.creatorId !== user.id) {
    return NextResponse.json({ 
      error: 'Only the league manager can approve or deny match proposals' 
    }, { status: 403 })
  }

  // Get the proposal with all necessary details
  const proposal = await prisma.matchProposal.findFirst({
    where: {
      id: proposalId,
      leagueId
    },
    include: {
      league: {
        select: {
          id: true,
          name: true
        }
      },
      proposingTeam: {
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

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  if (proposal.status !== 'PENDING') {
    return NextResponse.json({ 
      error: 'This proposal has already been reviewed' 
    }, { status: 400 })
  }

  let createdMatchId = null

  if (action === 'approve') {
    // Create the league match and corresponding team matches
    const leagueMatch = await prisma.leagueMatch.create({
      data: {
        leagueId,
        homeTeamId: proposal.proposingTeamId,
        awayTeamId: proposal.opponentTeamId,
        scheduledAt: proposal.scheduledAt,
        location: proposal.location,
        createdById: user.id
      }
    })

    // Create team matches for both teams
    const homeMatch = await prisma.match.create({
      data: {
        teamId: proposal.proposingTeamId,
        opponentTeamId: proposal.opponentTeamId,
        scheduledAt: proposal.scheduledAt,
        location: proposal.location,
        leagueMatchId: leagueMatch.id,
        matchType: 'LEAGUE_MATCH',
        leagueId,
        createdById: user.id
      }
    })

    await prisma.match.create({
      data: {
        teamId: proposal.opponentTeamId,
        opponentTeamId: proposal.proposingTeamId,
        scheduledAt: proposal.scheduledAt,
        location: proposal.location,
        leagueMatchId: leagueMatch.id,
        matchType: 'LEAGUE_MATCH',
        leagueId,
        createdById: user.id
      }
    })

    createdMatchId = homeMatch.id
  }

  // Update the proposal status
  const updatedProposal = await prisma.matchProposal.update({
    where: { id: proposalId },
    data: {
      status: action === 'approve' ? 'APPROVED' : 'DENIED',
      reviewedById: user.id,
      reviewReason: reason || null,
      reviewedAt: new Date(),
      createdMatchId
    }
  })

  // Create notifications for both team administrators
  const allTeamAdmins = [
    ...proposal.proposingTeam.members,
    ...proposal.opponentTeam.members
  ]

  const notificationType = action === 'approve' ? 'MATCH_PROPOSAL_APPROVED' : 'MATCH_PROPOSAL_DENIED'

  for (const member of allTeamAdmins) {
    await prisma.notification.create({
      data: {
        userId: member.user.id,
        type: notificationType,
        payload: {
          proposalId: proposal.id,
          leagueId: proposal.leagueId,
          leagueName: proposal.league.name,
          proposingTeamName: proposal.proposingTeam.name,
          opponentTeamName: proposal.opponentTeam.name,
          proposedByName: proposal.proposedBy.name,
          reviewReason: reason,
          scheduledAt: proposal.scheduledAt.toISOString(),
          location: proposal.location,
          description: proposal.description,
          createdMatchId
        }
      }
    })
  }

  return NextResponse.json({ 
    proposal: {
      id: updatedProposal.id,
      status: updatedProposal.status,
      reviewReason: updatedProposal.reviewReason,
      reviewedAt: updatedProposal.reviewedAt,
      createdMatchId: updatedProposal.createdMatchId
    }
  })
}

// DELETE /api/leagues/[leagueId]/propose-match/[proposalId] - Cancel a match proposal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; proposalId: string }> }
) {
  const { leagueId, proposalId } = await params
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

  // Get the proposal and verify permissions
  const proposal = await prisma.matchProposal.findFirst({
    where: {
      id: proposalId,
      leagueId
    },
    include: {
      proposingTeam: {
        include: {
          members: {
            where: { 
              userId: user.id,
              isAdmin: true 
            }
          }
        }
      }
    }
  })

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  // Only the proposing team admin can cancel
  if (proposal.proposingTeam.members.length === 0) {
    return NextResponse.json({ 
      error: 'Only an admin from the proposing team can cancel this proposal' 
    }, { status: 403 })
  }

  if (proposal.status !== 'PENDING') {
    return NextResponse.json({ 
      error: 'Cannot cancel a proposal that has already been reviewed' 
    }, { status: 400 })
  }

  // Update the proposal status to cancelled
  await prisma.matchProposal.update({
    where: { id: proposalId },
    data: {
      status: 'CANCELLED'
    }
  })

  return NextResponse.json({ success: true })
}