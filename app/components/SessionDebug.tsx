'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export default function SessionDebug() {
  const { data: session, status } = useSession()
  
  useEffect(() => {
    console.log('Session status:', status)
    console.log('Session data:', session)
  }, [session, status])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>Status: {status}</div>
      <div>User: {session?.user?.email || 'None'}</div>
    </div>
  )
}