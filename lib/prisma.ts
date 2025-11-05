import { PrismaClient } from '@prisma/client'

declare global {
   
  var prisma: PrismaClient | undefined
}

// Optimized Prisma client with better performance settings
export const prisma = global.prisma ?? new PrismaClient({
  log: ['error'], // Reduced logging for better performance
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
})

// Ensure single instance in development
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

// Common query optimizations
export const dbOptimizations = {
  // Common includes for better performance
  userInclude: {
    memberships: {
      include: {
        team: true
      }
    }
  },
  
  teamInclude: {
    members: {
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    }
  },
  
  matchInclude: {
    team: {
      select: { id: true, name: true }
    },
    availabilities: {
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    }
  }
}

export default prisma
