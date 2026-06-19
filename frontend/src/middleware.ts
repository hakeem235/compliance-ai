import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale codes are listed literally (not via a ":locale" wildcard param) — a
// wildcard segment matches ANY single path segment, which would wrongly mark
// unprefixed dashboard routes like "/dashboard" or "/billing" as public too.
const isPublicRoute = createRouteMatcher([
  "/",
  "/ar",
  "/sign-in(.*)",
  "/ar/sign-in(.*)",
  "/sign-up(.*)",
  "/ar/sign-up(.*)",
  "/privacy",
  "/ar/privacy",
  "/terms",
  "/ar/terms",
]);

const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
