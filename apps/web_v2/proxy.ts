import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPaths = new Set(["/sign-in", "/sign-up"]);

export function proxy(request: NextRequest) {
  const routerHost = process.env.VERCEL_URL;
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.__VERCEL_DEV_RUNNING === "1" && routerHost && forwardedHost !== routerHost) {
    const target = request.nextUrl.clone();
    target.protocol = "http:";
    target.host = routerHost;
    return NextResponse.redirect(target);
  }

  const { pathname } = request.nextUrl;
  const isApiAuth = pathname.startsWith("/api/auth");
  const isEveApi = pathname.startsWith("/eve/");
  // Eve channel auth handles /eve/*; do not HTML-redirect those requests.
  const isPublic = publicPaths.has(pathname) || isApiAuth || isEveApi;
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie && !isPublic) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";
    return NextResponse.redirect(signInUrl);
  }

  if (sessionCookie && publicPaths.has(pathname)) {
    const chatUrl = request.nextUrl.clone();
    chatUrl.pathname = "/s";
    chatUrl.search = "";
    return NextResponse.redirect(chatUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
