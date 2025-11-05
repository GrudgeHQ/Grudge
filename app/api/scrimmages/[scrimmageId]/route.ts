import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper function to shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Helper function to generate round robin matchups with sit-out rotation
function generateRounds(participants: string[], rounds: number, playersPerTeam: number) {
  const totalPerMatch = playersPerTeam * 2
  const generatedRounds: any[] = []
  let previousSitters: Set<string> = new Set()

  for (let r = 0; r < rounds; r++) {
    // Prioritize players who sat out in the previous round
    const priorityPlayers = participants.filter((p) => previousSitters.has(p))
    const otherPlayers = participants.filter((p) => !previousSitters.has(p))
    
    // Shuffle with priority players first
    const shuffled = shuffle([...priorityPlayers, ...otherPlayers])
    
    const matchups: any[] = []
    const sittingOut: string[] = []
    
    // Create matchups
    let index = 0
    while (index + totalPerMatch <= shuffled.length) {
      const team1 = shuffled.slice(index, index + playersPerTeam)
      const team2 = shuffled.slice(index + playersPerTeam, index + totalPerMatch)
      matchups.push({ team1, team2 })
      index += totalPerMatch
    }
    
    // Remaining players sit out
    while (index < shuffled.length) {
      sittingOut.push(shuffled[index])
      index++
    }
    
    generatedRounds.push({ matchups, sittingOut })
    previousSitters = new Set(sittingOut)
  }
  
  return generatedRounds
}

// GET /api/scrimmages/[scrimmageId] - Get a specific scrimmage
export async function GET(
  request: Request,
  { params }: { params: Promise<{ scrimmageId: string }> }
) {
  const { scrimmageId } = await params
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scrimmage = await prisma.scrimmage.findUnique({
    where: { id: scrimmageId },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true
        }
      },
      participants: true,
      scrimmageRounds: {
        orderBy: {
          roundNumber: 'asc'
        }
      }
    }
  })

  if (!scrimmage) {
    return NextResponse.json({ error: 'Scrimmage not found' }, { status: 404 })
  }

  return NextResponse.json({ scrimmage })
}

// DELETE /api/scrimmages/[scrimmageId] - Delete a scrimmage
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ scrimmageId: string }> }
) {
  const { scrimmageId } = await params
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

  const scrimmage = await prisma.scrimmage.findUnique({
    where: { id: scrimmageId }
  })

  if (!scrimmage) {
    return NextResponse.json({ error: 'Scrimmage not found' }, { status: 404 })
  }

  // Only creator can delete
  if (scrimmage.createdById !== user.id) {
    return NextResponse.json({ error: 'Only the creator can delete this scrimmage' }, { status: 403 })
  }

  await prisma.scrimmage.delete({
    where: { id: scrimmageId }
  })

  return NextResponse.json({ success: true })
}
