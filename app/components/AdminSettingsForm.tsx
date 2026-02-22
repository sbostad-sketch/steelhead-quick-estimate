"use client";

import { useState } from "react";
import { EstimateSettings, PROJECT_TYPES, ProjectType } from "@/lib/types";

type Props = {
  initialSettings: EstimateSettings;
};

export default function AdminSettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState<EstimateSettings>(initialSettings);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function setProjectValue(
    project: ProjectType,
    field: "unitMaterialCost" | "productionRatePerHour" | "laborHoursBase" | "minimumCharge",
    value: string
  ) {
    setSettings((prev) => ({
      ...prev,
      projectConfigs: {
        ...prev.projectConfigs,
        [project]: {
          ...prev.projectConfigs[project],
          [field]: Number(value)
        }
      }
    }));
  }

  function setTopLevel(field: "laborRatePerHour" | "lowFactor" | "highFactor", value: number) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function setMultiplier(
    bucket: keyof EstimateSettings["complexityMultipliers"],
    level: keyof EstimateSettings["complexityMultipliers"]["access"],
    value: string
  ) {
    setSettings((prev) => ({
      ...prev,
      complexityMultipliers: {
        ...prev.complexityMultipliers,
        [bucket]: {
          ...prev.complexityMultipliers[bucket],
          [level]: Number(value)
        }
      }
    }));
  }

  async function save() {
    setBusy(true);
    setError("");
    setStatus("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setStatus("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid two">
        <label>
          Labor Rate ($/hr)
          <input
            type="number"
            min={0}
            step="0.01"
            value={settings.laborRatePerHour}
            onChange={(e) => setTopLevel("laborRatePerHour", Number(e.target.value))}
          />
        </label>
        <label>
          Low Factor
          <input
            type="number"
            min={0}
            step="0.01"
            value={settings.lowFactor}
            onChange={(e) => setTopLevel("lowFactor", Number(e.target.value))}
          />
        </label>
        <label>
          High Factor
          <input
            type="number"
            min={0}
            step="0.01"
            value={settings.highFactor}
            onChange={(e) => setTopLevel("highFactor", Number(e.target.value))}
          />
        </label>
      </div>

      <h3>Complexity Multipliers</h3>
      {(["access", "demoHaulOff", "slope"] as const).map((bucket) => (
        <div key={bucket} className="card" style={{ boxShadow: "none" }}>
          <strong style={{ textTransform: "capitalize" }}>{bucket}</strong>
          <div className="grid two" style={{ marginTop: 8 }}>
            {(["easy", "standard", "difficult"] as const).map((level) => (
              <label key={level}>
                {level}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={settings.complexityMultipliers[bucket][level]}
                  onChange={(e) => setMultiplier(bucket, level, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <h3>Project Configurations</h3>
      {PROJECT_TYPES.map((project) => {
        const cfg = settings.projectConfigs[project];
        return (
          <div key={project} className="card" style={{ boxShadow: "none" }}>
            <strong>{project}</strong>
            <div className="grid two" style={{ marginTop: 8 }}>
              <label>
                Unit Material Cost
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cfg.unitMaterialCost}
                  onChange={(e) => setProjectValue(project, "unitMaterialCost", e.target.value)}
                />
              </label>
              <label>
                Production Rate (units/hr)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cfg.productionRatePerHour}
                  onChange={(e) => setProjectValue(project, "productionRatePerHour", e.target.value)}
                />
              </label>
              <label>
                Base Labor Hours
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={cfg.laborHoursBase}
                  onChange={(e) => setProjectValue(project, "laborHoursBase", e.target.value)}
                />
              </label>
              <label>
                Minimum Charge
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cfg.minimumCharge}
                  onChange={(e) => setProjectValue(project, "minimumCharge", e.target.value)}
                />
              </label>
            </div>
          </div>
        );
      })}

      <button disabled={busy} onClick={save}>
        {busy ? "Saving..." : "Save Settings"}
      </button>
      {error ? <p className="error">{error}</p> : null}
      {status ? <p>{status}</p> : null}
    </div>
  );
}
