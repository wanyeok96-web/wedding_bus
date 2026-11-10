import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "bus_admin";

function sign(value: string) {
  return createHmac("sha256", "wedding-bus-compare").update(value).digest();
}

export function safeEqual(a: string, b: string) {
  return timingSafeEqual(sign(a), sign(b));
}

export function adminToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("wedding-bus-admin-v1").digest("hex");
}

export function isAdminRequest(request: Request) {
  const token = adminToken();
  if (!token) return false;
  const header = request.headers.get("cookie") ?? "";
  const pair = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  if (!pair) return false;
  const value = decodeURIComponent(pair.slice(ADMIN_COOKIE.length + 1));
  if (value.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(token));
}

export function adminCookie(token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}
