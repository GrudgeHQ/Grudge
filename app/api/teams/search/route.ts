import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const query = url.searchParams.get('q')
  const sport = url.searchParams.get('sport')
  const excludeLeague = url.searchParams.get('excludeLeague')

  if (!query || query.length < 2) {
    return NextResponse.json({ teams: [] })
  }

  try {
    const whereClause: any = {
      name: {
        contains: query,
        mode: 'insensitive'
      }
    }

    // Filter by sport if provided
    if (sport) {
      whereClause.sport = sport
    }

    // Exclude teams already in a specific league
    if (excludeLeague) {
      whereClause.leagues = {
        none: {
          leagueId: excludeLeague
        }
      }
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      take: 10,
      select: {
        id: true,
        name: true,
        sport: true,
        leagues: {
          select: {
            league: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error searching teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
