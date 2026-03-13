import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/constants';

const PUBLIC_PATHS = ['/login'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const hasRefreshToken = !!req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (isPublic && hasRefreshToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (!isPublic && !hasRefreshToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};

