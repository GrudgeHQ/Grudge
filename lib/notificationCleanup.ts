import { prisma } from './prisma'

/**
 * Clean up obsolete notifications based on current state
 * This function should be called periodically or when relevant data changes
 * Only marks notifications as read if they are truly obsolete (no action needed)
 */
export async function cleanupObsoleteNotifications(userId?: string) {
  // 1. Mark ASSIGNMENT_PENDING notifications as obsolete ONLY if assignment no longer exists or is already confirmed
  // Keep unconfirmed assignment notifications unread so they appear in the bell
  const assignmentPendingNotifications = await prisma.notification.findMany({
    where: {
      type: 'ASSIGNMENT_PENDING',
      read: false,
      ...(userId ? { userId } : {})
    }
  })

  for (const notification of assignmentPendingNotifications) {
    const payload = notification.payload as any
    if (payload?.assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: payload.assignmentId }
      })
      
      // Mark as read ONLY if assignment no longer exists or is already confirmed
      // This is the key: confirmed = notification is obsolete, unconfirmed = still needs action
      if (!assignment || assignment.confirmed) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { read: true }
        })
      }
    }
  }

  // 2. Mark ASSIGNMENT_REMOVED notifications as obsolete if match has passed
  const removalNotifications = await prisma.notification.findMany({
    where: {
      type: 'ASSIGNMENT_REMOVED',
      read: false,
      ...(userId ? { userId } : {})
    }
  })

  for (const notification of removalNotifications) {
    const payload = notification.payload as any
    if (payload?.matchId) {
      const match = await prisma.match.findUnique({
        where: { id: payload.matchId }
      })
      
      // Mark as read if match has already occurred
      if (match && new Date(match.scheduledAt) < new Date()) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { read: true }
        })
      }
    }
  }

  // 3. Mark PLAYER_REMOVED_SELF notifications as obsolete if player is reassigned
  const playerRemovedNotifications = await prisma.notification.findMany({
    where: {
      type: 'PLAYER_REMOVED_SELF',
      read: false,
      ...(userId ? { userId } : {})
    }
  })

  for (const notification of playerRemovedNotifications) {
    const payload = notification.payload as any
    if (payload?.matchId && payload?.playerId) {
      const assignment = await prisma.assignment.findUnique({
        where: { 
          matchId_userId: { 
            matchId: payload.matchId, 
            userId: payload.playerId 
          } 
        }
      })
      
      // Mark as read if player has been reassigned
      if (assignment) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { read: true }
        })
      }
    }
  }

  // 4. Mark notifications for past matches as obsolete
  const matchRelatedNotifications = await prisma.notification.findMany({
    where: {
      type: { in: ['ASSIGNMENT_PENDING', 'ASSIGNMENT_REMOVED', 'PLAYER_REMOVED_SELF'] },
      read: false,
      ...(userId ? { userId } : {})
    }
  })

  for (const notification of matchRelatedNotifications) {
    const payload = notification.payload as any
    if (payload?.scheduledAt) {
      const matchDate = new Date(payload.scheduledAt)
      // Mark as read if match occurred more than 24 hours ago
      if (matchDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { read: true }
        })
      }
    }
  }
}
