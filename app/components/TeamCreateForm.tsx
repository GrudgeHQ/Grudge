"use client"
import React, { useState } from 'react'

import { SPORTS } from '@/lib/sports'

export default function TeamCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState(SPORTS[0])
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sport, password }),
    })
    const data = await res.json()
    if (!res.ok) return setError(data.error || 'Failed')
    setSuccess(`Team created  invite code: ${data.team.inviteCode}`)
    setName('')
    setPassword('')
    if (onCreated) onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 p-6 rounded-lg text-white">
      <div>
        <label className="block mb-1">Team name</label>
        <input className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1">Sport</label>
        <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500" value={sport} onChange={(e) => setSport(e.target.value)}>
          {SPORTS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1">Team password (optional)</label>
        <input className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <div className="text-red-500 bg-red-500/10 border border-red-500 rounded px-4 py-2">{error}</div>}
      {success && <div className="text-green-500 bg-green-500/10 border border-green-500 rounded px-4 py-2">{success}</div>}
      <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all w-full" type="submit">Create team</button>
    </form>
  )
}
