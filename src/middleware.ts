import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/inngest']);

// Routes that are exempt from onboarding check
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();

    const { sessionClaims, orgId } = await auth();

    // Type-safe access to publicMetadata
    const publicMetadata =
      (sessionClaims?.publicMetadata as { isOnboardingComplete?: boolean; isOwner?: boolean }) ||
      {};

    // For confirmed non-owners, skip onboarding checks but still allow access
    if (publicMetadata.isOwner === false) {
      return NextResponse.next();
    }

    const isOnboardingComplete = !!publicMetadata.isOnboardingComplete || !!orgId;

    // If user is already onboarded but tries to access onboarding route, redirect to home
    if (isOnboardingRoute(req) && isOnboardingComplete) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If user is not onboarded and tries to access a non-onboarding route, redirect to onboarding
    if (!isOnboardingRoute(req) && !isOnboardingComplete) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
