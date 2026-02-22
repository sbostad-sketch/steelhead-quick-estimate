import { z } from "zod";
import { PROJECT_TYPES } from "@/lib/types";

const complexityEnum = z.enum(["easy", "standard", "difficult"]);

const dimensionSchema = z.object({
  linearFeet: z.coerce.number().min(0).optional(),
  heightFeet: z.coerce.number().min(0).optional(),
  squareFeet: z.coerce.number().min(0).optional(),
  hoursRequested: z.coerce.number().min(0).optional()
});

export const estimateInputSchema = z.object({
  projectType: z.enum(PROJECT_TYPES),
  dimensions: dimensionSchema,
  access: complexityEnum,
  demoHaulOff: complexityEnum,
  slope: complexityEnum,
  notes: z.string().max(1000).optional().default("")
});

export const leadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(7).max(30),
  email: z.string().email(),
  zip: z.string().min(5).max(10),
  photos: z.array(z.string()).default([]),
  inputs: estimateInputSchema,
  estimate: z.object({
    quantity: z.number(),
    materialCost: z.number(),
    laborHours: z.number(),
    laborCost: z.number(),
    subtotal: z.number(),
    complexityMultiplier: z.number(),
    adjustedSubtotal: z.number(),
    lowEstimate: z.number(),
    highEstimate: z.number(),
    lineItems: z.object({
      materials: z.object({
        base: z.number(),
        low: z.number(),
        high: z.number()
      }),
      labor: z.object({
        base: z.number(),
        low: z.number(),
        high: z.number()
      })
    })
  })
});

export const settingsSchema = z.object({
  laborRatePerHour: z.coerce.number().positive(),
  lowFactor: z.coerce.number().positive(),
  highFactor: z.coerce.number().positive(),
  complexityMultipliers: z.object({
    access: z.object({
      easy: z.coerce.number().positive(),
      standard: z.coerce.number().positive(),
      difficult: z.coerce.number().positive()
    }),
    demoHaulOff: z.object({
      easy: z.coerce.number().positive(),
      standard: z.coerce.number().positive(),
      difficult: z.coerce.number().positive()
    }),
    slope: z.object({
      easy: z.coerce.number().positive(),
      standard: z.coerce.number().positive(),
      difficult: z.coerce.number().positive()
    })
  }),
  projectConfigs: z.object({
    Fence: z.object({
      unitMaterialCost: z.coerce.number().nonnegative(),
      productionRatePerHour: z.coerce.number().positive(),
      laborHoursBase: z.coerce.number().nonnegative(),
      minimumCharge: z.coerce.number().nonnegative(),
      measurement: z.literal("linearFeet")
    }),
    Deck: z.object({
      unitMaterialCost: z.coerce.number().nonnegative(),
      productionRatePerHour: z.coerce.number().positive(),
      laborHoursBase: z.coerce.number().nonnegative(),
      minimumCharge: z.coerce.number().nonnegative(),
      measurement: z.literal("squareFeet")
    }),
    Pergola: z.object({
      unitMaterialCost: z.coerce.number().nonnegative(),
      productionRatePerHour: z.coerce.number().positive(),
      laborHoursBase: z.coerce.number().nonnegative(),
      minimumCharge: z.coerce.number().nonnegative(),
      measurement: z.literal("squareFeet")
    }),
    "Repair/Handyman": z.object({
      unitMaterialCost: z.coerce.number().nonnegative(),
      productionRatePerHour: z.coerce.number().positive(),
      laborHoursBase: z.coerce.number().nonnegative(),
      minimumCharge: z.coerce.number().nonnegative(),
      measurement: z.literal("hoursRequested")
    })
  })
});
