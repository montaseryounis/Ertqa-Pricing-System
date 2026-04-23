import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, verifyAuthToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    )
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const ok = await verifyAuthToken(token, process.env.AUTH_SECRET);

  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)',
  ],
};
