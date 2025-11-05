"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTeamFilter } from '../context/TeamFilterContext'

interface MobileNavClientProps {
  initialUnreadChatCount: number
  initialPendingAssignments: number
  initialTotalUnread: number
}

interface NotificationCounts {
  unreadChatCount: number
  pendingAssignments: number
  unreadCount: number
}

export default function MobileNavClient({ 
  initialUnreadChatCount, 
  initialPendingAssignments, 
  initialTotalUnread 
}: MobileNavClientProps) {
  const { selectedTeamId } = useTeamFilter()
  const [isOpen, setIsOpen] = useState(false)
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadChatCount: initialUnreadChatCount,
    pendingAssignments: initialPendingAssignments,
    unreadCount: initialTotalUnread - initialUnreadChatCount - initialPendingAssignments
  })
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load filtered notification counts when team selection changes
  useEffect(() => {
    if (!mounted) return // Don't run on server side

    let isActive = true

    async function loadFilteredCounts() {
      try {
        const response = await fetch(`/api/notifications/counts?teamId=${selectedTeamId}`)
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
      }
    }

    loadFilteredCounts()

    return () => {
      isActive = false
    }
  }, [selectedTeamId, mounted])

  const totalUnread = counts.unreadChatCount + counts.pendingAssignments + counts.unreadCount

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠', color: 'blue' },
    { href: '/roster', label: 'Roster', icon: '👥', color: 'blue' },
    { href: '/matches', label: 'Matches', icon: '⚽', color: 'green' },
    { href: '/practices', label: 'Practices', icon: '🏃', color: 'orange' },
    { href: '/scrimmages', label: 'Grudge', icon: '🏆', color: 'purple' },
    { href: '/leagues', label: 'League', icon: '🏅', color: 'indigo' },
    { 
      href: '/chat', 
      label: 'Chat', 
      icon: '💬', 
      color: 'cyan',
      badge: counts.unreadChatCount
    },
    { 
      href: '/assignments', 
      label: 'Assignments', 
      icon: '📋', 
      color: 'yellow',
      badge: counts.pendingAssignments
    },
  ]

  return (
    <div className="lg:hidden">
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex flex-col items-center justify-center w-8 h-8 text-gray-300 hover:text-white transition-colors focus:outline-none"
        aria-label="Toggle menu"
      >
        <span className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-300 ${
          isOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
        }`} />
        <span className={`absolute block w-6 h-0.5 bg-current transition-all duration-300 ${
          isOpen ? 'opacity-0' : 'opacity-100'
        }`} />
        <span className={`absolute inset-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${
          isOpen ? '-rotate-45 translate-y-2.5' : 'translate-y-4'
        }`} />
        
        {/* Notification badge on hamburger */}
        {totalUnread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 animate-ping opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-white text-xs font-bold">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          </span>
        )}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-l border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="text-xl font-bold text-blue-400">Navigation</div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const colorClasses = {
                  blue: isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-blue-600/20',
                  green: isActive ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white hover:bg-green-600/20',
                  orange: isActive ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white hover:bg-orange-600/20',
                  purple: isActive ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white hover:bg-purple-600/20',
                  indigo: isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-indigo-600/20',
                  cyan: isActive ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:text-white hover:bg-cyan-600/20',
                  yellow: isActive ? 'bg-yellow-600 text-white' : 'text-gray-300 hover:text-white hover:bg-yellow-600/20',
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 active:scale-95 touch-manipulation ${
                      colorClasses[item.color as keyof typeof colorClasses]
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    
                    {/* Badge for notifications */}
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto flex h-5 w-5">
                        <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-500 text-white text-xs font-bold">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      </span>
                    )}
                    
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute right-2 w-2 h-2 bg-current rounded-full"></span>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Menu footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900">
              <div className="flex items-center gap-3">
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-lg transition-colors touch-manipulation"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-sm font-medium">Notifications</span>
                  {totalUnread > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-white text-xs font-bold ml-1">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </Link>
                
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-lg transition-colors touch-manipulation"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}