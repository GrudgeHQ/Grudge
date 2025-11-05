import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

    // First check if user is a member of this team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        user: { email: session.user.email }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied - not a team member' }, { status: 403 })
    }

    // Get team details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        sport: true,
        inviteCode: true,
        password: true, // Include this for admins to know if password is set
        createdAt: true,
        updatedAt: true
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // For security, only return password status (not actual password)
    const teamData = {
      ...team,
      password: team.password ? true : null // Just indicate if password exists
    }

    return NextResponse.json({ team: teamData })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}