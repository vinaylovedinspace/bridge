import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

// Routes that are exempt from onboarding check
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();

    const { sessionClaims } = await auth();

    // Type-safe access to publicMetadata
    const publicMetadata =
      (sessionClaims?.publicMetadata as { isOnboardingComplete?: boolean; isOwner?: boolean }) ||
      {};

    if (Object.keys(publicMetadata).length > 0 && !publicMetadata.isOwner) {
      return NextResponse.next();
    }

    const isOnboardingComplete = !!publicMetadata.isOnboardingComplete;

    // If user is already onboarded but tries to access onboarding route, redirect to home
    if (isOnboardingRoute(req) && isOnboardingComplete) {
      return NextResponse.redirect(new URL('/', req.url));
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
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
