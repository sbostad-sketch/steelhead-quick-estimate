import nodemailer from "nodemailer";
import { LeadSubmission } from "@/lib/types";

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user,
      pass
    }
  });
}

export async function sendLeadNotification(leadId: number, lead: LeadSubmission): Promise<void> {
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  const transport = buildTransport();

  if (!to || !from || !transport) {
    console.log("Lead notification skipped (SMTP or notification email not configured)", { leadId });
    return;
  }

  const photoSummary =
    lead.photos.length === 0
      ? "None"
      : lead.photos
          .map((photo, idx) => (photo.startsWith("data:") ? `inline-photo-${idx + 1}` : photo))
          .join(", ");

  const subject = `New Steelhead Quick Estimate lead #${leadId}`;
  const text = [
    `Lead ID: ${leadId}`,
    `Created: ${new Date().toISOString()}`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `ZIP: ${lead.zip}`,
    `Project Type: ${lead.inputs.projectType}`,
    `Estimate Range: $${lead.estimate.lowEstimate.toFixed(0)} - $${lead.estimate.highEstimate.toFixed(0)}`,
    `Photos: ${photoSummary}`,
    `Notes: ${lead.inputs.notes || "None"}`
  ].join("\n");

  await transport.sendMail({
    to,
    from,
    subject,
    text
  });
}
