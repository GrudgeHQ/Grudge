"use client"
import React, { useState, useEffect } from 'react'
import { useTeamFilter } from '../context/TeamFilterContext'

interface NavBadgesProps {
  initialUnreadChatCount: number
  initialPendingAssignments: number
  initialTotalUnread: number
}

interface NotificationCounts {
  unreadChatCount: number
  pendingAssignments: number
  totalUnread: number
}

export default function NavBadges({ 
  initialUnreadChatCount, 
  initialPendingAssignments, 
  initialTotalUnread 
}: NavBadgesProps) {
  const { selectedTeamId } = useTeamFilter()
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadChatCount: initialUnreadChatCount,
    pendingAssignments: initialPendingAssignments,
    totalUnread: initialTotalUnread
  })

  // Load filtered notification counts when team selection changes
  useEffect(() => {
    let mounted = true

    async function loadFilteredCounts() {
      try {
        const response = await fetch(`/api/notifications/counts?teamId=${selectedTeamId}`)
        if (!response.ok) return

        const data = await response.json()
        if (mounted) {
          setCounts({
            unreadChatCount: data.unreadChatCount || 0,
            pendingAssignments: data.pendingAssignments || 0,
            totalUnread: (data.unreadChatCount || 0) + (data.pendingAssignments || 0) + (data.unreadCount || 0)
          })
        }
      } catch (error) {
        console.error('Failed to load notification counts:', error)
      }
    }

    loadFilteredCounts()

    return () => {
      mounted = false
    }
  }, [selectedTeamId])

  return {
    unreadChatCount: counts.unreadChatCount,
    pendingAssignments: counts.pendingAssignments,
    totalUnread: counts.totalUnread
  }
}

// Chat badge component
export function ChatBadge({ count }: { count: number }) {
  if (count <= 0) return null
  
  return (
    <span className="absolute -top-1 -right-1 flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-red-300"></span>
    </span>
  )
}

// Assignments badge component
export function AssignmentsBadge({ count }: { count: number }) {
  if (count <= 0) return null
  
  return (
    <span className="absolute -top-1 -right-1 flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-red-300"></span>
    </span>
  )
}

// Notifications badge component  
export function NotificationsBadge({ count }: { count: number }) {
  if (count <= 0) return null
  
  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-500 text-white text-xs font-bold">
        {count > 9 ? '9+' : count}
      </span>
    </span>
  )
}