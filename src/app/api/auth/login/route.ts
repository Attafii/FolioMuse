// POST /api/auth/login — Authenticate user and create session.

import { prisma } from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/crypto";

export async function POST(request: Request): Promise<Response> {
  try {
    const { email, password } = await request.json();

    // Validate
    if (!email || !password) {
      return Response.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

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
