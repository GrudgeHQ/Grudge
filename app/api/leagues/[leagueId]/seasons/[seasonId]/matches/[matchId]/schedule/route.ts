import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; seasonId: string; matchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, seasonId, matchId } = await params
    const { scheduledAt, location, description, notes } = await request.json()
    
    console.log('=== MATCH SCHEDULING START ===')
    console.log('Params:', { leagueId, seasonId, matchId })
    console.log('User:', session.user.email)
    console.log('Data:', { scheduledAt, location, description, notes })

    // Validate required fields
    if (!scheduledAt) {
      return NextResponse.json({ error: 'Date and time are required' }, { status: 400 })
    }

    if (!location || location.trim() === '') {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 })
    }

    // Check if user is league manager
    console.log('Looking up league:', leagueId)
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { creator: true }
    })
    console.log('Found league:', league ? 'yes' : 'no')
    console.log('League creator email:', league?.creator?.email)

    if (!league || league.creator?.email !== session.user.email) {
      console.log('Permission denied: not league manager')
      return NextResponse.json({ error: 'Only league managers can schedule matches' }, { status: 403 })
    }

    // Update the match schedule
    console.log('Updating match:', matchId)
    console.log('Update data:', {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      location,
      description,
      notes
    })
    
    const updatedMatch = await prisma.seasonMatch.update({
      where: { id: matchId },
      data: {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        location,
        description,
        notes
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        season: true
      }
    })
    console.log('Match updated successfully')

    // Create availability requests and notifications for all team members if match is scheduled
    if (scheduledAt) {
      try {
        console.log('Creating availability requests and notifications...')
        
        // Get team members for both teams
        const [homeMembers, awayMembers] = await Promise.all([
          prisma.teamMember.findMany({
            where: { teamId: updatedMatch.homeTeamId },
            select: { userId: true, teamId: true }
          }),
          prisma.teamMember.findMany({
            where: { teamId: updatedMatch.awayTeamId },
            select: { userId: true, teamId: true }
          })
        ])

        const allMembers = [...homeMembers, ...awayMembers]
        console.log('Found team members:', allMembers.length)

        // Delete existing availability requests
        await prisma.seasonMatchAvailability.deleteMany({
          where: { seasonMatchId: matchId }
        })
        console.log('Deleted existing availability requests')

        // Create new availability requests
        const availabilityData = allMembers.map(member => ({
          seasonMatchId: matchId,
          userId: member.userId,
          teamId: member.teamId,
          status: 'MAYBE' as const
        }))

        if (availabilityData.length > 0) {
          await prisma.seasonMatchAvailability.createMany({
            data: availabilityData
          })
          console.log('Created availability requests')
        }

        // Create notifications for all team members
        const notificationData = allMembers.map(member => ({
          userId: member.userId,
          type: 'MATCH_SCHEDULED' as const,
          title: 'Match Scheduled',
          message: `${updatedMatch.homeTeam.name} vs ${updatedMatch.awayTeam.name} has been scheduled for ${new Date(scheduledAt).toLocaleDateString()} at ${location || 'TBD'}`,
          actionUrl: `/season-matches/${matchId}/availability`,
          teamId: member.teamId
        }))

        await prisma.notification.createMany({
          data: notificationData
        })
        console.log('Created notifications')
        
      } catch (notificationError) {
        // Log the error but don't fail the whole request since the match was scheduled successfully
        console.error('Error creating availability requests or notifications:', notificationError)
        console.log('Match was scheduled successfully despite notification error')
      }
    }

    console.log('=== MATCH SCHEDULING COMPLETED SUCCESSFULLY ===')
    console.log('Returning success response...')
    
    const successResponse = NextResponse.json({ 
      success: true,
      message: 'Match scheduled successfully',
      match: updatedMatch
    }, { status: 200 })
    
    console.log('Success response created')
    return successResponse

  } catch (error) {
    console.error('Error scheduling match:', error)
    console.error('Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack
    })
    return NextResponse.json(
      { success: false, error: 'Failed to schedule match', details: (error as Error)?.message },
      { status: 500 }
    )
  }
}