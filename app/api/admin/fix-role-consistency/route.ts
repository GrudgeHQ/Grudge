import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/admin/fix-role-consistency - Fix team role and admin status consistency
export async function POST(request: Request) {
  const session = await getServerSession(authOptions) as { user?: { email?: string } }

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Define leadership roles that should automatically have admin access
    const leadershipRoles = ['COACH', 'COORDINATOR', 'CAPTAIN', 'CO_CAPTAIN']

    // Find all team members with leadership roles who are not currently admins
    type Role = 'ADMIN' | 'CAPTAIN' | 'CO_CAPTAIN' | 'COACH' | 'COORDINATOR' | 'MEMBER';
    const inconsistentMembers = await prisma.teamMember.findMany({
      where: {
        role: {
          in: leadershipRoles as Role[]
        },
        isAdmin: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (inconsistentMembers.length === 0) {
      return NextResponse.json({
        message: 'No inconsistencies found. All leadership roles have proper admin access.',
        fixed: 0
      })
    }

    // Update all inconsistent members to have admin access
    const updateResults = await Promise.all(
      inconsistentMembers.map((member: {
        id: string;
        user: { id: string; name: string | null; email: string | null };
        team: { id: string; name: string };
        role: string;
        isAdmin: boolean;
      }) =>
        prisma.teamMember.update({
          where: {
            id: member.id
          },
          data: {
            isAdmin: true
          }
        })
      )
    )

    // Create audit log entries for these changes
    const auditEntries = await Promise.all(
      inconsistentMembers.map((member: any) =>
        prisma.auditLog.create({
          data: {
            actorId: member.userId,
            teamId: member.teamId,
            action: 'ROLE_CONSISTENCY_FIX',
            payload: {
              previousIsAdmin: false,
              newIsAdmin: true,
              role: member.role,
              fixReason: 'Leadership roles require admin access',
              details: `Automatically granted admin access to ${member.role} role`
            }
          }
        })
      )
    )

    return NextResponse.json({
      message: `Fixed ${inconsistentMembers.length} role inconsistencies`,
      fixed: inconsistentMembers.length,
      details: inconsistentMembers.map((member: any) => ({
        user: member.user?.name || member.user?.email,
        team: member.team?.name,
        role: member.role,
        action: 'Granted admin access'
      }))
    })

  } catch (error) {
    console.error('Error fixing role consistency:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}