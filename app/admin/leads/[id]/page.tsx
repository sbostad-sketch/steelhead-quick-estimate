import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getLeadExportById } from "@/lib/db";
import { EstimateInputs, EstimateResult } from "@/lib/types";

type LeadDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatNumber(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "-";
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const authed = await isAdminAuthed();
  if (!authed) {
    redirect("/admin/login");
  }

  const resolvedParams = await params;
  const id = Number(resolvedParams.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const lead = await getLeadExportById(id);
  if (!lead) {
    notFound();
  }

  const inputs = parseJson<EstimateInputs>(lead.inputs_json, {
    projectType: "Fence",
    dimensions: {},
    access: "standard",
    demoHaulOff: "standard",
    slope: "standard",
    notes: ""
  });

  const estimate = parseJson<EstimateResult>(lead.estimate_json, {
    quantity: 0,
    materialCost: 0,
    laborHours: 0,
    laborCost: 0,
    subtotal: 0,
    complexityMultiplier: 1,
    adjustedSubtotal: 0,
    lowEstimate: 0,
    highEstimate: 0,
    lineItems: {
      materials: { base: 0, low: 0, high: 0 },
      labor: { base: 0, low: 0, high: 0 }
    }
  });

  const photos = parseJson<string[]>(lead.photos_json, []);

  return (
    <main className="grid" style={{ gap: 18 }}>
      <section className="card">
        <div className="header">
          <div>
            <h1>Lead #{lead.id}</h1>
            <p className="muted">Submitted {lead.created_at}</p>
          </div>
          <Link href="/admin" className="muted">
            Back to Admin
          </Link>
        </div>
      </section>

      <section className="card grid two">
        <div>
          <h2>Contact</h2>
          <p>
            <strong>Name:</strong> {lead.name}
          </p>
          <p>
            <strong>Phone:</strong> {lead.phone}
          </p>
          <p>
            <strong>Email:</strong> {lead.email}
          </p>
          <p>
            <strong>ZIP:</strong> {lead.zip}
          </p>
        </div>

        <div>
          <h2>Project</h2>
          <p>
            <strong>Type:</strong> {inputs.projectType}
          </p>
          <p>
            <strong>Linear Feet:</strong> {formatNumber(inputs.dimensions.linearFeet)}
          </p>
          <p>
            <strong>Square Feet:</strong> {formatNumber(inputs.dimensions.squareFeet)}
          </p>
          <p>
            <strong>Height (ft):</strong> {formatNumber(inputs.dimensions.heightFeet)}
          </p>
          <p>
            <strong>Hours Requested:</strong> {formatNumber(inputs.dimensions.hoursRequested)}
          </p>
          <p>
            <strong>Access:</strong> {inputs.access}
          </p>
          <p>
            <strong>Demo/Haul-Off:</strong> {inputs.demoHaulOff}
          </p>
          <p>
            <strong>Slope:</strong> {inputs.slope}
          </p>
        </div>
      </section>

      <section className="card grid" style={{ gap: 8 }}>
        <h2>Estimate</h2>
        <div className="result-box">
          <h3>
            {formatCurrency(estimate.lowEstimate)} - {formatCurrency(estimate.highEstimate)}
          </h3>
          <div className="line-item">
            <span>Materials</span>
            <strong>
              {formatCurrency(estimate.lineItems.materials.low)} - {formatCurrency(estimate.lineItems.materials.high)}
            </strong>
          </div>
          <div className="line-item">
            <span>Labor</span>
            <strong>
              {formatCurrency(estimate.lineItems.labor.low)} - {formatCurrency(estimate.lineItems.labor.high)}
            </strong>
          </div>
        </div>
      </section>

      <section className="card grid" style={{ gap: 10 }}>
        <h2>Notes</h2>
        <p className="muted" style={{ margin: 0 }}>{inputs.notes?.trim() || "No notes provided."}</p>
      </section>

      <section className="card grid" style={{ gap: 10 }}>
        <h2>Photos</h2>
        {photos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No photos uploaded.</p>
        ) : (
          <div className="photo-grid">
            {photos.map((photo, idx) => (
              <a
                key={`${photo.slice(0, 32)}-${idx}`}
                href={photo}
                target="_blank"
                rel="noreferrer"
                className="photo-link"
              >
                <img src={photo} alt={`Lead ${lead.id} photo ${idx + 1}`} className="photo-thumb" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
