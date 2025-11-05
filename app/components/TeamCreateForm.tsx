"use client"
import React, { useState } from 'react'

export default function TeamCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('SOCCER')
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
    setSuccess(`Team created — invite code: ${data.team.inviteCode}`)
    setName('')
    setPassword('')
    if (onCreated) onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block">Team name</label>
        <input className="border px-2 py-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block">Sport</label>
        <select className="border px-2 py-1 w-full" value={sport} onChange={(e) => setSport(e.target.value)}>
          {Object.entries({
            SOCCER: 'Soccer',
            BASKETBALL: 'Basketball',
            BASEBALL: 'Baseball',
            FOOTBALL: 'Football',
            VOLLEYBALL: 'Volleyball',
            TENNIS: 'Tennis',
            PICKLEBALL: 'Pickleball',
            ULTIMATE_FRISBEE: 'Ultimate Frisbee',
          }).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block">Team password (optional)</label>
        <input className="border px-2 py-1 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}
      <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all" type="submit">Create team</button>
    </form>
  )
}
