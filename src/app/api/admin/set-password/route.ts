/**
 * POST /api/admin/set-password
 *
 * One-time endpoint to set/reset a user's password.
 * Protected by CRON_SECRET so it can't be abused publicly.
 *
 * Body: { secret: string, email: string, password: string }
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET ?? "squarelabs-cron";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, email, password } = body as {
      secret: string;
      email: string;
      password: string;
    };

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { email },
      data: { password: hashed },
    });

    return NextResponse.json({
      success: true,
      message: `Password updated for ${email}`,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
