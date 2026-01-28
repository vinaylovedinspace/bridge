import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  // public pages
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/data-deletion(.*)',
  '/refund-policy(.*)',
  '/terms-and-conditions(.*)',
  '/privacy-policy(.*)',

  '/api/notifications/check',
  '/api/cron/(.*)',
  '/api/webhooks/(.*)',
  '/api/workflows/(.*)',
]);

// Auth routes that authenticated users should be redirected from
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth();

  if (!isPublicRoute(req)) {
    await auth.protect();

    if (isOnboardingRoute(req) && orgId) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (!isOnboardingRoute(req) && !orgId) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
  }

  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)',
    // Always run for API routes
    '/(api)(.*)',
  ],
};
