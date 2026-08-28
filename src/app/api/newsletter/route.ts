// POST /api/newsletter — Subscribe to newsletter.
// ponytail: in-memory store, upgrade to Resend/Mailchimp when needed.

import { NextResponse } from "next/server";
import { z } from "zod";

const EmailSchema = z.object({
  email: z.string().email(),
});

// ponytail: global store, replace with DB or email provider
const subscribers: Set<string> = new Set();

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = EmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_email" },
        { status: 400 }
      );
    }

    subscribers.add(parsed.data.email.toLowerCase());

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
  return NextResponse.json({
    count: subscribers.size,
  });
}
