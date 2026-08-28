// POST /api/newsletter — Subscribe to newsletter.
// Uses Prisma for persistent storage.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const EmailSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`newsletter:${ip}`, RATE_LIMITS.newsletter);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const parsed = EmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_email" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    // Check if already subscribed
    const existing = await prisma.newsletter.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.unsubscribedAt) {
        // Re-subscribe
        await prisma.newsletter.update({
          where: { email },
          data: { unsubscribedAt: null },
        });
      }
      return NextResponse.json({
        success: true,
        message: "Already subscribed!",
      });
    }

    // Create new subscription
    await prisma.newsletter.create({
      data: { email },
    });

    return NextResponse.json({
      success: true,
      message: "Subscribed successfully!",
    });
  } catch {
    return NextResponse.json(
      { error: "subscription_failed" },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<Response> {
  try {
    const count = await prisma.newsletter.count({
      where: { unsubscribedAt: null },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
