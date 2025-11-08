import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function NotificationsPanel() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return null

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  const notes = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 })

  return (
    <div className="border-2 border-slate-700 rounded-lg p-3 bg-slate-800 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-white flex items-center gap-2">
          <span className="text-blue-400">🔔</span>
          Notifications
          {notes.filter((n: typeof notes[number]) => !n.read).length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {notes.filter((n: typeof notes[number]) => !n.read).length}
            </span>
          )}
        </div>
        <Link href="/notifications" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          View all →
        </Link>
      </div>
      {notes.length === 0 && (
        <div className="text-sm text-gray-400 text-center py-4">No notifications</div>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {notes.map((n: typeof notes[number]) => {
          const isAssignmentPending = n.type === 'ASSIGNMENT_PENDING'
          const isScoreSubmitted = n.type === 'season_match.score_submitted' || n.type === 'season_match.score_updated'
          const payload = n.payload as any
          
          return (
            <li 
              key={n.id} 
              className={`p-2 rounded-lg border transition-colors ${
                n.read 
                  ? 'bg-slate-700/30 border-slate-700 text-gray-400' 
                  : isAssignmentPending
                  ? 'bg-yellow-900/20 border-yellow-700 text-white'
                  : isScoreSubmitted
                  ? 'bg-orange-900/20 border-orange-700 text-white'
                  : 'bg-blue-900/20 border-blue-700 text-white'
              }`}
            >
              <div className="font-medium text-sm mb-1">
                {!n.read && <span className={isAssignmentPending || n.type === 'PLAYER_REMOVED_SELF' ? 'text-yellow-400 mr-1' : isScoreSubmitted ? 'text-orange-400 mr-1' : 'text-blue-400 mr-1'}>●</span>}
                {n.type.replaceAll('_', ' ')}
              </div>
              {(isAssignmentPending || n.type === 'ASSIGNMENT_REMOVED' || n.type === 'PLAYER_REMOVED_SELF') && payload?.opponentName && (
                <div className="text-xs text-gray-300 mb-1">
                  vs {payload.opponentName}
                </div>
              )}
              {n.type === 'PLAYER_REMOVED_SELF' && payload?.playerName && (
                <div className="text-xs text-yellow-300 mb-1">
                  {payload.playerName} removed themselves
                </div>
              )}
              {isScoreSubmitted && (
                <div className="text-xs text-orange-300 mb-1">
                  {payload?.submittingTeam} submitted: {payload?.homeScore} - {payload?.awayScore}
                </div>
              )}
              <div className="text-xs text-gray-500">
                {new Date(n.createdAt).toLocaleString()}
              </div>
              {isAssignmentPending && !n.read && (
                <Link 
                  href="/assignments"
                  className="text-xs text-yellow-400 hover:text-yellow-300 underline mt-1 inline-block"
                >
                  Confirm now →
                </Link>
              )}
              {n.type === 'PLAYER_REMOVED_SELF' && !n.read && (
                <Link 
                  href={`/matches/${payload?.matchId}`}
                  className="text-xs text-yellow-400 hover:text-yellow-300 underline mt-1 inline-block"
                >
                  View match →
                </Link>
              )}
              {isScoreSubmitted && !n.read && payload?.seasonMatchId && (
                <Link 
                  href={`/season-matches/${payload.seasonMatchId}`}
                  className="text-xs text-orange-400 hover:text-orange-300 underline mt-1 inline-block"
                >
                  Review & Confirm →
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
