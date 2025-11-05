import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ matches: [] })
  }

  try {
    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isAdmin: true },
          select: { teamId: true }
        }
      }
    })

    if (!user) {
      console.log('[pending-confirmation] User not found')
      return NextResponse.json({ matches: [] })
    }

    // Get team IDs where user is admin
    const adminTeamIds = user.memberships.map(m => m.teamId)
    console.log('[pending-confirmation] Admin team IDs:', adminTeamIds)

    if (adminTeamIds.length === 0) {
      console.log('[pending-confirmation] User is not admin of any teams')
      return NextResponse.json({ matches: [] })
    }

    // Find all season matches with pending score submissions where user is admin of the OPPOSING team
    // Get all pending submissions first
    const pendingSubmissions = await prisma.seasonMatchScoreSubmission.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        seasonMatch: {
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
            },
            season: {
              select: {
                id: true,
                name: true,
                league: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    console.log('[pending-confirmation] Total pending submissions:', pendingSubmissions.length)

    // Filter to only submissions where user is admin of the OPPOSING team (not the submitting team)
    const pendingMatches = pendingSubmissions
      .filter(submission => {
        const matchTeamIds = [submission.seasonMatch.homeTeamId, submission.seasonMatch.awayTeamId]
        const opposingTeamId = matchTeamIds.find(id => id !== submission.submittingTeamId)
        const isOpposingAdmin = opposingTeamId && adminTeamIds.includes(opposingTeamId)
        console.log('[pending-confirmation] Submission', submission.id, 'submittingTeam:', submission.submittingTeamId, 'opposingTeam:', opposingTeamId, 'isOpposingAdmin:', isOpposingAdmin)
        return isOpposingAdmin
      })
      .map(submission => submission.seasonMatch)
      .sort((a, b) => {
        if (!a.scheduledAt) return 1
        if (!b.scheduledAt) return -1
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      })

    console.log('[pending-confirmation] Pending matches for user:', pendingMatches.length)

    return NextResponse.json({ 
      ok: true, 
      matches: pendingMatches 
    })

  } catch (error) {
    console.error('Error fetching pending confirmation matches:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch pending matches',
      matches: []
    }, { status: 500 })
  }
}
