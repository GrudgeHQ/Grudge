"use client"
import React, { useState, useMemo } from 'react'
import { useTeamFilter } from '../context/TeamFilterContext'

type Note = {
  id: string
  type: string
  payload: any
  createdAt: string
  read: boolean
}

function getNotificationTitle(type: string, payload: any) {
  switch (type) {
    case 'ASSIGNMENT_PENDING':
      return 'Match Assignment'
    case 'ASSIGNMENT_REMOVED':
      return 'Removed from Match'
    case 'PLAYER_REMOVED_SELF':
      return 'Player Availability Change'  
    case 'league_join_request':
      return 'League Join Request'
    case 'league_join_approve':
      return 'League Join Approved'
    case 'league_join_deny':
      return 'League Join Denied'
    case 'team_join_request':
      return 'Team Join Request'
    case 'team_join_approve':
      return 'Team Join Approved'
    case 'team_join_deny':
      return 'Team Join Denied'
    case 'season_match.score_submitted':
      return 'League Match Score Submitted'
    case 'season_match.score_updated':
      return 'League Match Score Updated'
    case 'season_match.score_confirmed':
      return 'League Match Score Confirmed'
    case 'season_match.score_disputed':
      return 'League Match Score Disputed'
    case 'league.match_score_confirmed':
      return 'League Standings Updated'
    case 'league.match_score_disputed':
      return 'League Match Score Disputed'
    case 'chat.message':
      return 'New Chat Message'
    default:
      return payload?.title || type.replaceAll('_', ' ')
  }
}

export default function NotificationsListClient({ initial }: { initial: Note[] }) {
  const { selectedTeamId } = useTeamFilter()
  const [notes, setNotes] = useState<Note[]>(initial)
  const [clearing, setClearing] = useState(false)

  // Filter notifications by team
  const filteredNotes = useMemo(() => {
    if (selectedTeamId === 'all') return notes
    
    return notes.filter((n) => {
      // Check if notification payload contains teamId
      if (n.payload && typeof n.payload === 'object') {
        // If notification has a teamId, only show if it matches the selected team
        if (n.payload.teamId) {
          return n.payload.teamId === selectedTeamId
        }
        // If no teamId, show the notification (it's a global notification)
        return true
      }
      // If no payload, show the notification
      return true
    })
  }, [notes, selectedTeamId])

  async function toggleRead(id: string, read: boolean) {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read }),
      })
      if (res.ok) {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)))
      }
    } catch (e) {
      // ignore for now
    }
  }

  async function clearAllNotifications() {
    if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      return
    }

    setClearing(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
      })
      if (res.ok) {
        setNotes([])
      }
    } catch (e) {
      // ignore
    } finally {
      setClearing(false)
    }
  }

  if (!filteredNotes.length) {
    return (
      <div>
        {notes.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={clearAllNotifications}
              disabled={clearing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearing ? 'Clearing...' : 'Clear All'}
            </button>
          </div>
        )}
        <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
          <p className="text-gray-400">
            {selectedTeamId === 'all' ? 'No notifications' : 'No notifications for this team'}
          </p>
        </div>
      </div>
    )
  }

  function renderNotificationContent(n: Note) {
    if (n.type === 'ASSIGNMENT_PENDING') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            You have been assigned to a match{payload.opponentName ? ` vs ${payload.opponentName}` : ''}.
          </p>
          {payload.scheduledAt && (
            <p className="text-gray-400 text-xs mb-2">
              📅 {new Date(payload.scheduledAt).toLocaleDateString()} at{' '}
              {new Date(payload.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <a
            href="/assignments"
            className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
          >
            Confirm Attendance →
          </a>
        </div>
      )
    }

    if (n.type === 'ASSIGNMENT_REMOVED') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            You have been removed from the match{payload.opponentName ? ` vs ${payload.opponentName}` : ''}.
          </p>
          {payload.scheduledAt && (
            <p className="text-gray-400 text-xs mb-2">
              📅 {new Date(payload.scheduledAt).toLocaleDateString()} at{' '}
              {new Date(payload.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {payload.location && (
            <p className="text-gray-400 text-xs">
              📍 {payload.location}
            </p>
          )}
        </div>
      )
    }

    if (n.type === 'PLAYER_REMOVED_SELF') {
      const payload = n.payload || {}
      const statusText = payload.newStatus === 'UNAVAILABLE' ? 'unavailable' : 'maybe'
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-yellow-400">{payload.playerName || 'A player'}</span> changed their availability to{' '}
            <span className="font-medium">{statusText}</span> and was automatically removed from the match
            {payload.opponentName ? ` vs ${payload.opponentName}` : ''}.
          </p>
          {payload.scheduledAt && (
            <p className="text-gray-400 text-xs mb-2">
              📅 {new Date(payload.scheduledAt).toLocaleDateString()} at{' '}
              {new Date(payload.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <a
            href={`/matches/${payload.matchId}`}
            className="inline-block px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 active:bg-yellow-800 active:scale-95 transition-all"
          >
            View Match →
          </a>
        </div>
      )
    }

    if (n.type === 'league_join_request') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-green-400">{payload.teamName || 'A team'}</span> has requested to join your league{' '}
            <span className="font-medium text-blue-400">{payload.leagueName}</span>.
          </p>
          <a
            href={`/leagues/${payload.leagueId}`}
            className="inline-block px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
          >
            Review Request →
          </a>
        </div>
      )
    }

    if (n.type === 'league_join_approve') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            Your team <span className="font-medium text-green-400">{payload.teamName}</span> has been accepted into the league{' '}
            <span className="font-medium text-blue-400">{payload.leagueName}</span>!
          </p>
          <a
            href={`/leagues/${payload.leagueId}`}
            className="inline-block px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
          >
            View League →
          </a>
        </div>
      )
    }

    if (n.type === 'league_join_deny') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            Your team's request to join the league{' '}
            <span className="font-medium text-blue-400">{payload.leagueName}</span> has been denied.
          </p>
          <a
            href="/leagues/join"
            className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
          >
            Find Other Leagues →
          </a>
        </div>
      )
    }

    if (n.type === 'team_join_request') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-purple-400">{payload.requestedByName || 'Someone'}</span> has requested to join your team{' '}
            <span className="font-medium text-blue-400">{payload.teamName}</span>.
          </p>
          <a
            href="/roster"
            className="inline-block px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 active:bg-purple-800 active:scale-95 transition-all"
          >
            Review Request →
          </a>
        </div>
      )
    }

    if (n.type === 'team_join_approve') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            Your request to join the team{' '}
            <span className="font-medium text-blue-400">{payload.teamName}</span> has been approved! You are now a member.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
          >
            View Dashboard →
          </a>
        </div>
      )
    }

    if (n.type === 'team_join_deny') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            Your request to join the team{' '}
            <span className="font-medium text-blue-400">{payload.teamName}</span> has been denied.
          </p>
          <a
            href="/teams/join"
            className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
          >
            Find Other Teams →
          </a>
        </div>
      )
    }

    if (n.type === 'season_match.score_submitted') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-orange-400">{payload.submittingTeam || 'A team'}</span> has submitted a score for your league match in{' '}
            <span className="font-medium text-blue-400">{payload.league}</span>
            <br />
            Final Score: <span className="font-semibold">{payload.homeScore} - {payload.awayScore}</span>
          </p>
          {payload.submittedBy && (
            <p className="text-gray-400 text-xs mb-2">
              Submitted by: {payload.submittedBy}
            </p>
          )}
          {payload.notes && (
            <p className="text-gray-300 text-sm mb-2 italic">
              Note: "{payload.notes}"
            </p>
          )}
          <a
            href={payload.seasonMatchId ? `/season-matches/${payload.seasonMatchId}` : (payload.leagueId ? `/leagues/${payload.leagueId}` : `/matches`)}
            className="inline-block px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 active:bg-orange-800 active:scale-95 transition-all"
          >
            Review & Confirm →
          </a>
        </div>
      )
    }

    if (n.type === 'season_match.score_updated') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-orange-400">{payload.submittingTeam || 'A team'}</span> has updated the score for your league match in{' '}
            <span className="font-medium text-blue-400">{payload.league}</span>
            <br />
            Final Score: <span className="font-semibold">{payload.homeScore} - {payload.awayScore}</span>
          </p>
          {payload.submittedBy && (
            <p className="text-gray-400 text-xs mb-2">
              Submitted by: {payload.submittedBy}
            </p>
          )}
          {payload.notes && (
            <p className="text-gray-300 text-sm mb-2 italic">
              Note: "{payload.notes}"
            </p>
          )}
          <a
            href={payload.seasonMatchId ? `/season-matches/${payload.seasonMatchId}` : (payload.leagueId ? `/leagues/${payload.leagueId}` : `/matches`)}
            className="inline-block px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 active:bg-orange-800 active:scale-95 transition-all"
          >
            Review & Confirm →
          </a>
        </div>
      )
    }

    if (n.type === 'season_match.score_confirmed') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-green-400">{payload.confirmingTeam || 'The opposing team'}</span> has confirmed the score for your league match in{' '}
            <span className="font-medium text-blue-400">{payload.leagueName}</span>:
            <br />
            <span className="font-medium">{payload.homeTeam}</span> {payload.homeScore} - {payload.awayScore} <span className="font-medium">{payload.awayTeam}</span>
          </p>
          {payload.confirmedBy && (
            <p className="text-gray-400 text-xs mb-2">
              Confirmed by: {payload.confirmedBy}
            </p>
          )}
          <a
            href={payload.leagueId ? `/leagues/${payload.leagueId}` : `/matches`}
            className="inline-block px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
          >
            View Match Details →
          </a>
        </div>
      )
    }

    if (n.type === 'season_match.score_disputed') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-red-400">{payload.disputingTeam || 'The opposing team'}</span> has disputed the score for your league match in{' '}
            <span className="font-medium text-blue-400">{payload.leagueName}</span>:
            <br />
            <span className="font-medium">{payload.homeTeam}</span> {payload.homeScore} - {payload.awayScore} <span className="font-medium">{payload.awayTeam}</span>
          </p>
          {payload.disputeReason && (
            <p className="text-gray-300 text-sm mb-2 italic">
              Reason: "{payload.disputeReason}"
            </p>
          )}
          {payload.disputedBy && (
            <p className="text-gray-400 text-xs mb-2">
              Disputed by: {payload.disputedBy}
            </p>
          )}
          <a
            href={payload.leagueId ? `/leagues/${payload.leagueId}` : `/matches`}
            className="inline-block px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all"
          >
            Review Dispute →
          </a>
        </div>
      )
    }

    if (n.type === 'league.match_score_confirmed') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            League standings have been updated in <span className="font-medium text-blue-400">{payload.leagueName}</span> after the confirmed match result:
            <br />
            <span className="font-medium">{payload.homeTeam}</span> {payload.homeScore} - {payload.awayScore} <span className="font-medium">{payload.awayTeam}</span>
          </p>
          {payload.submittingTeam && payload.confirmingTeam && (
            <p className="text-gray-400 text-xs mb-2">
              Submitted by {payload.submittingTeam}, confirmed by {payload.confirmingTeam}
            </p>
          )}
          <a
            href={payload.leagueId ? `/leagues/${payload.leagueId}` : `/matches`}
            className="inline-block px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
          >
            View Match Details →
          </a>
        </div>
      )
    }

    if (n.type === 'league.match_score_disputed') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            A match result in <span className="font-medium text-blue-400">{payload.leagueName}</span> has been disputed and requires league manager attention:
            <br />
            <span className="font-medium">{payload.homeTeam}</span> {payload.homeScore} - {payload.awayScore} <span className="font-medium">{payload.awayTeam}</span>
          </p>
          {payload.disputeReason && (
            <p className="text-gray-300 text-sm mb-2 italic">
              Dispute reason: "{payload.disputeReason}"
            </p>
          )}
          {payload.submittingTeam && payload.disputingTeam && (
            <p className="text-gray-400 text-xs mb-2">
              Submitted by {payload.submittingTeam}, disputed by {payload.disputingTeam}
            </p>
          )}
          <a
            href={payload.leagueId ? `/leagues/${payload.leagueId}` : `/matches`}
            className="inline-block px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all"
          >
            Review Dispute →
          </a>
        </div>
      )
    }

    if (n.type === 'chat.message') {
      const payload = n.payload || {}
      return (
        <div className="mt-2 text-sm">
          <p className="text-gray-300 mb-2">
            <span className="font-medium text-blue-400">{payload.senderName || 'Someone'}</span> sent a message:
          </p>
          {payload.preview && (
            <p className="text-gray-300 text-sm mb-2 italic bg-slate-700/50 p-2 rounded">
              "{payload.preview}{payload.preview.length >= 50 ? '...' : ''}"
            </p>
          )}
          <a
            href="/chat"
            className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all"
          >
            View Chat →
          </a>
        </div>
      )
    }

    // Default fallback for other notification types
    return (
      <pre className="mt-2 text-xs bg-slate-700 text-gray-300 p-2 rounded overflow-auto">
        {JSON.stringify(n.payload, null, 2)}
      </pre>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={clearAllNotifications}
          disabled={clearing}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? 'Clearing...' : 'Clear All'}
        </button>
      </div>
      <ul className="space-y-3">
        {filteredNotes.map((n) => (
        <li key={n.id} className={`p-4 border border-slate-700 rounded-lg ${n.read ? 'bg-slate-800/50' : 'bg-slate-800'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                {(n.type === 'ASSIGNMENT_PENDING' || n.type === 'PLAYER_REMOVED_SELF' || n.type === 'league_join_request' || n.type === 'team_join_request' || n.type === 'season_match.score_submitted' || n.type === 'season_match.score_updated' || n.type === 'season_match.score_confirmed' || n.type === 'season_match.score_disputed' || n.type === 'league.match_score_confirmed' || n.type === 'league.match_score_disputed' || n.type === 'chat.message') && !n.read && (
                  <span className={`w-2 h-2 rounded-full ${
                    n.type === 'PLAYER_REMOVED_SELF' ? 'bg-yellow-500' : 
                    n.type === 'league_join_request' ? 'bg-green-500' :
                    n.type === 'team_join_request' ? 'bg-purple-500' :
                    n.type === 'season_match.score_disputed' || n.type === 'league.match_score_disputed' ? 'bg-red-500' :
                    n.type === 'season_match.score_confirmed' || n.type === 'league.match_score_confirmed' ? 'bg-green-500' :
                    n.type === 'season_match.score_submitted' || n.type === 'season_match.score_updated' ? 'bg-orange-500' :
                    n.type === 'chat.message' ? 'bg-blue-400' :
                    'bg-blue-500'
                  }`}></span>
                )}
                {getNotificationTitle(n.type, n.payload)}
              </div>
              <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <button 
                className="text-sm text-blue-400 hover:text-blue-300 active:text-blue-200 active:scale-95 transition-all" 
                onClick={() => toggleRead(n.id, !n.read)}
              >
                {n.read ? 'Mark unread' : 'Mark read'}
              </button>
            </div>
          </div>
          {renderNotificationContent(n)}
        </li>
      ))}
    </ul>
    </div>
  )
}
