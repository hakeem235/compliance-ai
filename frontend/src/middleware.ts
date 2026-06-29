import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Auth is handled client-side (localStorage JWT + <RequireAuth> on the dashboard
// layout), so middleware only does locale routing now.
export default createIntlMiddleware(routing);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|m?js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
