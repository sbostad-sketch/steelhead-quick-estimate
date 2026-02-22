import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, invalidateAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

async function handleLogout(req: Request) {
  const cookieName = adminCookieName();
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  await invalidateAdminSession(token);

  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/admin/login", `${url.protocol}//${url.host}`));
  res.cookies.set(cookieName, "", {
    maxAge: 0,
    path: "/"
  });
  return res;
}

export async function GET(req: Request) {
  return handleLogout(req);
}

export async function POST(req: Request) {
  return handleLogout(req);
}
