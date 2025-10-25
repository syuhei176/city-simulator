/**
 * Economy system type definitions
 */

import { Position } from '@/core/types';

/**
 * Age groups for citizens
 */
export enum AgeGroup {
  YOUNG = 'young',      // 18-30
  MIDDLE = 'middle',    // 31-60
  SENIOR = 'senior',    // 61+
}

/**
 * Employment status
 */
export enum EmploymentStatus {
  EMPLOYED = 'employed',
  UNEMPLOYED = 'unemployed',
  RETIRED = 'retired',
}

/**
 * Citizen data
 */
export interface CitizenData {
  id: string;
  age: AgeGroup;
  employmentStatus: EmploymentStatus;
  homeLocation: Position | null;     // Residential building location
  workLocation: Position | null;     // Job location (C/I building)
  income: number;                    // Monthly income
  satisfaction: number;              // 0-100
}

/**
 * Economic statistics
 */
export interface EconomicStats {
  totalCitizens: number;
  employedCitizens: number;
  unemployedCitizens: number;
  retiredCitizens: number;
  totalJobs: number;
  availableJobs: number;
  unemploymentRate: number;          // Percentage

  // Financial
  totalRevenue: number;              // Per month
  totalExpenses: number;             // Per month
  netIncome: number;                 // Revenue - Expenses
  treasury: number;                  // Current money

  // Breakdown
  taxRevenue: number;                // From buildings
  roadMaintenance: number;           // Road upkeep costs
  buildingMaintenance: number;       // Building upkeep costs
}

/**
 * Job offer from a building
 */
export interface JobOffer {
  location: Position;
  availablePositions: number;
  salary: number;
}

/**
 * Housing offer from a building
 */
export interface HousingOffer {
  location: Position;
  availableUnits: number;
  rent: number;
}
