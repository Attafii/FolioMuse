// GET /api/auth/me — Get current user from session token.

import { prisma } from "@/lib/prisma";

export async function GET(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ user: null }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return Response.json({ user: null }, { status: 401 });
    }

    return Response.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch {
    return Response.json({ user: null }, { status: 500 });
  }
}
