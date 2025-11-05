"use client"
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import DynamicTeamFilterSelector from './DynamicTeamFilterSelector'

export default function NavBarDev() {
  const { data: session, status } = useSession()
  const isLoggedIn = !!session?.user?.email
  const userName = session?.user?.name || 'User'

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
                <DynamicTeamFilterSelector />
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
                  <Link href="/chat" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-cyan-600/20 active:bg-cyan-600/30 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all duration-200 relative font-medium backdrop-blur-sm shadow-sm hover:shadow-cyan-500/10">
                    Chat
                  </Link>
                  
                  <Link href="/assignments" className="px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-yellow-600/20 active:bg-yellow-600/30 rounded-lg border border-transparent hover:border-yellow-500/30 transition-all duration-200 relative font-medium backdrop-blur-sm shadow-sm hover:shadow-yellow-500/10">
                    Assignments
                  </Link>
                </div>
              </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-5">
            {/* Mobile Menu Button for logged in users */}
            {isLoggedIn && (
              <div className="lg:hidden">
                <span className="text-gray-400 text-sm">Menu (Dev)</span>
              </div>
            )}
            
            {/* Desktop Navigation */}
            {isLoggedIn ? (
              <>
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
                </Link>
                
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