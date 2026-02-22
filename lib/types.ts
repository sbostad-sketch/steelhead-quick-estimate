export const PROJECT_TYPES = ["Fence", "Deck", "Pergola", "Repair/Handyman"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export type ComplexityLevel = "easy" | "standard" | "difficult";

export type DimensionInputs = {
  linearFeet?: number;
  heightFeet?: number;
  squareFeet?: number;
  hoursRequested?: number;
};

export type EstimateInputs = {
  projectType: ProjectType;
  dimensions: DimensionInputs;
  access: ComplexityLevel;
  demoHaulOff: ComplexityLevel;
  slope: ComplexityLevel;
  notes?: string;
};

export type ProjectConfig = {
  unitMaterialCost: number;
  productionRatePerHour: number;
  laborHoursBase: number;
  minimumCharge: number;
  measurement: "linearFeet" | "squareFeet" | "hoursRequested";
};

export type EstimateSettings = {
  laborRatePerHour: number;
  lowFactor: number;
  highFactor: number;
  complexityMultipliers: {
    access: Record<ComplexityLevel, number>;
    demoHaulOff: Record<ComplexityLevel, number>;
    slope: Record<ComplexityLevel, number>;
  };
  projectConfigs: Record<ProjectType, ProjectConfig>;
};

export type EstimateResult = {
  quantity: number;
  materialCost: number;
  laborHours: number;
  laborCost: number;
  subtotal: number;
  complexityMultiplier: number;
  adjustedSubtotal: number;
  lowEstimate: number;
  highEstimate: number;
  lineItems: {
    materials: {
      base: number;
      low: number;
      high: number;
    };
    labor: {
      base: number;
      low: number;
      high: number;
    };
  };
};

export type LeadSubmission = {
  name: string;
  phone: string;
  email: string;
  zip: string;
  photos: string[];
  inputs: EstimateInputs;
  estimate: EstimateResult;
};
