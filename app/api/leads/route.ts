import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createLead, isUsingPostgres } from "@/lib/db";
import { sendLeadNotification } from "@/lib/mailer";
import { estimateInputSchema, leadSchema } from "@/lib/validation";

export const runtime = "nodejs";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 6;

async function persistPhoto(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new Error(`Photo '${file.name}' exceeds the 5MB limit`);
  }

  const buffer = Buffer.from(bytes);

  if (isUsingPostgres()) {
    const mime = file.type || "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const targetPath = path.join(dir, filename);
  await writeFile(targetPath, buffer);
  return `/uploads/${filename}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const inputsRaw = form.get("inputs")?.toString() || "{}";
    const estimateRaw = form.get("estimate")?.toString() || "{}";

    const inputsParsed = estimateInputSchema.safeParse(JSON.parse(inputsRaw));
    if (!inputsParsed.success) {
      return NextResponse.json({ error: "Invalid estimate payload" }, { status: 400 });
    }

    const photos = form.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json({ error: "Maximum 6 photos allowed per lead" }, { status: 400 });
    }

    const photoPaths: string[] = [];

    for (const file of photos) {
      photoPaths.push(await persistPhoto(file));
    }

    const payload = {
      name: form.get("name")?.toString() || "",
      phone: form.get("phone")?.toString() || "",
      email: form.get("email")?.toString() || "",
      zip: form.get("zip")?.toString() || "",
      photos: photoPaths,
      inputs: inputsParsed.data,
      estimate: JSON.parse(estimateRaw)
    };

    const parsedLead = leadSchema.safeParse(payload);
    if (!parsedLead.success) {
      return NextResponse.json(
        {
          error: "Invalid lead payload",
          details: parsedLead.error.flatten()
        },
        { status: 400 }
      );
    }

    const leadId = await createLead(parsedLead.data);
    await sendLeadNotification(leadId, parsedLead.data);

    return NextResponse.json({ leadId });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create lead",
        details: error instanceof Error ? error.message : "Unknown"
      },
      { status: 500 }
    );
  }
}
