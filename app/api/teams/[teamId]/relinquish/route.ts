import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { relinquishSchema } from '@/lib/validators/team'
import { shouldHaveAdminAccess } from '@/lib/teamRoles'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const teamId = params?.teamId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 })

  // Find caller and their user record
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const callerMembership = await prisma.teamMember.findFirst({ 
    where: { teamId, userId: user.id },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      team: {
        select: { id: true, name: true }
      }
    }
  })
  if (!callerMembership) return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
  if (!callerMembership.isAdmin) return NextResponse.json({ error: 'Only administrators can relinquish admin privileges' }, { status: 403 })

  // Count other admins (excluding caller)
  const otherAdmins = await prisma.teamMember.findMany({
    where: { 
      teamId, 
      isAdmin: true, 
      NOT: { id: callerMembership.id } 
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  const totalAdmins = await prisma.teamMember.count({ 
    where: { teamId, isAdmin: true } 
  })

  // Parse request body for transfer target (required if last admin)
  let input: any
  try {
    const json = await req.json()
    input = relinquishSchema.parse(json)
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid input', details: err?.errors ?? err?.message }, { status: 400 })
  }

  const { transferToUserId } = input

  // If there are other admins, caller can safely relinquish without transfer
  if (otherAdmins.length > 0) {
    // Safe to relinquish - team will still have other admins
    
    // Check if caller's role should automatically maintain admin access
    if (shouldHaveAdminAccess(callerMembership.role)) {
      return NextResponse.json({ 
        error: `Cannot relinquish admin privileges while holding ${callerMembership.role} role. Change your role first or transfer admin to another member.`,
        requiresRoleChange: true
      }, { status: 400 })
    }

    // Update caller to non-admin status and set role to MEMBER
    await prisma.teamMember.update({ 
      where: { id: callerMembership.id }, 
      data: { 
        isAdmin: false,
        role: 'MEMBER'  // Relinquishing admin becomes regular member
      } 
    })

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'ADMIN_RELINQUISHED',
        payload: {
          title: 'Admin Privileges Relinquished',
          message: `You have relinquished your administrator privileges for team "${callerMembership.team.name}". You are now a regular team member.`,
          teamId,
          teamName: callerMembership.team.name
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        teamId,
        action: 'ADMIN_RELINQUISHED',
        payload: {
          previousRole: callerMembership.role,
          newRole: 'MEMBER',
          previousIsAdmin: true,
          newIsAdmin: false,
          details: 'Administrator relinquished privileges voluntarily'
        }
      }
    })

    return NextResponse.json({ 
      ok: true, 
      message: 'Admin privileges relinquished successfully. You are now a regular team member.',
      newRole: 'MEMBER',
      isAdmin: false
    })
  }

  // Caller is the last admin - must transfer to another member
  if (!transferToUserId) {
    return NextResponse.json({ 
      error: 'You are the only administrator of this team. You must transfer admin privileges to another team member before relinquishing.',
      isLastAdmin: true,
      availableMembers: await prisma.teamMember.findMany({
        where: { 
          teamId, 
          NOT: { id: callerMembership.id } 
        },
        select: {
          userId: true,
          role: true,
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    }, { status: 400 })
  }

  // Find the transfer target
  const transferTarget = await prisma.teamMember.findFirst({
    where: { 
      teamId, 
      userId: transferToUserId 
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  if (!transferTarget) {
    return NextResponse.json({ error: 'Transfer target is not a member of this team' }, { status: 400 })
  }

  if (transferTarget.userId === user.id) {
    return NextResponse.json({ error: 'Cannot transfer admin privileges to yourself' }, { status: 400 })
  }

  // Perform the transfer
  await prisma.$transaction(async (tx) => {
    // Grant admin privileges to transfer target
    await tx.teamMember.update({
      where: { id: transferTarget.id },
      data: { isAdmin: true }
    })

    // Remove admin from caller and set role to MEMBER
    await tx.teamMember.update({
      where: { id: callerMembership.id },
      data: { 
        isAdmin: false,
        role: 'MEMBER'
      }
    })
  })

  // Create notifications
  await Promise.all([
    // Notify the new admin
    prisma.notification.create({
      data: {
        userId: transferTarget.userId,
        type: 'ADMIN_TRANSFERRED',
        payload: {
          title: 'Administrator Privileges Granted',
          message: `${callerMembership.user.name || callerMembership.user.email} has transferred administrator privileges to you for team "${callerMembership.team.name}".`,
          teamId,
          teamName: callerMembership.team.name,
          fromUser: callerMembership.user.name || callerMembership.user.email
        }
      }
    }),
    // Notify the former admin
    prisma.notification.create({
      data: {
        userId: user.id,
        type: 'ADMIN_RELINQUISHED',
        payload: {
          title: 'Admin Privileges Transferred',
          message: `You have transferred administrator privileges for team "${callerMembership.team.name}" to ${transferTarget.user.name || transferTarget.user.email}. You are now a regular team member.`,
          teamId,
          teamName: callerMembership.team.name,
          toUser: transferTarget.user.name || transferTarget.user.email
        }
      }
    })
  ])

  // Create audit log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      teamId,
      targetId: transferTarget.userId,
      action: 'ADMIN_TRANSFERRED',
      payload: {
        fromUser: user.id,
        toUser: transferTarget.userId,
        fromRole: callerMembership.role,
        toRole: 'MEMBER',
        details: `Administrator privileges transferred from ${callerMembership.user.name || callerMembership.user.email} to ${transferTarget.user.name || transferTarget.user.email}`
      }
    }
  })

  return NextResponse.json({ 
    ok: true, 
    message: `Admin privileges successfully transferred to ${transferTarget.user.name || transferTarget.user.email}. You are now a regular team member.`,
    transferredTo: {
      name: transferTarget.user.name,
      email: transferTarget.user.email
    },
    newRole: 'MEMBER',
    isAdmin: false
  })
}
