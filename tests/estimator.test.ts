import { describe, expect, it } from "vitest";
import { calculateEstimate, getRequiredFields } from "@/lib/estimator";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

describe("getRequiredFields", () => {
  it("returns fence dimensions", () => {
    expect(getRequiredFields("Fence")).toEqual(["linearFeet", "heightFeet"]);
  });

  it("returns repair dimensions", () => {
    expect(getRequiredFields("Repair/Handyman")).toEqual(["hoursRequested"]);
  });
});

describe("calculateEstimate", () => {
  it("creates an estimate range with low < high", () => {
    const estimate = calculateEstimate(
      {
        projectType: "Fence",
        dimensions: {
          linearFeet: 100,
          heightFeet: 6
        },
        access: "standard",
        demoHaulOff: "standard",
        slope: "standard",
        notes: ""
      },
      DEFAULT_SETTINGS
    );

    expect(estimate.lowEstimate).toBeLessThan(estimate.highEstimate);
    expect(estimate.lineItems.materials.base).toBeGreaterThan(0);
    expect(estimate.lineItems.labor.base).toBeGreaterThan(0);
  });

  it("applies complexity multipliers", () => {
    const baseline = calculateEstimate(
      {
        projectType: "Deck",
        dimensions: {
          squareFeet: 300,
          heightFeet: 6
        },
        access: "standard",
        demoHaulOff: "standard",
        slope: "standard",
        notes: ""
      },
      DEFAULT_SETTINGS
    );

    const difficult = calculateEstimate(
      {
        projectType: "Deck",
        dimensions: {
          squareFeet: 300,
          heightFeet: 6
        },
        access: "difficult",
        demoHaulOff: "difficult",
        slope: "difficult",
        notes: ""
      },
      DEFAULT_SETTINGS
    );

    expect(difficult.adjustedSubtotal).toBeGreaterThan(baseline.adjustedSubtotal);
  });
});
