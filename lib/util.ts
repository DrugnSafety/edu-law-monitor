import { createHash } from "crypto";
import { env } from "./config";

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
export function hashIp(ip: string): string {
  return sha256(`${env("IP_HASH_SALT") || env("ADMIN_TOKEN") || "elm-default-salt"}|${ip}`).slice(0, 32);
}
export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
export function isAdmin(req: Request): boolean {
  const t = env("ADMIN_TOKEN");
  if (!t) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${t}`;
}
