import { EstimateSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: EstimateSettings = {
  laborRatePerHour: 85,
  lowFactor: 0.9,
  highFactor: 1.15,
  complexityMultipliers: {
    access: {
      easy: 0.95,
      standard: 1,
      difficult: 1.2
    },
    demoHaulOff: {
      easy: 0.95,
      standard: 1,
      difficult: 1.25
    },
    slope: {
      easy: 0.95,
      standard: 1,
      difficult: 1.2
    }
  },
  projectConfigs: {
    Fence: {
      unitMaterialCost: 42,
      productionRatePerHour: 8,
      laborHoursBase: 3,
      minimumCharge: 1200,
      measurement: "linearFeet"
    },
    Deck: {
      unitMaterialCost: 24,
      productionRatePerHour: 10,
      laborHoursBase: 8,
      minimumCharge: 3000,
      measurement: "squareFeet"
    },
    Pergola: {
      unitMaterialCost: 36,
      productionRatePerHour: 7,
      laborHoursBase: 10,
      minimumCharge: 3500,
      measurement: "squareFeet"
    },
    "Repair/Handyman": {
      unitMaterialCost: 18,
      productionRatePerHour: 1,
      laborHoursBase: 2,
      minimumCharge: 300,
      measurement: "hoursRequested"
    }
  }
};
