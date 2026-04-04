import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function getDashboardPath(role) {
  return role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
}

function getSettingsPath(role) {
  return role === "admin" ? "/admin/settings" : "/employee/settings";
}

function getLandingPath(token) {
  if (!token?.role) {
    return "/login";
  }

  return token.mustChangePassword
    ? `${getSettingsPath(token.role)}?forcePasswordChange=1`
    : getDashboardPath(token.role);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (pathname === "/login") {
    if (token?.role) {
      return NextResponse.redirect(new URL(getLandingPath(token), request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (token.role !== "admin") {
      return NextResponse.redirect(new URL(getLandingPath(token), request.url));
    }

    if (token.mustChangePassword && pathname !== "/admin/settings") {
      return NextResponse.redirect(new URL(getLandingPath(token), request.url));
    }
  }

  if (pathname.startsWith("/employee")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (token.role !== "employee") {
      return NextResponse.redirect(new URL(getLandingPath(token), request.url));
    }

    if (token.mustChangePassword && pathname !== "/employee/settings") {
      return NextResponse.redirect(new URL(getLandingPath(token), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/employee/:path*"]
};
