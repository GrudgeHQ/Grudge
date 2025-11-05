import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/teams/[teamId]/profile - Get team profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is a member of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied - not a team member' }, { status: 403 })
    }

    // Get team with all profile information
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
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
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error fetching team profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[teamId]/profile - Update team profile
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is an admin of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: user.id,
        isAdmin: true
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied - admin privileges required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, website, location, foundedYear, teamColors } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    // Validate team name length
    if (name.trim().length > 50) {
      return NextResponse.json({ error: 'Team name must be 50 characters or less' }, { status: 400 })
    }

    // Validate description length
    if (description && description.length > 200) {
      return NextResponse.json({ error: 'Description must be 200 characters or less' }, { status: 400 })
    }

    // Validate website URL format
    if (website && website.trim()) {
      try {
        new URL(website.trim())
      } catch {
        return NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 })
      }
    }

    // Validate founded year
    if (foundedYear && (foundedYear < 1900 || foundedYear > new Date().getFullYear())) {
      return NextResponse.json({ error: 'Invalid founded year' }, { status: 400 })
    }

    // Check if team name is already taken by another team
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: name.trim(),
        id: { not: teamId }
      }
    })

    if (existingTeam) {
      return NextResponse.json({ error: 'Team name is already taken' }, { status: 400 })
    }

    // Update team profile (only name for now until schema migration is complete)
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: name.trim()
        // TODO: Add other fields after database migration:
        // description: description?.trim() || null,
        // website: website?.trim() || null,
        // location: location?.trim() || null,
        // foundedYear: foundedYear || null,
        // teamColors: teamColors || null
      },
      include: {
        members: {
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
    })

    return NextResponse.json({ 
      team: updatedTeam,
      message: 'Team profile updated successfully'
    })
  } catch (error) {
    console.error('Error updating team profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}