"use client"
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function LightweightNavBarDev() {
  const { data: session, status } = useSession()
  const [showFullNav, setShowFullNav] = useState(false)
  const [NavBarComponent, setNavBarComponent] = useState<any>(null)
  
  const isLoggedIn = !!session?.user?.email
  const userName = session?.user?.name || 'User'

  // Only load the full navigation when user explicitly requests it
  const loadFullNavigation = async () => {
    if (NavBarComponent) return
    
    try {
      const module = await import('./NavBarDev')
      setNavBarComponent(() => module.default)
      setShowFullNav(true)
    } catch (error) {
      console.error('Failed to load full navigation:', error)
    }
  }

  // If full nav is loaded, render it
  if (showFullNav && NavBarComponent) {
    return <NavBarComponent />
  }

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
                  {/* User Name Display */}
                  <div className="hidden sm:flex items-center text-gray-400 border-l border-slate-700 pl-3">
                    <span className="text-xs font-medium tracking-wide">{userName}</span>
                  </div>
                  
                  {/* Mobile User Name Display */}
                  <div className="sm:hidden flex items-center text-gray-400">
                    <span className="text-xs font-medium">{userName}</span>
                  </div>
                </>
              )}
            </div>
            
            {isLoggedIn && (
              <>
                {/* Load Full Nav Button */}
                <button
                  onClick={loadFullNavigation}
                  className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-600/30 hover:border-blue-500/50 transition-colors"
                >
                  ⚡ Load Full Navigation
                </button>
                
                {/* Quick Links */}
                <div className="hidden lg:flex items-center gap-4">
                  <Link href="/dashboard" className="px-3 py-1.5 text-sm text-gray-200 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/matches" className="px-3 py-1.5 text-sm text-gray-200 hover:text-white hover:bg-green-600/20 rounded-lg transition-colors">
                    Matches
                  </Link>
                  <Link href="/scrimmages" className="px-3 py-1.5 text-sm text-gray-200 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors">
                    Grudge
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-5">
            {isLoggedIn ? (
              <>
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