import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ 
    where: { email: session.user.email },
    include: {
      assignments: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check if user has any pending assignments (unconfirmed)
  const pendingAssignments = user.assignments.filter(a => !a.confirmed)
  
  if (pendingAssignments.length > 0) {
    return NextResponse.json({ 
      error: 'Cannot clear assignments while you have pending confirmations. Please confirm or contact your team admin.',
      pendingCount: pendingAssignments.length
    }, { status: 400 })
  }

  // Check if user has any future assignments (matches that haven't happened yet)
  const futureAssignments = await prisma.assignment.findMany({
    where: {
      userId: user.id,
      match: {
        scheduledAt: {
          gte: new Date()
        }
      }
    },
    include: {
      match: true
    }
  })

  if (futureAssignments.length > 0) {
    return NextResponse.json({ 
      error: 'Cannot clear assignments for future matches. Contact your team admin to be removed from specific matches.',
      futureCount: futureAssignments.length
    }, { status: 400 })
  }

  // Only delete confirmed assignments for past matches
  const result = await prisma.assignment.deleteMany({
    where: {
      userId: user.id,
      confirmed: true,
      match: {
        scheduledAt: {
          lt: new Date()
        }
      }
    }
  })

  return NextResponse.json({ 
    message: 'Successfully cleared past assignments',
    deletedCount: result.count
  })
}
