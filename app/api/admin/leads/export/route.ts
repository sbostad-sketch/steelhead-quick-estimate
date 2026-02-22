import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { listLeadExports } from "@/lib/db";

export const runtime = "nodejs";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function csvValue(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await listLeadExports();

  const headers = [
    "id",
    "created_at",
    "name",
    "phone",
    "email",
    "zip",
    "project_type",
    "estimate_low",
    "estimate_high",
    "materials_low",
    "materials_high",
    "labor_low",
    "labor_high",
    "notes",
    "photos"
  ];

  const lines = [headers.join(",")];

  for (const lead of leads) {
    const inputs = parseJson<{ notes?: string }>(lead.inputs_json, {});
    const estimate = parseJson<{
      lowEstimate?: number;
      highEstimate?: number;
      lineItems?: {
        materials?: { low?: number; high?: number };
        labor?: { low?: number; high?: number };
      };
    }>(lead.estimate_json, {});
    const photos = parseJson<string[]>(lead.photos_json, []);
    const photoSummary = photos
      .map((photo, idx) => (photo.startsWith("data:") ? `inline-photo-${idx + 1}` : photo))
      .join(" | ");

    const row = [
      lead.id,
      lead.created_at,
      lead.name,
      lead.phone,
      lead.email,
      lead.zip,
      lead.project_type,
      estimate.lowEstimate ?? "",
      estimate.highEstimate ?? "",
      estimate.lineItems?.materials?.low ?? "",
      estimate.lineItems?.materials?.high ?? "",
      estimate.lineItems?.labor?.low ?? "",
      estimate.lineItems?.labor?.high ?? "",
      inputs.notes ?? "",
      photoSummary
    ];

    lines.push(row.map(csvValue).join(","));
  }

  const csv = `${lines.join("\n")}\n`;
  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="steelhead-leads-${fileDate}.csv"`
    }
  });
}
