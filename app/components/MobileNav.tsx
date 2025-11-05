'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface MobileNavProps {
  isLoggedIn: boolean
  unreadChatCount: number
  pendingAssignments: number
  totalUnread: number
}

export default function MobileNav({ isLoggedIn, unreadChatCount, pendingAssignments, totalUnread }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isOpen && !target.closest('.mobile-nav-container')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (!isLoggedIn) return null

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊', color: 'blue' },
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
      badge: unreadChatCount
    },
    { 
      href: '/assignments', 
      label: 'Assignments', 
      icon: '📋', 
      color: 'yellow',
      badge: pendingAssignments
    },
  ]

  return (
    <div className="lg:hidden mobile-nav-container">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg touch-manipulation"
        aria-label="Toggle navigation menu"
      >
        <div className="w-6 h-6 relative">
          <span className={`absolute inset-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${
            isOpen ? 'rotate-45 translate-y-2.5' : 'translate-y-1'
          }`} />
          <span className={`absolute inset-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${
            isOpen ? 'opacity-0' : 'translate-y-2.5'
          }`} />
          <span className={`absolute inset-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${
            isOpen ? '-rotate-45 translate-y-2.5' : 'translate-y-4'
          }`} />
        </div>
        
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
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-out">
            {/* Menu header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Navigation</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg touch-manipulation"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu items */}
            <div className="py-4 px-2 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const colorClasses = {
                  blue: 'bg-blue-600/20 border-blue-500/30 text-blue-300',
                  green: 'bg-green-600/20 border-green-500/30 text-green-300',
                  orange: 'bg-orange-600/20 border-orange-500/30 text-orange-300',
                  purple: 'bg-purple-600/20 border-purple-500/30 text-purple-300',
                  indigo: 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300',
                  cyan: 'bg-cyan-600/20 border-cyan-500/30 text-cyan-300',
                  yellow: 'bg-yellow-600/20 border-yellow-500/30 text-yellow-300',
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 touch-manipulation ${
                      isActive 
                        ? `${colorClasses[item.color as keyof typeof colorClasses]} font-medium`
                        : 'text-gray-300 hover:text-white hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    <span className="text-xl" role="img" aria-hidden="true">
                      {item.icon}
                    </span>
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
                  className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors touch-manipulation"
                  title="Profile"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
