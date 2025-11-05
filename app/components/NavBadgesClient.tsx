"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTeamFilter } from '../context/TeamFilterContext'

interface NavBadgesClientProps {
  initialUnreadChatCount: number
  initialPendingAssignments: number
  initialTotalUnread: number
}

interface NotificationCounts {
  unreadChatCount: number
  pendingAssignments: number
  unreadCount: number
}

export default function NavBadgesClient({ 
  initialUnreadChatCount, 
  initialPendingAssignments, 
  initialTotalUnread 
}: NavBadgesClientProps) {
  const { selectedTeamId } = useTeamFilter()
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadChatCount: initialUnreadChatCount,
    pendingAssignments: initialPendingAssignments,
    unreadCount: initialTotalUnread - initialUnreadChatCount - initialPendingAssignments
  })
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load filtered notification counts when team selection changes
  useEffect(() => {
    if (!mounted) return // Don't run on server side

    let isActive = true
    setLoading(true)

    async function loadFilteredCounts() {
      try {
        const response = await fetch(`/api/notifications/counts?teamId=${selectedTeamId}`, {
          credentials: 'include' // Ensure cookies are sent
        })
        
        // If unauthorized, don't treat it as an error, just don't update counts
        if (response.status === 401) {
          if (isActive) setLoading(false)
          return
        }
        
        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        if (isActive) {
          setCounts({
            unreadChatCount: data.unreadChatCount || 0,
            pendingAssignments: data.pendingAssignments || 0,
            unreadCount: data.unreadCount || 0
          })
        }
      } catch (error) {
        console.error('Failed to load notification counts:', error)
        // On error, keep showing the current counts
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadFilteredCounts()

    return () => {
      isActive = false
    }
  }, [selectedTeamId, mounted])

  const totalUnread = counts.unreadChatCount + counts.pendingAssignments + counts.unreadCount

  return (
    <>
      {/* Chat Link with Badge */}
      <Link href="/chat" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-cyan-600/20 active:bg-cyan-600/30 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all duration-200 relative font-medium backdrop-blur-sm shadow-sm hover:shadow-cyan-500/10">
        Chat
        {counts.unreadChatCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-red-300"></span>
          </span>
        )}
      </Link>
      
      {/* Assignments Link with Badge */}
      <Link href="/assignments" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-yellow-600/20 active:bg-yellow-600/30 rounded-lg border border-transparent hover:border-yellow-500/30 transition-all duration-200 relative font-medium backdrop-blur-sm shadow-sm hover:shadow-yellow-500/10">
        Assignments
        {counts.pendingAssignments > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-red-300"></span>
          </span>
        )}
      </Link>
    </>
  )
}

// Separate component for notifications badge
export function NotificationsBadgeClient({ 
  initialTotalUnread 
}: { 
  initialTotalUnread: number 
}) {
  const { selectedTeamId } = useTeamFilter()
  const [totalUnread, setTotalUnread] = useState(initialTotalUnread)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return // Don't run on server side

    let isActive = true

    async function loadFilteredCounts() {
      try {
        const response = await fetch(`/api/notifications/counts?teamId=${selectedTeamId}`)
        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        if (isActive) {
          const total = (data.unreadChatCount || 0) + (data.pendingAssignments || 0) + (data.unreadCount || 0)
          setTotalUnread(total)
        }
      } catch (error) {
        console.error('Failed to load notification counts:', error)
      }
    }

    loadFilteredCounts()

    return () => {
      isActive = false
    }
  }, [selectedTeamId, mounted])

  return (
    <Link 
      href="/notifications" 
      className="hidden lg:flex relative text-gray-300 hover:text-blue-400 transition-colors"
      title="Notifications"
    >
      <svg 
        className="w-6 h-6" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-500 text-white text-xs font-bold">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        </span>
      )}
    </Link>
  )
}