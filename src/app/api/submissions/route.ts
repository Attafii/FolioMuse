// POST /api/submissions — Submit a portfolio for review.
// Validates input, stores submission for curation queue.
// ponytail: simple insert, no email verification yet.

import { NextResponse } from "next/server";
import { SubmissionSchema } from "@/domain/curation/submission";

// In-memory store for demo — replace with DB table in production.
// ponytail: global store, upgrade to Prisma when persistence matters.
const submissions: Array<{
  id: string;
  url: string;
  creatorName: string;
  creatorRole: string;
  email?: string;
  notes?: string;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  createdAt: string;
}> = [];

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = SubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const submission = {
      id: crypto.randomUUID(),
      ...parsed.data,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };

    submissions.push(submission);

    return NextResponse.json({
      success: true,
      id: submission.id,
      message: "Portfolio submitted for review. We'll check it out!",
    });
  } catch {
    return NextResponse.json(
      { error: "submission_failed" },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({
    items: submissions.filter((s) => s.status === "pending"),
    count: submissions.filter((s) => s.status === "pending").length,
  });
}
