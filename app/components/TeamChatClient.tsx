"use client"
import React, { useEffect, useState } from 'react'
import Pusher from 'pusher-js'

export default function TeamChatClient({ teamId }: { teamId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [presenceMembers, setPresenceMembers] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    let mounted = true
    let p: any = null
    let channel: any = null

    async function init() {
      // load existing messages
      try {
        const res = await fetch(`/api/teams/${teamId}/chat`)
        if (res.ok) {
          const json = await res.json()
          if (mounted && json.messages) setMessages(json.messages)
        }
      } catch (e) {
        // ignore
      }

      const key = process.env.NEXT_PUBLIC_PUSHER_KEY || ''
      const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || undefined
      if (!key) return

      p = new Pusher(key, {
        cluster,
        authEndpoint: '/api/realtime/auth',
        auth: { headers: { 'Content-Type': 'application/json' } },
      } as any)

      channel = p.subscribe(`presence-team-${teamId}`)

      channel.bind('pusher:subscription_succeeded', (members: any) => {
        try {
          const list: any[] = []
          if (members && members.members) {
            for (const [_, v] of Object.entries(members.members)) {
              list.push(v)
            }
          }
          setPresenceMembers(list)
        } catch (e) {
          // ignore
        }
      })

      channel.bind('pusher:member_added', (member: any) => {
        setPresenceMembers((prev) => [...prev, member])
        setMessages((m) => [...m, { system: true, presenceEvent: 'join', member }])
      })
      channel.bind('pusher:member_removed', (member: any) => {
        setPresenceMembers((prev) => prev.filter((p) => p.user_id !== member.user_id))
        setMessages((m) => [...m, { system: true, presenceEvent: 'leave', member }])
      })

      channel.bind('chat.message', (data: any) => setMessages((m) => [...m, data.message || data]))
      channel.bind('assignment.created', (data: any) => setMessages((m) => [...m, { system: true, ...data }]))

      p.connection.bind('connected', () => setConnected(true))
      p.connection.bind('disconnected', () => setConnected(false))
    }

    init().catch(() => {})

    return () => {
      mounted = false
      try {
        if (channel) {
          channel.unbind_all()
        }
        if (p) {
          p.unsubscribe(`presence-team-${teamId}`)
          p.disconnect()
        }
      } catch (e) {
        // ignore
      }
    }
  }, [teamId])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text.trim()) return
    try {
      const res = await fetch(`/api/teams/${teamId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        setText('')
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Team chat ({connected ? 'online' : 'offline'})</div>
      </div>
      <div className="mb-2 flex gap-4">
        <div className="flex-1 space-y-2 max-h-48 overflow-auto">
          {messages.map((m, i) => (
            <div key={i} className={`p-2 rounded ${m.system ? 'bg-gray-100' : 'bg-white'}`}>
              <div className="text-sm">
                {m.presence && m.members ? (
                  <div>Online: {m.members.map((x: any) => x.user_info?.name ?? x.user_id).join(', ')}</div>
                ) : m.presenceEvent ? (
                  <div>{m.presenceEvent === 'join' ? 'Joined:' : 'Left:'} {m.member?.user_info?.name ?? m.member?.user_id}</div>
                ) : (
                  m.system ? JSON.stringify(m) : m.content ?? m.text ?? JSON.stringify(m)
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="w-48 p-2 border rounded bg-white">
          <div className="font-medium mb-2">Online</div>
          {presenceMembers.length > 0 && (
            <div className="text-xs text-gray-600 mb-2">Online: {presenceMembers.map((p) => p.user_info?.name ?? p.user_id).join(', ')}</div>
          )}
          <ul className="text-sm space-y-1">
            {presenceMembers.length === 0 && <li className="text-gray-500">No one online</li>}
            {presenceMembers.map((p, idx) => (
              <li key={idx}>{p.user_info?.name ?? p.user_id}</li>
            ))}
          </ul>
        </div>
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="Message..." />
        <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all">Send</button>
      </form>
    </div>
  )
}
