import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface TeamActivity {
  teamId: string
  teamName: string
  score: number
  factors: {
    isAdmin: boolean
    recentMatches: number
    recentPractices: number
    upcomingEvents: number
    recentMessages: number
    joinedRecently: boolean
  }
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ teamId: 'all' }) // Default fallback
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                createdAt: true
              }
            }
          }
        }
      }
    })

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ teamId: 'all' })
    }

    // If user only has one team, return it
    if (user.memberships.length === 1) {
      return NextResponse.json({ teamId: user.memberships[0].teamId })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const now = new Date()
    const teamActivities: TeamActivity[] = []

    for (const membership of user.memberships) {
      const teamId = membership.teamId
      const team = membership.team

      // Count recent matches (last 30 days + upcoming)
      const recentMatches = await prisma.match.count({
        where: {
          teamId,
          scheduledAt: {
            gte: thirtyDaysAgo
          }
        }
      })

      // Count recent practices (last 30 days + upcoming)
      const recentPractices = await prisma.practice.count({
        where: {
          teamId,
          scheduledAt: {
            gte: thirtyDaysAgo
          }
        }
      })

      // Count upcoming events (next 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const upcomingEvents = await prisma.match.count({
        where: {
          teamId,
          scheduledAt: {
            gte: now,
            lte: thirtyDaysFromNow
          }
        }
      }) + await prisma.practice.count({
        where: {
          teamId,
          scheduledAt: {
            gte: now,
            lte: thirtyDaysFromNow
          }
        }
      })

      // Count recent messages from user (last 7 days)
      const recentMessages = await prisma.chatMessage.count({
        where: {
          teamId,
          userId: user.id,
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      })

      // Check if joined recently (last 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const joinedRecently = membership.joinedAt >= ninetyDaysAgo

      // Calculate activity score
      let score = 0
      
      // Admin teams get priority
      if (membership.isAdmin) score += 10

      // Recent activity scoring
      score += recentMatches * 3        // Matches are high value
      score += recentPractices * 2      // Practices are medium value  
      score += upcomingEvents * 4       // Upcoming events are very high value
      score += recentMessages * 1       // Messages show engagement
      
      // Recently joined teams get a boost
      if (joinedRecently) score += 5

      // Bonus for teams with any recent activity
      if (recentMatches > 0 || recentPractices > 0 || recentMessages > 0) {
        score += 3
      }

      teamActivities.push({
        teamId,
        teamName: team.name,
        score,
        factors: {
          isAdmin: membership.isAdmin,
          recentMatches,
          recentPractices,
          upcomingEvents,
          recentMessages,
          joinedRecently
        }
      })
    }

    // Sort by score (highest first)
  teamActivities.sort((a: any, b: any) => b.score - a.score)

  console.log('Team activity scores:', teamActivities.map((t: any) => ({
      name: t.teamName,
      score: t.score,
      factors: t.factors
    })))

    // Return the most active team
    const mostActiveTeam = teamActivities[0]
    
    // If no team has significant activity, default to the first admin team or most recently joined
    if (mostActiveTeam.score === 0) {
  const adminTeam = user.memberships.find((m: any) => m.isAdmin)
      if (adminTeam) {
        return NextResponse.json({ teamId: adminTeam.teamId })
      }
      
      // Otherwise most recently joined
      const mostRecentTeam = user.memberships.sort(
  (a: any, b: any) => b.joinedAt.getTime() - a.joinedAt.getTime()
      )[0]
      return NextResponse.json({ teamId: mostRecentTeam.teamId })
    }

    return NextResponse.json({ teamId: mostActiveTeam.teamId })

  } catch (error) {
    console.error('Error calculating most active team:', error)
    return NextResponse.json({ teamId: 'all' }) // Safe fallback
  }
}