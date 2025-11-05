/**
 * Team role utility functions
 * Ensures consistency between team roles and admin status
 */

// Leadership roles that automatically grant admin access
export const LEADERSHIP_ROLES = ['COACH', 'COORDINATOR', 'CAPTAIN', 'CO_CAPTAIN'] as const

// All available team roles
export const TEAM_ROLES = ['ADMIN', 'COACH', 'COORDINATOR', 'CAPTAIN', 'CO_CAPTAIN', 'MEMBER'] as const

export type TeamRole = typeof TEAM_ROLES[number]
export type LeadershipRole = typeof LEADERSHIP_ROLES[number]

/**
 * Determines if a role should automatically have admin access
 */
export function shouldHaveAdminAccess(role: string): boolean {
  return LEADERSHIP_ROLES.includes(role as LeadershipRole)
}

/**
 * Validates and corrects role/admin consistency
 * Returns the corrected admin status based on the role
 */
export function getCorrectAdminStatus(role: string, currentIsAdmin: boolean): boolean {
  // Leadership roles must be admins
  if (shouldHaveAdminAccess(role)) {
    return true
  }
  
  // ADMIN role must be admin
  if (role === 'ADMIN') {
    return true
  }
  
  // MEMBER role keeps current admin status (can be admin through other means)
  if (role === 'MEMBER') {
    return currentIsAdmin
  }
  
  // Default: maintain current status
  return currentIsAdmin
}

/**
 * Gets a human-readable role description
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    ADMIN: 'Team Administrator',
    COACH: 'Coach',
    COORDINATOR: 'Team Coordinator', 
    CAPTAIN: 'Team Captain',
    CO_CAPTAIN: 'Co-Captain',
    MEMBER: 'Team Member'
  }
  
  return descriptions[role] || role
}

/**
 * Gets role badge styling information
 */
export function getRoleBadge(role: string, isAdmin: boolean) {
  const badges = {
    COACH: { label: 'Coach', color: 'bg-purple-600/20 text-purple-400 border-purple-600/30' },
    COORDINATOR: { label: 'Coordinator', color: 'bg-green-600/20 text-green-400 border-green-600/30' },
    CAPTAIN: { label: 'Captain', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' },
    CO_CAPTAIN: { label: 'Co-Captain', color: 'bg-orange-600/20 text-orange-400 border-orange-600/30' },
    ADMIN: { label: 'Admin', color: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
    MEMBER: { label: 'Member', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' }
  }
  
  return badges[role as keyof typeof badges] || badges.MEMBER
}

/**
 * Validates a role assignment before database update
 */
export function validateRoleAssignment(
  newRole: string, 
  newIsAdmin: boolean, 
  currentRole: string, 
  currentIsAdmin: boolean
): { valid: boolean; correctedIsAdmin?: boolean; error?: string } {
  
  // Check if role requires admin access
  const requiresAdmin = shouldHaveAdminAccess(newRole) || newRole === 'ADMIN'
  
  if (requiresAdmin && !newIsAdmin) {
    return {
      valid: true,
      correctedIsAdmin: true
    }
  }
  
  return {
    valid: true,
    correctedIsAdmin: newIsAdmin
  }
}