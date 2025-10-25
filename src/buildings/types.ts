/**
 * Building system type definitions
 */

import { ZoneType } from '@/core/types';

/**
 * Building growth stage
 */
export enum BuildingStage {
  EMPTY = 0,
  SMALL = 1,
  MEDIUM = 2,
  LARGE = 3,
}

/**
 * Building growth requirements
 */
export interface GrowthRequirements {
  minRoadAccess: boolean;        // Must have adjacent road
  minPopulation: number;          // Minimum city population
  minDemand: number;              // Minimum zone demand (0-100)
  minPowerSupply: number;         // Minimum power (0-100)
  minWaterSupply: number;         // Minimum water (0-100)
  maxTrafficDensity: number;      // Maximum traffic congestion (0-100)
}

/**
 * Building properties by type and level
 */
export interface BuildingProperties {
  population: number;             // Residential: population, C/I: workers
  jobs: number;                   // Jobs provided (C/I only)
  taxRevenue: number;             // Tax revenue per tick
  maintenanceCost: number;        // Maintenance cost per tick
  powerConsumption: number;       // Power consumed
  waterConsumption: number;       // Water consumed
  trafficGeneration: number;      // Traffic generated per tick
}

/**
 * Demand factors
 */
export interface DemandFactors {
  residential: number;  // -100 to 100
  commercial: number;   // -100 to 100
  industrial: number;   // -100 to 100
}

/**
 * Growth configuration for each zone type
 */
export const GROWTH_CONFIGS: Record<ZoneType, GrowthRequirements> = {
  [ZoneType.NONE]: {
    minRoadAccess: false,
    minPopulation: 0,
    minDemand: 0,
    minPowerSupply: 0,
    minWaterSupply: 0,
    maxTrafficDensity: 100,
  },
  [ZoneType.RESIDENTIAL]: {
    minRoadAccess: true,
    minPopulation: 0,
    minDemand: 20,
    minPowerSupply: 50,
    minWaterSupply: 50,
    maxTrafficDensity: 80,
  },
  [ZoneType.COMMERCIAL]: {
    minRoadAccess: true,
    minPopulation: 50,
    minDemand: 25,
    minPowerSupply: 60,
    minWaterSupply: 40,
    maxTrafficDensity: 85,
  },
  [ZoneType.INDUSTRIAL]: {
    minRoadAccess: true,
    minPopulation: 20,
    minDemand: 25,
    minPowerSupply: 70,
    minWaterSupply: 30,
    maxTrafficDensity: 90,
  },
};

/**
 * Building properties by zone type and level
 */
export const BUILDING_PROPERTIES: Record<
  ZoneType,
  Record<BuildingStage, BuildingProperties>
> = {
  [ZoneType.NONE]: {
    [BuildingStage.EMPTY]: {
      population: 0,
      jobs: 0,
      taxRevenue: 0,
      maintenanceCost: 0,
      powerConsumption: 0,
      waterConsumption: 0,
      trafficGeneration: 0,
    },
    [BuildingStage.SMALL]: {
      population: 0,
      jobs: 0,
      taxRevenue: 0,
      maintenanceCost: 0,
      powerConsumption: 0,
      waterConsumption: 0,
      trafficGeneration: 0,
    },
    [BuildingStage.MEDIUM]: {
      population: 0,
      jobs: 0,
      taxRevenue: 0,
      maintenanceCost: 0,
      powerConsumption: 0,
      waterConsumption: 0,
      trafficGeneration: 0,
    },
    [BuildingStage.LARGE]: {
      population: 0,
      jobs: 0,
      taxRevenue: 0,
      maintenanceCost: 0,
      powerConsumption: 0,
      waterConsumption: 0,
      trafficGeneration: 0,
    },
  },
  [ZoneType.RESIDENTIAL]: {
    [BuildingStage.EMPTY]: {
      population: 0,
      jobs: 0,
      taxRevenue: 0,
      maintenanceCost: 0,
      powerConsumption: 0,
      waterConsumption: 0,
      trafficGeneration: 0,
    },
    [BuildingStage.SMALL]: {
      population: 10,
      jobs: 0,
      taxRevenue: 5,
      maintenanceCost: 1,
      powerConsumption: 5,
      waterConsumption: 5,
      trafficGeneration: 2,
    },
    [BuildingStage.MEDIUM]: {
      population: 30,
      jobs: 0,
      taxRevenue: 15,
      maintenanceCost: 2,
      powerConsumption: 15,
      waterConsumption: 15,
      trafficGeneration: 5,
    },
    [BuildingStage.LARGE]: {
      population: 80,
      jobs: 0,
      taxRevenue: 40,
      maintenanceCost: 4,
      powerConsumption: 40,
      waterConsumption: 40,
      trafficGeneration: 12,
    },
  },
  [ZoneType.COMMERCIAL]: {
    [BuildingStage.EMPTY]: {
      population: 0,
      jobs: 0,
      taxRevenue: 0,
      maintenanceCost: 0,
      powerConsumption: 0,
      waterConsumption: 0,
      trafficGeneration: 0,
    },
    [BuildingStage.SMALL]: {
      population: 5,
      jobs: 8,
      taxRevenue: 8,
      maintenanceCost: 2,
      powerConsumption: 10,
      waterConsumption: 3,
      trafficGeneration: 4,
    },
    [BuildingStage.MEDIUM]: {
      population: 15,
      jobs: 25,
      taxRevenue: 25,
      maintenanceCost: 4,
      powerConsumption: 25,
      waterConsumption: 8,
      trafficGeneration: 10,
    },
    [BuildingStage.LARGE]: {
      population: 40,
      jobs: 70,
      taxRevenue: 70,
      maintenanceCost: 8,
      powerConsumption: 60,
      waterConsumption: 20,
      trafficGeneration: 25,
    },
  },
  [ZoneType.INDUSTRIAL]: {
    [BuildingStage.EMPTY]: {
      population: 0,
      jobs: 0,
      taxRevenue: 0,
      maintenanceCost: 0,
      powerConsumption: 0,
      waterConsumption: 0,
      trafficGeneration: 0,
    },
    [BuildingStage.SMALL]: {
      population: 3,
      jobs: 12,
      taxRevenue: 10,
      maintenanceCost: 3,
      powerConsumption: 20,
      waterConsumption: 5,
      trafficGeneration: 6,
    },
    [BuildingStage.MEDIUM]: {
      population: 10,
      jobs: 40,
      taxRevenue: 35,
      maintenanceCost: 6,
      powerConsumption: 50,
      waterConsumption: 15,
      trafficGeneration: 18,
    },
    [BuildingStage.LARGE]: {
      population: 25,
      jobs: 120,
      taxRevenue: 100,
      maintenanceCost: 12,
      powerConsumption: 120,
      waterConsumption: 40,
      trafficGeneration: 50,
    },
  },
};
