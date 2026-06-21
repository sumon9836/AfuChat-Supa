/**
 * oauth-session.ts — lightweight signed-cookie session for the OAuth consent flow.
 *
 * Cookie format: base64url(json) + "." + hmac_hex
 * The HMAC prevents tampering. No external JWT library required.
 */

import crypto from "crypto";
import type { Request, Response } from "express";

export interface OAuthSessionData {
  uid:          string;
  handle:       string;
  display_name: string;
  avatar_url:   string | null;
  exp:          number;
}

const COOKIE_NAME    = "afu_oauth";
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours

function getSecret(): string {
  return process.env.OAUTH_SESSION_SECRET || "afu-oauth-insecure-dev-secret-change-in-prod";
}

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function setOAuthSession(res: Response, data: OAuthSessionData): void {
  const payload = b64url(JSON.stringify(data));
  const sig     = sign(payload);
  const value   = `${payload}.${sig}`;
  res.cookie(COOKIE_NAME, value, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE * 1000,
    path:     "/",
  });
}

export function getOAuthSession(req: Request): OAuthSessionData | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw || typeof raw !== "string") return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const sig     = raw.slice(dot + 1);
  if (sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as OAuthSessionData;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearOAuthSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}
