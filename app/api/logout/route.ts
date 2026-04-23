import { NextResponse } from 'next/server';
import { AUTH_COOKIE, USER_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(USER_COOKIE);
  return response;
}
