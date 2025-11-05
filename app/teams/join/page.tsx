"use client"
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function JoinTeamForm() {
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-fill invite code from URL parameter
  const codeFromUrl = searchParams.get('code')
  
  useEffect(() => {
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase())
    }
  }, [codeFromUrl])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, password }),
      })
      
      if (!res.ok) {
        let errorMessage = 'Failed to join team'
        try {
          const data = await res.json()
          errorMessage = data.error || errorMessage
        } catch (jsonError) {
          errorMessage = res.statusText || errorMessage
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      let data
      try {
        data = await res.json()
      } catch (jsonError) {
        setError('Server returned invalid response')
        setLoading(false)
        return
      }

      // Dispatch event to refresh team selector (client-side only)
      if (typeof window !== 'undefined' && data.team?.id) {
        window.dispatchEvent(new CustomEvent('teamJoined', { 
          detail: { teamId: data.team.id, teamName: data.team.name } 
        }))
      }
      
      // Success! Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 mt-8">
      <h1 className="text-3xl font-bold mb-2 text-white">Join a Team</h1>
      <p className="text-gray-300 mb-6">
        Enter the invite code provided by your team to join.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">
            Invite Code <span className="text-red-500">*</span>
          </label>
          <input
            className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g., LAKE123"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">
            Team Password (if required)
          </label>
          <input
            type="password"
            className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Optional"
          />
          <p className="text-xs text-gray-400 mt-1">
            Some teams require a password to join. Leave blank if not required.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || !inviteCode}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700 active:bg-blue-800 active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
        >
          {loading ? 'Joining...' : 'Join Team'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <a href="/dashboard" className="text-blue-400 hover:text-blue-300 hover:underline text-sm">
          ← Back to Dashboard
        </a>
      </div>
    </main>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <main className="max-w-xl mx-auto p-6 mt-8">
        <div className="text-center">
          <div className="text-white">Loading...</div>
        </div>
      </main>
    }>
      <JoinTeamForm />
    </Suspense>
  )
}
