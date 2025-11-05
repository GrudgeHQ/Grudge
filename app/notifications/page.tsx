import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import NotificationsListClient from '@/app/components/NotificationsListClient'

export default async function NotificationsPage() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-2">Notifications</h1>
        <p className="text-sm text-gray-600">Please sign in to view your notifications.</p>
      </div>
    )
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  const notes = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 200 })

  // Don't automatically mark notifications as read when viewing the page
  // Let users interact with them first (they can mark as read manually)

  // pass serialized data to client with actual read status
  const initial = notes.map((n) => ({ 
    id: n.id, 
    type: n.type, 
    payload: n.payload, 
    createdAt: n.createdAt.toISOString(), 
    read: n.read
  }))

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-white">Notifications</h1>
      <NotificationsListClient initial={initial} />
    </div>
  )
}
