import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis for Edge
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Global rate limiter for API routes (100 requests per 10 seconds)
const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '10 s'),
      ephemeralCache: new Map(), // Works in Edge
    })
  : null;

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;
  
  // 1. Rate Limiting for all /api routes
  if (path.startsWith('/api/') && apiLimiter) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const { success, limit, reset, remaining } = await apiLimiter.limit(`global_api_${ip}`);
    
    if (!success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      });
    }
  }

  // 2. Protected Routes Session Check
  const protectedPaths = ['/vault', '/buckets', '/cart', '/settings', '/shares'];
  const isProtectedPage = protectedPaths.some(p => path === p || path.startsWith(`${p}/`));
  
  if (isProtectedPage) {
    // BetterAuth sets cookies with this prefix
    const hasSession = request.cookies.has('docloc.session_token') || request.cookies.has('__Secure-docloc.session_token');
    
    if (!hasSession) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 3. Set Security Headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
