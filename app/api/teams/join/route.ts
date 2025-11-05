import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { inviteCode, password } = body
    
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }

    const team = await prisma.team.findUnique({ where: { inviteCode } })
    if (!team) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }
    
    if (team.password) {
      const ok = await bcrypt.compare(password || '', team.password)
      if (!ok) {
        return NextResponse.json({ error: 'Invalid team password' }, { status: 401 })
      }
    }

    // find the user by email from session
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already a member
    const existing = await prisma.teamMember.findUnique({ 
      where: { userId_teamId: { userId: user.id, teamId: team.id } } 
    }).catch(() => null)
    
    if (existing) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 })
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.teamJoinRequest.findUnique({
      where: { teamId_requestedById: { teamId: team.id, requestedById: user.id } }
    })

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return NextResponse.json({ error: 'Join request already pending' }, { status: 409 })
      }
    }

    // Create the join request
    const joinRequest = await prisma.teamJoinRequest.create({
      data: {
        teamId: team.id,
        requestedById: user.id,
        status: 'PENDING'
      },
      include: {
        team: {
          select: { id: true, name: true, sport: true }
        },
        requestedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Get all team administrators to notify them
    const teamAdmins = await prisma.teamMember.findMany({
      where: {
        teamId: team.id,
        isAdmin: true
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Send notifications to all team administrators
    const notifications = teamAdmins.map(admin => ({
      userId: admin.user.id,
      type: 'team_join_request',
      payload: {
        title: 'New Team Join Request',
        message: `${user.name || user.email} has requested to join your team "${team.name}"`,
        requestId: joinRequest.id,
        teamId: team.id,
        teamName: team.name,
        requestedById: user.id,
        requestedByName: user.name || user.email
      }
    }))

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      })
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Join request sent to team administrators',
      request: joinRequest,
      adminsNotified: teamAdmins.length
    })
  } catch (error) {
    console.error('Error joining team:', error)
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 })
  }
}
