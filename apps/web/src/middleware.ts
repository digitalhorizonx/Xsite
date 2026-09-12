import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/sales') || pathname === '/sales/login') return NextResponse.next();
  if (!request.cookies.get('xsite_admin_session')?.value) {
    const url = request.nextUrl.clone(); url.pathname = '/sales/login'; return NextResponse.redirect(url);
  }
  // Signature and expiry are verified again by server APIs. Middleware performs the early privacy redirect.
  return NextResponse.next();
}

export const config = { matcher: ['/sales/:path*'] };
