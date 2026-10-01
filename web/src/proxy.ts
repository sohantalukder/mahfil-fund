import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password'];

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/api/') || pathname.startsWith('/backend/') || pathname.startsWith('/_next/')) return NextResponse.next();
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasRefreshSession = Boolean(req.cookies.get('mf_refresh')?.value);
  if (!isPublic && !hasRefreshSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
