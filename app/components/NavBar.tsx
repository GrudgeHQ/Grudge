import Link from 'next/link'
import { cache } from 'react'

const isDev = process.env.NODE_ENV === 'development'

// Lazy load heavy dependencies
const getServerSession = isDev ? null : require('next-auth').getServerSession
const authOptions = isDev ? null : require('@/lib/auth').authOptions
const prisma = isDev ? null : require('@/lib/prisma').prisma
const cleanupObsoleteNotifications = isDev ? null : require('@/lib/notificationCleanup').cleanupObsoleteNotifications

// Lazy load heavy components
let TeamFilterSelector: any = null
let MobileNav: any = null
let NavBadgesClient: any = null
let NotificationsBadgeClient: any = null
let MobileNavClient: any = null

if (!isDev) {
  TeamFilterSelector = require('./TeamFilterSelector').default
  MobileNav = require('./MobileNav').default
  const NavBadges = require('./NavBadgesClient')
  NavBadgesClient = NavBadges.default
  NotificationsBadgeClient = NavBadges.NotificationsBadgeClient
  MobileNavClient = require('./MobileNavClient').default
}

// Cache the user data fetching to avoid repeated database calls
const getUserNotificationCounts = cache(async (userEmail: string) => {
  if (isDev || !prisma) return { unreadCount: 0, pendingAssignments: 0, unreadChatCount: 0 }
  
  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) return { unreadCount: 0, pendingAssignments: 0, unreadChatCount: 0 }

  // Skip notification cleanup in development for faster loading
  if (!isDev && cleanupObsoleteNotifications) {
    await cleanupObsoleteNotifications(user.id)
  }
  
  // Use Promise.all to fetch counts in parallel for better performance
  const [unreadChatCount, unreadCount, pendingAssignments] = await Promise.all([
    prisma.notification.count({ 
      where: { 
        userId: user.id, 
        read: false,
        type: 'chat.message'
      } 
    }),
    prisma.notification.count({ 
      where: { 
        userId: user.id, 
        read: false,
        type: { not: 'chat.message' }
      } 
    }),
    prisma.assignment.count({
      where: { userId: user.id, confirmed: false }
    })
  ])

  return { unreadCount, pendingAssignments, unreadChatCount }
})

export default async function NavBar() {
  // In development, skip expensive session/database operations for faster page loads
  if (isDev) {
    return (
      <nav className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Link href="/" className="text-2xl font-bold text-blue-400 hover:text-blue-300">
                  Grudge
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/login" className="text-gray-300 hover:text-blue-400 active:text-blue-300 active:scale-95 transition-all touch-manipulation">
                Sign in
              </Link>
              <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all touch-manipulation">
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const session = getServerSession ? (await getServerSession(authOptions as any)) as any : null
  const isLoggedIn = !!session?.user?.email

  // Get user data and notification counts
  let unreadCount = 0
  let pendingAssignments = 0
  let unreadChatCount = 0
  let userName = ''
  
  if (isLoggedIn && prisma) {
    const counts = await getUserNotificationCounts(session.user.email)
    unreadCount = counts.unreadCount
    pendingAssignments = counts.pendingAssignments
    unreadChatCount = counts.unreadChatCount
    
    // Get user's name for display
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      select: { name: true }
    })
    userName = user?.name || session.user.name || 'User'
  }
  
  const totalUnread = unreadCount + pendingAssignments + unreadChatCount

  return (
    <nav className="bg-slate-900 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-2xl font-bold text-blue-400 hover:text-blue-300">
                Grudge
              </Link>
              
              {isLoggedIn && (
                <>
                  {/* User Name Display - Sleek and Minimal */}
                  <div className="hidden sm:flex items-center text-gray-400 border-l border-slate-700 pl-3">
                    <span className="text-xs font-medium tracking-wide">{userName}</span>
                  </div>
                  
                  {/* Mobile User Name Display - Compact and Sleek */}
                  <div className="sm:hidden flex items-center text-gray-400">
                    <span className="text-xs font-medium">{userName}</span>
                  </div>
                </>
              )}
            </div>
            
            {isLoggedIn && (
              <>
                {TeamFilterSelector && <TeamFilterSelector />}
                <div className="hidden lg:flex items-center gap-6">
                  {/* Main Pages */}
                  <Link href="/dashboard" className="px-4 py-2 text-sm text-gray-200 hover:text-white hover:bg-blue-600/20 active:bg-blue-600/30 rounded-lg border border-transparent hover:border-blue-500/30 transition-all duration-200 font-medium backdrop-blur-sm shadow-sm hover:shadow-blue-500/10">
                    Dashboard
                  </Link>
                  <Link href="/roster" className="px-4 py-2 text-sm text-gray-200 hover:text-white hover:bg-blue-600/20 active:bg-blue-600/30 rounded-lg border border-transparent hover:border-blue-500/30 transition-all duration-200 font-medium backdrop-blur-sm shadow-sm hover:shadow-blue-500/10">
                    Roster
                  </Link>
                  
                  {/* Events Group */}
                  <div className="flex items-center gap-3 px-5 border-x border-slate-700/50">
                    <Link href="/matches" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-green-600/20 active:bg-green-600/30 rounded-lg border border-transparent hover:border-green-500/30 transition-all duration-200 font-medium backdrop-blur-sm shadow-sm hover:shadow-green-500/10">
                      Matches
                    </Link>
                    <Link href="/practices" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-orange-600/20 active:bg-orange-600/30 rounded-lg border border-transparent hover:border-orange-500/30 transition-all duration-200 font-medium backdrop-blur-sm shadow-sm hover:shadow-orange-500/10">
                      Practices
                    </Link>
                    <Link href="/scrimmages" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-purple-600/20 active:bg-purple-600/30 rounded-lg border border-transparent hover:border-purple-500/30 transition-all duration-200 font-medium backdrop-blur-sm shadow-sm hover:shadow-purple-500/10">
                      Grudge
                    </Link>
                    <Link href="/leagues" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-indigo-600/20 active:bg-indigo-600/30 rounded-lg border border-transparent hover:border-indigo-500/30 transition-all duration-200 font-medium backdrop-blur-sm shadow-sm hover:shadow-indigo-500/10">
                      League
                    </Link>
                  </div>
                  
                  {/* Communication Group */}
                  <div className="flex items-center gap-3">
                    {NavBadgesClient && (
                      <NavBadgesClient 
                        initialUnreadChatCount={unreadChatCount}
                        initialPendingAssignments={pendingAssignments}
                        initialTotalUnread={totalUnread}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-5">
            {/* Mobile Navigation */}
            {isLoggedIn ? (
              MobileNavClient && (
                <MobileNavClient 
                  initialUnreadChatCount={unreadChatCount}
                  initialPendingAssignments={pendingAssignments}
                  initialTotalUnread={totalUnread}
                />
              )
            ) : (
              MobileNav && (
                <MobileNav 
                  isLoggedIn={isLoggedIn}
                  unreadChatCount={unreadChatCount}
                  pendingAssignments={pendingAssignments}
                  totalUnread={totalUnread}
                />
              )
            )}
            
            {/* Desktop Navigation */}
            {isLoggedIn ? (
              <>
                {NotificationsBadgeClient && <NotificationsBadgeClient initialTotalUnread={totalUnread} />}
                
                <Link 
                  href="/profile" 
                  className="hidden lg:flex text-gray-300 hover:text-blue-400 transition-colors items-center gap-2"
                  title="Profile Settings"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Profile</span>
                </Link>
                
                <form action="/api/auth/signout" method="post">
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-600 active:bg-red-700 text-white rounded-lg font-medium text-sm border border-red-500/30 hover:border-red-400 shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all duration-200 backdrop-blur-sm touch-manipulation">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-blue-400 active:text-blue-300 active:scale-95 transition-all touch-manipulation">
                  Sign in
                </Link>
                <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all touch-manipulation">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
