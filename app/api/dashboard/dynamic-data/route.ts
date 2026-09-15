export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

export const revalidate = 1800; // Cache for 30 minutes

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Signals are delivered directly via dedicated endpoints: /api/signals/{reddit,insider,congress,super-investors}",
  });
}
