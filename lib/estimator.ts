import { DEFAULT_SETTINGS } from "@/lib/default-settings";
import { EstimateInputs, EstimateResult, EstimateSettings } from "@/lib/types";

function numberOrZero(value?: number): number {
  return Number.isFinite(value) && value ? value : 0;
}

export function getRequiredFields(projectType: EstimateInputs["projectType"]): string[] {
  switch (projectType) {
    case "Fence":
      return ["linearFeet", "heightFeet"];
    case "Deck":
      return ["squareFeet", "heightFeet"];
    case "Pergola":
      return ["squareFeet", "heightFeet"];
    case "Repair/Handyman":
      return ["hoursRequested"];
    default:
      return [];
  }
}

export function calculateEstimate(
  inputs: EstimateInputs,
  settings: EstimateSettings = DEFAULT_SETTINGS
): EstimateResult {
  const config = settings.projectConfigs[inputs.projectType];
  const dims = inputs.dimensions;

  const quantity = Math.max(
    1,
    numberOrZero(
      config.measurement === "linearFeet"
        ? dims.linearFeet
        : config.measurement === "squareFeet"
          ? dims.squareFeet
          : dims.hoursRequested
    )
  );

  const heightFactor = Math.max(1, numberOrZero(dims.heightFeet) / 6);
  const materials = quantity * config.unitMaterialCost * heightFactor;

  const laborHours = config.laborHoursBase + quantity / Math.max(config.productionRatePerHour, 0.25);
  const labor = laborHours * settings.laborRatePerHour * heightFactor;

  const rawSubtotal = materials + labor;
  const withMinimum = Math.max(rawSubtotal, config.minimumCharge);

  const complexityMultiplier =
    settings.complexityMultipliers.access[inputs.access] *
    settings.complexityMultipliers.demoHaulOff[inputs.demoHaulOff] *
    settings.complexityMultipliers.slope[inputs.slope];

  const adjustedSubtotal = withMinimum * complexityMultiplier;
  const lowEstimate = adjustedSubtotal * settings.lowFactor;
  const highEstimate = adjustedSubtotal * settings.highFactor;

  return {
    quantity,
    materialCost: materials,
    laborHours,
    laborCost: labor,
    subtotal: withMinimum,
    complexityMultiplier,
    adjustedSubtotal,
    lowEstimate,
    highEstimate,
    lineItems: {
      materials: {
        base: materials,
        low: materials * settings.lowFactor * complexityMultiplier,
        high: materials * settings.highFactor * complexityMultiplier
      },
      labor: {
        base: labor,
        low: labor * settings.lowFactor * complexityMultiplier,
        high: labor * settings.highFactor * complexityMultiplier
      }
    }
  };
}
