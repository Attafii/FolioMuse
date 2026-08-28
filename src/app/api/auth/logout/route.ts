// POST /api/auth/logout — Delete session.

import { prisma } from "@/lib/prisma";

export async function POST(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ success: true });
    }

    const token = authHeader.slice(7);
    await prisma.session.deleteMany({ where: { token } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: true });
  }
}
