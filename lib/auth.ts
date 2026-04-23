// Shared HMAC-signed cookie helpers. Uses Web Crypto so it runs in
// both the Edge middleware and Node route handlers without changes.

export const AUTH_COOKIE = 'ertqa_auth';
export const USER_COOKIE = 'ertqa_user';
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  const bytes = new Uint8Array(signature);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createAuthToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000;
  const payload = String(expiresAt);
  const sig = await sign(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyAuthToken(
  token: string | undefined,
  secret: string | undefined
): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expiresAt = parseInt(payload, 10);
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await sign(payload, secret);
  return timingSafeEqual(sig, expected);
}
