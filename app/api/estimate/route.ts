import { NextResponse } from "next/server";
import { calculateEstimate } from "@/lib/estimator";
import { getSettings } from "@/lib/db";
import { estimateInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = estimateInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid estimate inputs",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const settings = await getSettings();
    const estimate = calculateEstimate(parsed.data, settings);

    return NextResponse.json({ estimate });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to calculate estimate",
        details: error instanceof Error ? error.message : "Unknown"
      },
      { status: 500 }
    );
  }
}
