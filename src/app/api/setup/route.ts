import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Test DB connection first
    await db.$connect();

    // Check if already seeded
    const existing = await db.user.findUnique({
      where: { email: "divya.krishnan@squareyards.com" },
    });

    if (existing) {
      // Update password in case it was missing
      if (!existing.password) {
        const hashed = await bcrypt.hash("squarelabs2026", 10);
        await db.user.update({
          where: { email: "divya.krishnan@squareyards.com" },
          data: { password: hashed },
        });
        return NextResponse.json({ message: "Password updated. You can now log in!" });
      }
      return NextResponse.json({ message: "Already set up. You can log in!", alreadyExists: true });
    }

    const hashedPassword = await bcrypt.hash("squarelabs2026", 10);

    // Create head of marketing user
    const divya = await db.user.create({
      data: {
        name: "Divya Krishnan",
        email: "divya.krishnan@squareyards.com",
        role: "HEAD_OF_MARKETING",
        password: hashedPassword,
      },
    });

    // Create team lead user
    await db.user.create({
      data: {
        name: "Priya Sharma",
        email: "priya.sharma@squareyards.com",
        role: "TEAM_LEAD",
        password: await bcrypt.hash("squarelabs2026", 10),
      },
    });

    return NextResponse.json({
      message: "✅ Setup complete! You can now log in.",
      credentials: {
        email: divya.email,
        password: "squarelabs2026",
        role: divya.role,
      },
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      hint: "Database tables may not exist yet. Make sure the build command includes: npx prisma db push",
    }, { status: 500 });
  }
}
