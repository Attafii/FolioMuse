// Dynamic OG image for portfolio detail pages.
// Uses Next.js ImageResponse to generate images on-the-fly.

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Portfolio";
  const creator = searchParams.get("creator") || "Unknown";
  const role = searchParams.get("role") || "Developer";
  const quality = searchParams.get("quality") || "L2";

  const qualityLabels: Record<string, string> = {
    L0: "Unusable",
    L1: "Minimal",
    L2: "Adequate",
    L3: "Strong",
    L4: "Exemplary",
  };

  const qualityStars: Record<string, number> = {
    L0: 1,
    L1: 2,
    L2: 3,
    L3: 4,
    L4: 5,
  };

  const stars = qualityStars[quality] || 3;
  const starString = "★".repeat(stars) + "☆".repeat(5 - stars);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%), radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontSize: "20px", fontWeight: "bold" }}>F</span>
            </div>
            <span style={{ color: "white", fontSize: "24px", fontWeight: "600" }}>FolioMuse</span>
          </div>

          {/* Title */}
          <h1
            style={{
              color: "white",
              fontSize: "48px",
              fontWeight: "700",
              lineHeight: "1.2",
              marginBottom: "16px",
              maxWidth: "800px",
            }}
          >
            {title}
          </h1>

          {/* Creator & Role */}
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "24px",
              marginBottom: "24px",
            }}
          >
            by {creator} · {role}
          </p>

          {/* Quality badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 24px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <span style={{ color: "#facc15", fontSize: "24px" }}>{starString}</span>
            <span style={{ color: "#a1a1aa", fontSize: "16px" }}>
              {qualityLabels[quality] || quality}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#71717a",
            fontSize: "16px",
          }}
        >
          foliomuse.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
