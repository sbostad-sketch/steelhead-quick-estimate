import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminCookieName,
  createAdminSessionCookie,
  isAdminAuthConfigured,
  verifyAdminPassword
} from "@/lib/auth";

const schema = z.object({
  password: z.string().min(1)
});

export const runtime = "nodejs";

function redirectTo(req: Request, path: string): NextResponse {
  const url = new URL(req.url);
  return NextResponse.redirect(new URL(path, `${url.protocol}//${url.host}`));
}

async function readPassword(req: Request, isJson: boolean): Promise<string> {
  if (isJson) {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new Error("PASSWORD_REQUIRED");
    }
    return parsed.data.password;
  }

  const form = await req.formData();
  const password = form.get("password")?.toString() || "";
  if (!password.trim()) {
    throw new Error("PASSWORD_REQUIRED");
  }
  return password;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  try {
    if (!isAdminAuthConfigured()) {
      if (!isJson) {
        return redirectTo(req, "/admin/login?error=config");
      }
      return NextResponse.json(
        {
          error: "Admin auth is not configured. Set ADMIN_PASSWORD_HASH (recommended) or ADMIN_PASSWORD."
        },
        { status: 500 }
      );
    }

    const password = await readPassword(req, isJson);

    if (!verifyAdminPassword(password)) {
      if (!isJson) {
        return redirectTo(req, "/admin/login?error=invalid");
      }
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const session = await createAdminSessionCookie();
    const res = isJson ? NextResponse.json({ ok: true }) : redirectTo(req, "/admin");
    res.cookies.set(adminCookieName(), session.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.maxAge
    });

    return res;
  } catch (error) {
    if (!isJson) {
      const message = error instanceof Error ? error.message : "";
      if (message === "PASSWORD_REQUIRED") {
        return redirectTo(req, "/admin/login?error=required");
      }
      return redirectTo(req, "/admin/login?error=server");
    }

    if (error instanceof Error && error.message === "PASSWORD_REQUIRED") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
