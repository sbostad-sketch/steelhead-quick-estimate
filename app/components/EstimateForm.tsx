"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { PROJECT_TYPES, EstimateInputs, EstimateResult } from "@/lib/types";
import { getRequiredFields } from "@/lib/estimator";

type LeadFields = {
  name: string;
  phone: string;
  email: string;
  zip: string;
};

const complexityOptions = [
  { value: "easy", label: "Easy" },
  { value: "standard", label: "Standard" },
  { value: "difficult", label: "Difficult" }
] as const;

export default function EstimateForm() {
  const [inputs, setInputs] = useState<EstimateInputs>({
    projectType: "Fence",
    dimensions: {},
    access: "standard",
    demoHaulOff: "standard",
    slope: "standard",
    notes: ""
  });
  const [lead, setLead] = useState<LeadFields>({ name: "", phone: "", email: "", zip: "" });
  const [photos, setPhotos] = useState<File[]>([]);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const requiredFields = useMemo(() => getRequiredFields(inputs.projectType), [inputs.projectType]);

  function updateDimension(key: keyof EstimateInputs["dimensions"], raw: string) {
    setInputs((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [key]: raw ? Number(raw) : undefined
      }
    }));
  }

  async function generateEstimate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to generate estimate");

      setEstimate(data.estimate);
      setStatus("Estimate generated. Submit your contact details to save this lead.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  async function submitLead() {
    if (!estimate) {
      setError("Generate an estimate before submitting your lead.");
      return;
    }
    if (!lead.name || !lead.phone || !lead.email || !lead.zip) {
      setError("Please complete name, phone, email, and ZIP before submitting.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    try {
      const fd = new FormData();
      fd.append("name", lead.name);
      fd.append("phone", lead.phone);
      fd.append("email", lead.email);
      fd.append("zip", lead.zip);
      fd.append("inputs", JSON.stringify(inputs));
      fd.append("estimate", JSON.stringify(estimate));

      for (const photo of photos) {
        fd.append("photos", photo);
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to submit lead");

      setStatus(`Lead submitted successfully. Reference #${data.leadId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <form className="card grid" onSubmit={generateEstimate}>
        <div className="header">
          <div>
            <h2>Project Details</h2>
            <p className="muted">Get a fast ballpark estimate in under two minutes.</p>
          </div>
        </div>

        <div className="grid two">
          <label>
            Project Type
            <select
              value={inputs.projectType}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  projectType: e.target.value as EstimateInputs["projectType"],
                  dimensions: {}
                }))
              }
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          {requiredFields.includes("linearFeet") && (
            <label>
              Linear Feet
              <input
                type="number"
                min={0}
                value={inputs.dimensions.linearFeet ?? ""}
                onChange={(e) => updateDimension("linearFeet", e.target.value)}
                required
              />
            </label>
          )}

          {requiredFields.includes("squareFeet") && (
            <label>
              Square Feet
              <input
                type="number"
                min={0}
                value={inputs.dimensions.squareFeet ?? ""}
                onChange={(e) => updateDimension("squareFeet", e.target.value)}
                required
              />
            </label>
          )}

          {requiredFields.includes("heightFeet") && (
            <label>
              Height (Feet)
              <input
                type="number"
                min={0}
                step="0.1"
                value={inputs.dimensions.heightFeet ?? ""}
                onChange={(e) => updateDimension("heightFeet", e.target.value)}
                required
              />
            </label>
          )}

          {requiredFields.includes("hoursRequested") && (
            <label>
              Estimated Hours Needed
              <input
                type="number"
                min={1}
                value={inputs.dimensions.hoursRequested ?? ""}
                onChange={(e) => updateDimension("hoursRequested", e.target.value)}
                required
              />
            </label>
          )}

          <label>
            Site Access
            <select
              value={inputs.access}
              onChange={(e) => setInputs((prev) => ({ ...prev, access: e.target.value as EstimateInputs["access"] }))}
            >
              {complexityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Demo / Haul-Off
            <select
              value={inputs.demoHaulOff}
              onChange={(e) =>
                setInputs((prev) => ({ ...prev, demoHaulOff: e.target.value as EstimateInputs["demoHaulOff"] }))
              }
            >
              {complexityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Slope
            <select
              value={inputs.slope}
              onChange={(e) => setInputs((prev) => ({ ...prev, slope: e.target.value as EstimateInputs["slope"] }))}
            >
              {complexityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Additional Notes (optional)
            <textarea
              value={inputs.notes || ""}
              onChange={(e) => setInputs((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </label>
        </div>

        <button disabled={busy} type="submit">
          {busy ? "Calculating..." : "Generate Estimate"}
        </button>
      </form>

      {estimate && (
        <div className="card grid" style={{ gap: 16 }}>
          <h2>Your Rough Estimate</h2>
          <div className="result-box">
            <h3>
              {formatCurrency(estimate.lowEstimate)} - {formatCurrency(estimate.highEstimate)}
            </h3>
            <p className="muted">Range reflects selected complexity and configurable labor/material assumptions.</p>
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

          <div className="notice">
            This is a rough estimate only. Final pricing is provided after an on-site visit and scope confirmation.
          </div>

          <h3>Send Your Info</h3>
          <div className="grid two">
            <label>
              Name
              <input value={lead.name} onChange={(e) => setLead((p) => ({ ...p, name: e.target.value }))} required />
            </label>
            <label>
              Phone
              <input value={lead.phone} onChange={(e) => setLead((p) => ({ ...p, phone: e.target.value }))} required />
            </label>
            <label>
              Email
              <input
                type="email"
                value={lead.email}
                onChange={(e) => setLead((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </label>
            <label>
              ZIP
              <input value={lead.zip} onChange={(e) => setLead((p) => ({ ...p, zip: e.target.value }))} required />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Optional Photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              />
            </label>
          </div>
          <button disabled={busy} onClick={submitLead}>
            {busy ? "Submitting..." : "Submit Lead"}
          </button>
        </div>
      )}

      {error ? <p className="error">{error}</p> : null}
      {status ? <p>{status}</p> : null}
    </div>
  );
}
