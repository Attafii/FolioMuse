// POST /api/auth/signup — Create a new user account.
// ponytail: minimal, no rate limiting (add later if needed).

import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/crypto";

export async function POST(request: Request): Promise<Response> {
  try {
    const { name, email, password } = await request.json();

    // Validate
    if (!name || !email || !password) {
      return Response.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return Response.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    return Response.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch {
    return Response.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
