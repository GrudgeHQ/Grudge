import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import NotificationsPanel from '../components/NotificationsPanel'
import DashboardClient from '../components/DashboardClient'
import Link from 'next/link'
import { cache } from 'react'

// Cache the user membership data to avoid repeated queries
const getUserMemberships = cache(async (userEmail: string) => {
  return prisma.teamMember.findMany({ 
    where: { user: { email: userEmail } }, 
    include: { team: true } 
  })
})

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <div>Please <Link href="/login">sign in</Link></div>
      </main>
    )
  }

  const memberships = await getUserMemberships(session.user.email)

  const panel = await NotificationsPanel();
  return (
    <main className="p-4 sm:p-6 max-w-7xl mx-auto safe-area-top safe-area-bottom">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-0">Dashboard</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-gray-300 truncate">{session.user?.email}</span>
              <form action="/api/auth/signout" method="post">
                <button className="text-sm text-gray-400 hover:text-gray-200 active:text-white active:scale-95 transition-all touch-manipulation lg:hidden">
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <DashboardClient initialMemberships={memberships} userEmail={session.user.email} />
        </div>

        {/* Notifications Panel - Hidden on mobile, sidebar on desktop */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-6">
            {panel}
          </div>
        </div>
      </div>
    </main>
  )
}
