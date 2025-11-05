"use client"
import React, { useEffect, useState, useRef } from 'react'
import { useTeamFilter } from '../context/TeamFilterContext'

type TimeFilter = 'hour' | 'day' | 'week' | 'month' | 'all'

export default function ChatPage() {
  const { selectedTeamId } = useTeamFilter()
  const [teams, setTeams] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [chatScope, setChatScope] = useState<'team' | 'league' | 'team_to_team'>('team')
  const [teamLeague, setTeamLeague] = useState<any>(null)
  const [selectedTargetTeam, setSelectedTargetTeam] = useState<string>('')
  const [showLeagueWarning, setShowLeagueWarning] = useState(false)
  const [showTeamToTeamWarning, setShowTeamToTeamWarning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = React.useCallback(() => {
    if (selectedTeamId === 'all') {
      setMessages([])
      setLoading(false)
      return
    }

    // If team-to-team mode but no target team selected, show empty
    if (chatScope === 'team_to_team' && !selectedTargetTeam) {
      setMessages([])
      setLoading(false)
      return
    }

    let endpoint = `/api/teams/${selectedTeamId}/chat`
    
    if (chatScope === 'league' && teamLeague) {
      endpoint = `/api/leagues/${teamLeague.id}/chat`
    } else if (chatScope === 'team_to_team' && selectedTargetTeam) {
      endpoint = `/api/teams/${selectedTeamId}/chat/team-to-team?targetTeamId=${selectedTargetTeam}`
    }

    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => {
        const allMessages = d.messages || []
        
        // Additional client-side filtering to ensure separation
        let filteredMessages = allMessages
        if (chatScope === 'league') {
          filteredMessages = allMessages.filter((msg: any) => msg.content.startsWith('[LEAGUE]'))
        } else if (chatScope === 'team_to_team' && selectedTargetTeam) {
          filteredMessages = allMessages.filter((msg: any) => 
            msg.content.includes(`[TEAM_TO_TEAM:${selectedTargetTeam}]`) ||
            msg.content.includes(`[TEAM_TO_TEAM:${selectedTeamId}]`)
          )
        } else {
          filteredMessages = allMessages.filter((msg: any) => 
            !msg.content.startsWith('[LEAGUE]') && !msg.content.includes('[TEAM_TO_TEAM:')
          )
        }
        
        setMessages(filteredMessages)
        setLoading(false)
        setTimeout(scrollToBottom, 100)
      })
      .catch(() => {
        setLoading(false)
      })

    // Mark chat notifications as read for this team
    fetch('/api/notifications/mark-chat-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: selectedTeamId })
    }).catch(() => {})
  }, [selectedTeamId, chatScope, selectedTargetTeam, teamLeague])

  const checkTeamLeague = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/league`)
      const data = await res.json()
      
      if (res.ok && data.league) {
        setTeamLeague(data.league)
      } else {
        setTeamLeague(null)
        setChatScope('team') // Reset to team if no league
      }
    } catch (err) {
      setTeamLeague(null)
      setChatScope('team')
    }
  }

  useEffect(() => {
    // Load teams
    fetch('/api/teams')
      .then((r) => r.json())
      .then((d) => {
        setTeams(d.teams || [])
      })
      .catch(() => {})

    if (selectedTeamId !== 'all') {
      checkTeamLeague(selectedTeamId)
    }

    loadMessages()
  }, [selectedTeamId, loadMessages])

  useEffect(() => {
    loadMessages()
    
        // Poll for new messages every 3 seconds
        const interval = setInterval(() => {
          if (selectedTeamId !== 'all') {
            // Skip polling if team-to-team mode but no target team selected
            if (chatScope === 'team_to_team' && !selectedTargetTeam) {
              return
            }

            let endpoint = `/api/teams/${selectedTeamId}/chat`
            
            if (chatScope === 'league' && teamLeague) {
              endpoint = `/api/leagues/${teamLeague.id}/chat`
            } else if (chatScope === 'team_to_team' && selectedTargetTeam) {
              endpoint = `/api/teams/${selectedTeamId}/chat/team-to-team?targetTeamId=${selectedTargetTeam}`
            }        fetch(endpoint)
          .then((r) => r.json())
          .then((d) => {
            const oldLength = messages.length
            const newMessages = d.messages || []
            
            // Additional client-side filtering to ensure separation
            let filteredMessages = newMessages
            if (chatScope === 'league') {
              filteredMessages = newMessages.filter((msg: any) => msg.content.startsWith('[LEAGUE]'))
            } else if (chatScope === 'team_to_team' && selectedTargetTeam) {
              filteredMessages = newMessages.filter((msg: any) => 
                msg.content.includes(`[TEAM_TO_TEAM:${selectedTargetTeam}]`) ||
                msg.content.includes(`[TEAM_TO_TEAM:${selectedTeamId}]`)
              )
            } else {
              filteredMessages = newMessages.filter((msg: any) => 
                !msg.content.startsWith('[LEAGUE]') && !msg.content.includes('[TEAM_TO_TEAM:')
              )
            }
            
            setMessages(filteredMessages)
            if (filteredMessages.length > oldLength) {
              setTimeout(scrollToBottom, 100)
            }
          })
          .catch(() => {})
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedTeamId, chatScope, teamLeague, selectedTargetTeam])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()

    if (!newMessage.trim() || selectedTeamId === 'all') return

    // Check if this is a league message and show warning if first time
    if (chatScope === 'league' && teamLeague) {
      const hasShownWarning = localStorage.getItem(`league-chat-warning-${teamLeague.id}`)
      if (!hasShownWarning) {
        setShowLeagueWarning(true)
        return
      }
    }

    // Check if this is a team-to-team message and show warning if first time
    if (chatScope === 'team_to_team' && selectedTargetTeam) {
      const hasShownWarning = localStorage.getItem(`team-to-team-warning-${selectedTargetTeam}`)
      if (!hasShownWarning) {
        setShowTeamToTeamWarning(true)
        return
      }
    }

    await sendMessage()
  }

  async function sendMessage() {
    setSending(true)

    try {
      let endpoint = `/api/teams/${selectedTeamId}/chat`
      const requestBody: any = { content: newMessage }

      if (chatScope === 'league' && teamLeague) {
        endpoint = `/api/leagues/${teamLeague.id}/chat`
        requestBody.teamId = selectedTeamId
      } else if (chatScope === 'team_to_team' && selectedTargetTeam) {
        endpoint = `/api/teams/${selectedTeamId}/chat/team-to-team`
        requestBody.targetTeamId = selectedTargetTeam
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (res.ok) {
        setNewMessage('')
        loadMessages()
      }
    } catch (e) {
      // ignore
    } finally {
      setSending(false)
    }
  }

  async function confirmLeagueMessage() {
    // Mark warning as shown for this league
    localStorage.setItem(`league-chat-warning-${teamLeague!.id}`, 'true')
    setShowLeagueWarning(false)
    await sendMessage()
  }

  async function confirmTeamToTeamMessage() {
    // Mark warning as shown for this team-to-team conversation
    localStorage.setItem(`team-to-team-warning-${selectedTargetTeam}`, 'true')
    setShowTeamToTeamWarning(false)
    await sendMessage()
  }

  async function handleClearChat() {
    let scopeName = 'team'
    if (chatScope === 'league') {
      scopeName = 'league'
    } else if (chatScope === 'team_to_team') {
      scopeName = 'team-to-team'
    }

    if (!confirm(`Are you sure you want to clear your ${scopeName} chat history? This will delete messages for all participants.`)) {
      return
    }

    try {
      let endpoint = `/api/teams/${selectedTeamId}/chat`
      
      if (chatScope === 'league' && teamLeague) {
        endpoint = `/api/leagues/${teamLeague.id}/chat`
      } else if (chatScope === 'team_to_team' && selectedTargetTeam) {
        endpoint = `/api/teams/${selectedTeamId}/chat/team-to-team?targetTeamId=${selectedTargetTeam}`
      }

      const res = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (res.ok) {
        loadMessages()
      }
    } catch (e) {
      // ignore
    }
  }

  const getFilteredMessages = () => {
    const now = new Date()
    let cutoffTime: Date

    switch (timeFilter) {
      case 'hour':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'day':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        return messages
    }

    return messages.filter((m) => new Date(m.createdAt) >= cutoffTime)
  }

  const filteredMessages = getFilteredMessages()
  const selectedTeam = teams.find((t) => t.teamId === selectedTeamId)

  if (selectedTeamId === 'all') {
    return (
      <main className="p-4 sm:p-6 max-w-5xl mx-auto safe-area-top safe-area-bottom">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 sm:p-12 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Team Chat</h1>
          <p className="text-gray-400 text-sm sm:text-base">Please select a team to view and send messages.</p>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="p-4 sm:p-6 max-w-5xl mx-auto safe-area-top safe-area-bottom">
        <div className="text-center py-12 text-gray-300">Loading chat...</div>
      </main>
    )
  }

  return (
    <main className="p-2 sm:p-4 lg:p-6 max-w-5xl mx-auto flex flex-col safe-area-top safe-area-bottom" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">
              {chatScope === 'league' 
                ? 'League Chat' 
                : chatScope === 'team_to_team' 
                  ? 'Team-to-Team' 
                  : 'My Team'}
            </h1>
            
            {/* Chat Scope Toggle */}
            {teamLeague && (
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setChatScope('team')}
                  className={`px-3 py-1 text-sm rounded transition-all ${
                    chatScope === 'team'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  My Team
                </button>
                <button
                  onClick={() => setChatScope('team_to_team')}
                  className={`px-3 py-1 text-sm rounded transition-all ${
                    chatScope === 'team_to_team'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Team-to-Team
                </button>
                <button
                  onClick={() => setChatScope('league')}
                  className={`px-3 py-1 text-sm rounded transition-all ${
                    chatScope === 'league'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  League
                </button>
              </div>
            )}
          </div>
          
          {selectedTeam && (
            <p className="text-sm text-gray-400 mt-1">
              {chatScope === 'league' && teamLeague
                ? `${teamLeague.name} - ${selectedTeam.team.name}`
                : selectedTeam.team.name
              }
            </p>
          )}
          
          {chatScope === 'league' && teamLeague && (
            <p className="text-xs text-purple-400 mt-1">
              Messages visible to all teams in this league
            </p>
          )}
          
          {chatScope === 'team_to_team' && teamLeague && (
            <div className="mt-2">
              <select
                value={selectedTargetTeam}
                onChange={(e) => setSelectedTargetTeam(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select team to chat with...</option>
                {teamLeague.teams
                  .filter((lt: any) => lt.teamId !== selectedTeamId)
                  .map((lt: any) => (
                    <option key={lt.teamId} value={lt.teamId}>
                      {lt.team.name}
                    </option>
                  ))}
              </select>
              {selectedTargetTeam && (
                <p className="text-xs text-green-400 mt-1">
                  Private conversation with {teamLeague.teams.find((lt: any) => lt.teamId === selectedTargetTeam)?.team.name}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setTimeFilter('hour')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeFilter === 'hour'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hour
            </button>
            <button
              onClick={() => setTimeFilter('day')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeFilter === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeFilter === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeFilter === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
          <button
            onClick={handleClearChat}
            disabled={
              (chatScope === 'team_to_team' && !selectedTargetTeam) ||
              selectedTeamId === 'all'
            }
            className={`px-3 py-2 text-sm rounded transition-all ${
              (chatScope === 'team_to_team' && !selectedTargetTeam) ||
              selectedTeamId === 'all'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 active:scale-95'
            }`}
          >
            Clear {chatScope === 'league' ? 'League' : chatScope === 'team_to_team' ? 'Team-to-Team' : 'Team'} Chat
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-y-auto mb-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {chatScope === 'team_to_team' && !selectedTargetTeam ? (
              <p>Select a team above to start a team-to-team conversation</p>
            ) : (
              <p>No {chatScope === 'team_to_team' ? 'team-to-team' : chatScope} messages yet. Start the conversation!</p>
            )}
            {chatScope === 'league' && (
              <p className="text-sm mt-2">League messages are visible to all teams in {teamLeague?.name}</p>
            )}
            {chatScope === 'team_to_team' && selectedTargetTeam && (
              <p className="text-sm mt-2">
                Messages visible only to members of both teams
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => {
              const isLeagueMessage = message.content.startsWith('[LEAGUE]')
              const isTeamToTeamMessage = message.content.includes('[TEAM_TO_TEAM:')
              
              let displayContent = message.content
              if (isLeagueMessage) {
                displayContent = message.content.replace('[LEAGUE] ', '')
              } else if (isTeamToTeamMessage) {
                displayContent = message.content.replace(/\[TEAM_TO_TEAM:[^\]]+\] /, '')
              }
              
              return (
                <div key={message.id} className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-blue-400">
                      {message.user.name}
                    </span>
                    {(isLeagueMessage || isTeamToTeamMessage) && message.team && (
                      <span className={`text-xs font-medium ${
                        isLeagueMessage ? 'text-purple-400' : 'text-green-400'
                      }`}>
                        ({message.team.name})
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {isLeagueMessage && (
                      <span className="text-xs text-purple-500 bg-purple-900/30 px-1 rounded">
                        League
                      </span>
                    )}
                    {isTeamToTeamMessage && (
                      <span className="text-xs text-green-500 bg-green-900/30 px-1 rounded">
                        Team Chat
                      </span>
                    )}
                  </div>
                  <div className="text-gray-200 mt-1 break-words">
                    {displayContent}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            chatScope === 'league' 
              ? "Type a message to the entire league..." 
              : chatScope === 'team_to_team' && selectedTargetTeam
                ? `Message ${teamLeague?.teams.find((lt: any) => lt.teamId === selectedTargetTeam)?.team.name}...`
                : "Type a message..."
          }
          disabled={sending}
          className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim() || (chatScope === 'team_to_team' && !selectedTargetTeam)}
          className={`px-6 py-3 text-white rounded-lg hover:opacity-90 active:opacity-80 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            chatScope === 'league' 
              ? 'bg-purple-600 hover:bg-purple-700'
              : chatScope === 'team_to_team'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>

      {/* League Warning Modal */}
      {showLeagueWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md mx-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">League Message Warning</h3>
            </div>
            <p className="text-gray-300 mb-6">
              You are about to send a message to the entire <strong>{teamLeague?.name}</strong> league. 
              This message will be visible to all teams and members in the league, not just your team.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmLeagueMessage}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Send to League
              </button>
              <button
                onClick={() => setShowLeagueWarning(false)}
                className="flex-1 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team-to-Team Warning Modal */}
      {showTeamToTeamWarning && selectedTargetTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md mx-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-7-4L5 20l4-1a8.014 8.014 0 01-7-7c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Team-to-Team Message</h3>
            </div>
            <p className="text-gray-300 mb-6">
              You are about to send a message to <strong>{teamLeague?.teams.find((lt: any) => lt.teamId === selectedTargetTeam)?.team.name}</strong>. 
              This message will be visible to all members of both teams in this private conversation.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmTeamToTeamMessage}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Send Message
              </button>
              <button
                onClick={() => setShowTeamToTeamWarning(false)}
                className="flex-1 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
