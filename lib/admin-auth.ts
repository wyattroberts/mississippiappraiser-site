import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ma_blog_session";
const SESSION_SECONDS = 8 * 60 * 60;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string) {
  const secret = process.env.BLOG_SESSION_SECRET;
  if (!secret) throw new Error("BLOG_SESSION_SECRET is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function equalBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function createAdminSession() {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    role: "blog-admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })));
  return `${payload}.${base64Url(await hmac(payload))}`;
}

export async function verifyAdminSession(token?: string) {
  if (!token || !process.env.BLOG_SESSION_SECRET) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    if (!equalBytes(await hmac(payload), decodeBase64Url(signature))) return false;
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { role?: string; exp?: number };
    return claims.role === "blog-admin" && Number(claims.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function hasAdminConfiguration() {
  return Boolean(process.env.BLOG_ADMIN_PASSWORD && process.env.BLOG_SESSION_SECRET && process.env.DATABASE_URL);
}

export async function isAdmin(request: NextRequest) {
  return verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value);
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
    return new URL(origin).host === forwardedHost;
  } catch {
    return false;
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function passwordMatches(candidate: string) {
  const expected = process.env.BLOG_ADMIN_PASSWORD || "";
  const encoder = new TextEncoder();
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return equalBytes(new Uint8Array(candidateHash), new Uint8Array(expectedHash));
}
