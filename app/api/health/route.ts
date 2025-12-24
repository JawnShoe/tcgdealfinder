import { NextResponse } from "next/server";

export async function GET() {
  const healthData = {
    ok: true,
    timestamp: new Date().toISOString(),
    service: "tcg-deal-finder",
    version: process.env.npm_package_version || "unknown",
    node: process.version,
  };

  return NextResponse.json(healthData);
}
