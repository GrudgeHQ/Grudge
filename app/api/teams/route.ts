import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request, context: { params?: any }) {
  try {
  const session = (await getServerSession(authOptions as any)) as { user?: { email?: string } }
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, sport, password, creatorRole } = body
    
    if (!name || !sport) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Validate creatorRole if provided
    const validRoles = ['ADMIN', 'CAPTAIN', 'CO_CAPTAIN', 'COACH', 'COORDINATOR', 'MEMBER']
    const selectedRole = creatorRole && validRoles.includes(creatorRole) ? creatorRole : 'ADMIN'

    // Validate sport enum
    const validSports = [
      'SOCCER', 'BASKETBALL', 'BASEBALL', 'FOOTBALL', 'VOLLEYBALL', 'TENNIS', 
      'BADMINTON', 'RUGBY', 'HOCKEY', 'ICE_HOCKEY', 'FIELD_HOCKEY', 'LACROSSE', 
      'CRICKET', 'GOLF', 'SWIMMING', 'TRACK', 'CYCLING', 'BOXING', 'MMA', 
      'WRESTLING', 'TABLE_TENNIS', 'SQUASH', 'PICKLEBALL', 'HANDBALL', 'SKIING', 
      'SNOWBOARDING', 'SURFING', 'ROWING', 'SAILING', 'KAYAKING', 'BOWLING', 
      'DODGEBALL', 'KICKBALL', 'ULTIMATE_FRISBEE', 'WATER_POLO', 'POLO', 
      'PING_PONG'
    ]
    
    if (!validSports.includes(sport)) {
      return NextResponse.json({ error: 'Invalid sport selected' }, { status: 400 })
    }

    // First, find the user
    console.log('Finding user with email:', session.user.email)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('User not found with email:', session.user.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('Found user:', user.id, user.name)

    // Generate unique invite code
    let inviteCode = Math.random().toString(36).slice(2, 9).toUpperCase()
    let existingTeam = await prisma.team.findUnique({ where: { inviteCode } })
    
    // Keep generating until we get a unique code
    while (existingTeam) {
      inviteCode = Math.random().toString(36).slice(2, 9).toUpperCase()
      existingTeam = await prisma.team.findUnique({ where: { inviteCode } })
    }
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    // create team
    console.log('Creating team with data:', { name, sport, inviteCode, hasPassword: !!hashedPassword, creatorRole: selectedRole })
    const team = await prisma.team.create({
      data: {
        name,
        sport,
        inviteCode,
        password: hashedPassword,
        members: {
          create: [{
            userId: user.id,
            role: selectedRole, // Use the selected role for display
            isAdmin: true // Creator always gets admin privileges regardless of display role
          }],
        },
      },
    })

    console.log('Team created successfully:', team.id)
    return NextResponse.json({ ok: true, team })
  } catch (error) {
    console.error('Error creating team:', error)
    
    // Provide more specific error messages for common issues
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === 'P2002') {
      // Unique constraint violation
      if (err.meta?.target?.includes('name')) {
        return NextResponse.json({ error: 'A team with this name already exists' }, { status: 400 })
      }
      if (err.meta?.target?.includes('inviteCode')) {
        return NextResponse.json({ error: 'Invite code collision, please try again' }, { status: 500 })
      }
    }
    
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // return teams for the current user
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ teams: [] })
    }
    
    const memberships = await prisma.teamMember.findMany({ 
      where: { user: { email: session.user.email } }, 
      include: { team: true } 
    })
    
    return NextResponse.json({ teams: memberships })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}
