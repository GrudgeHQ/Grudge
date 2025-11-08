import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TournamentDetailClient from '@/app/components/TournamentDetailClient'

export default async function TournamentDetailPage({ 
  params 
}: { 
  params: Promise<{ tournamentId: string }> 
}) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    console.log('[Tournament Page] No session found, redirecting to login')
    redirect('/login')
  }

  const { tournamentId } = await params
  console.log('[Tournament Page] Loading tournament:', tournamentId)

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    redirect('/login')
  }

  console.log('[Tournament Page] User authenticated:', user.email)

  // Fetch tournament with all details
  const tournament = await (prisma as any).tournament.findUnique({
    where: { id: tournamentId },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          sport: true,
          creatorId: true
        }
      },
      season: {
        select: {
          id: true,
          name: true
        }
      },
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          seed: 'asc'
        }
      },
      rounds: {
        include: {
          matches: {
            include: {
              homeTeam: {
                include: {
                  team: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              },
              awayTeam: {
                include: {
                  team: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          roundNumber: 'asc'
        }
      },
      winner: {
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      runnerUp: {
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      thirdPlace: {
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  if (!tournament) {
    console.log('[Tournament Page] Tournament not found:', tournamentId)
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Tournament Not Found</h1>
          <p className="text-gray-300 mb-4">The tournament you're looking for doesn't exist.</p>
          <a href="/leagues" className="text-blue-400 hover:text-blue-300">
            Back to Leagues
          </a>
        </div>
      </div>
    )
  }

  console.log('[Tournament Page] Tournament found:', tournament.name)
  console.log('[Tournament Page] Rounds:', tournament.rounds.map((r: any) => ({
    name: r.name,
    number: r.roundNumber,
    matches: r.matches.length
  })))
  tournament.rounds.forEach((round: any) => {
    console.log(`[Tournament Page] ${round.name} matches:`)
    round.matches.forEach((m: any) => {
      console.log(`  - Match ${m.matchNumber}: ${m.homeTeam?.team?.name || 'TBD'} vs ${m.awayTeam?.team?.name || 'TBD'}`)
    })
  })

  // Check if user is league manager
  const isLeagueManager = tournament.league.creatorId === user.id

  // Check if user has access (league manager or team member in tournament)
  const userTeamIds = await prisma.teamMember.findMany({
    where: { userId: user.id },
    select: { teamId: true }
  })

  const userTeamIdSet = new Set(userTeamIds.map((t: typeof userTeamIds[number]) => t.teamId))
  const hasAccess = isLeagueManager || tournament.teams.some((tt: any) => userTeamIdSet.has(tt.teamId))

  console.log('[Tournament Page] Access check - isLeagueManager:', isLeagueManager, 'hasAccess:', hasAccess)

  if (!hasAccess) {
    console.log('[Tournament Page] Access denied for user:', user.email)
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-4">You don't have permission to view this tournament.</p>
          <a href="/leagues" className="text-blue-400 hover:text-blue-300">
            Back to Leagues
          </a>
        </div>
      </div>
    )
  }

  return (
    <TournamentDetailClient 
      tournament={tournament} 
      isLeagueManager={isLeagueManager}
      leagueId={tournament.leagueId}
    />
  )
}
