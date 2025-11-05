// Enhanced API route caching and optimization utilities

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiCache, performanceMonitor } from '@/lib/performance';

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  USER_PROFILE: { ttl: 5 * 60 * 1000, key: 'user-profile' }, // 5 minutes
  TEAM_DATA: { ttl: 2 * 60 * 1000, key: 'team-data' }, // 2 minutes
  LEAGUE_STANDINGS: { ttl: 10 * 60 * 1000, key: 'league-standings' }, // 10 minutes
  MATCH_LIST: { ttl: 1 * 60 * 1000, key: 'match-list' }, // 1 minute
  NOTIFICATIONS: { ttl: 30 * 1000, key: 'notifications' }, // 30 seconds
  STATIC_DATA: { ttl: 60 * 60 * 1000, key: 'static-data' }, // 1 hour
} as const;

// Response wrapper with automatic caching
export function withCache<T>(
  handler: (req: NextRequest, context?: any) => Promise<T>,
  cacheConfig: { ttl: number; key: string }
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Generate cache key from request
      const url = new URL(req.url);
      const cacheKey = `${cacheConfig.key}:${url.pathname}:${url.search}`;
      
      // Check cache first
      const cached = apiCache.get(cacheKey) as T | null;
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
            'X-Cache': 'HIT',
          },
        });
      }
      
      // Execute handler with performance monitoring
      const result = await performanceMonitor.measureAsync(
        `API:${url.pathname}`,
        () => handler(req, context)
      );
      
      // Cache the result
      apiCache.set(cacheKey, result);
      
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      });
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Authentication wrapper with session caching
export function withAuth<T>(
  handler: (req: NextRequest, session: any, context?: any) => Promise<T>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Get session with caching
      const session = await performanceMonitor.measureAsync(
        'GetSession',
        () => getServerSession(authOptions)
      );
      
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      const result = await handler(req, session, context);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Auth API Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Rate limiting for API endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  return function<T>(
    handler: (req: NextRequest, context?: any) => Promise<T>
  ) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
      // Get client IP (works with most deployment platforms)
      const clientIp = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
      
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      for (const [key, value] of rateLimitMap.entries()) {
        if (value.resetTime < windowStart) {
          rateLimitMap.delete(key);
        }
      }
      
      // Check current client
      const clientKey = `${clientIp}:${req.nextUrl.pathname}`;
      const clientData = rateLimitMap.get(clientKey);
      
      if (clientData && clientData.count >= maxRequests) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString(),
            }
          }
        );
      }
      
      // Update count
      rateLimitMap.set(clientKey, {
        count: clientData ? clientData.count + 1 : 1,
        resetTime: clientData ? clientData.resetTime : now + windowMs,
      });
      
      const result = await handler(req, context);
      return NextResponse.json(result);
    };
  };
}

// Validation wrapper for request data
export function withValidation<T>(
  schema: any, // Zod schema
  handler: (req: NextRequest, data: T, context?: any) => Promise<any>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      let data: any;
      
      if (req.method === 'GET') {
        const url = new URL(req.url);
        data = Object.fromEntries(url.searchParams);
      } else {
        data = await req.json();
      }
      
      const validatedData = schema.parse(data);
      const result = await handler(req, validatedData, context);
      
      return NextResponse.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Validation API Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Compose multiple middleware functions
export function compose<T>(...middlewares: Array<(handler: any) => any>) {
  return (handler: T): T => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

// Health check endpoint utility
export function createHealthCheck() {
  return withCache(
    async () => {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        },
        cacheSize: apiCache.size(),
      };
    },
    { ttl: 30 * 1000, key: 'health-check' }
  );
}

// Batch operation utility for multiple database queries
export async function batchOperation<T>(
  operations: Array<() => Promise<T>>,
  options: {
    maxConcurrency?: number;
    timeout?: number;
    failFast?: boolean;
  } = {}
): Promise<Array<T | Error>> {
  const { maxConcurrency = 5, timeout = 10000, failFast = false } = options;
  
  const results: Array<T | Error> = [];
  const chunks: Array<Array<() => Promise<T>>> = [];
  
  // Split operations into chunks
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    chunks.push(operations.slice(i, i + maxConcurrency));
  }
  
  // Process chunks sequentially, operations within chunks in parallel
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (operation, index) => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeout);
        });
        
        const result = await Promise.race([operation(), timeoutPromise]);
        return { index, result, error: null };
      } catch (error) {
        if (failFast) throw error;
        return { index, result: null, error: error as Error };
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(({ result, error }) => {
      results.push(error || result);
    });
  }
  
  return results;
}

// Database connection optimization
export function optimizePrismaQuery() {
  return {
    // Select only needed fields to reduce data transfer
    select: <T extends Record<string, any>>(fields: T) => ({ select: fields }),
    
    // Include relations efficiently
    include: <T extends Record<string, any>>(relations: T) => ({ include: relations }),
    
    // Pagination helpers
    paginate: (page: number = 1, limit: number = 20) => ({
      skip: (page - 1) * limit,
      take: limit,
    }),
    
    // Common where clauses
    where: {
      teamMember: (userId: string, teamId: string) => ({
        userId,
        teamId,
      }),
      userTeams: (userId: string) => ({
        members: {
          some: { userId }
        }
      }),
      activeMatches: () => ({
        scheduledAt: {
          gte: new Date(),
        }
      }),
      recentActivity: (days: number = 7) => ({
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        }
      }),
    },
  };
}