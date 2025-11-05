"use client"
import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await signIn('credentials', { redirect: false, email, password })
    // @ts-ignore
    if (res?.error) return setError(res.error)
    
    // Force a full page refresh to ensure server components re-render with new session
    window.location.href = '/dashboard'
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block">Email</label>
          <input className="border px-2 py-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block">Password</label>
          <input className="border px-2 py-1 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all" type="submit">Sign in</button>
      </form>
    </main>
  )
}
