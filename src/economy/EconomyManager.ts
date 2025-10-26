/**
 * Manages city economy: revenue, expenses, and treasury
 */

import { Grid } from '@/core/Grid';
import { ZoneType, RoadType } from '@/core/types';
import { BUILDING_PROPERTIES, BuildingStage } from '@/buildings/types';
import { EconomicStats } from './types';
import { CitizenManager } from './CitizenManager';

/**
 * Road maintenance costs per road type (per tile per month)
 */
const ROAD_MAINTENANCE_COSTS: Record<RoadType, number> = {
  [RoadType.SMALL]: 10,
  [RoadType.MEDIUM]: 25,
  [RoadType.LARGE]: 40,
  [RoadType.HIGHWAY]: 80,
};

/**
 * EconomyManager handles financial calculations and updates
 */
export class EconomyManager {
  private grid: Grid;
  private citizenManager: CitizenManager;
  private treasury: number;
  private updateInterval: number = 60; // Update every 60 ticks (monthly budget)
  private ticksSinceUpdate: number = 0;

  // Financial tracking
  private lastRevenue: number = 0;
  private lastExpenses: number = 0;
  private lastTaxRevenue: number = 0;
  private lastRoadMaintenance: number = 0;
  private lastBuildingMaintenance: number = 0;

  constructor(grid: Grid, citizenManager: CitizenManager, startingMoney: number = 100000) {
    this.grid = grid;
    this.citizenManager = citizenManager;
    this.treasury = startingMoney;
  }

  /**
   * Update economy system
   */
  update(): void {
    this.ticksSinceUpdate++;

    if (this.ticksSinceUpdate >= this.updateInterval) {
      this.ticksSinceUpdate = 0;
      this.processMonthlyBudget();
    }
  }

  /**
   * Process monthly budget: calculate revenue and expenses
   */
  private processMonthlyBudget(): void {
    // Calculate revenue
    const taxRevenue = this.calculateTaxRevenue();

    // Calculate expenses
    const roadMaintenance = this.calculateRoadMaintenance();
    const buildingMaintenance = this.calculateBuildingMaintenance();

    const totalRevenue = taxRevenue;
    const totalExpenses = roadMaintenance + buildingMaintenance;

    // Update treasury
    const netIncome = totalRevenue - totalExpenses;
    this.treasury += netIncome;

    // Store for statistics
    this.lastRevenue = totalRevenue;
    this.lastExpenses = totalExpenses;
    this.lastTaxRevenue = taxRevenue;
    this.lastRoadMaintenance = roadMaintenance;
    this.lastBuildingMaintenance = buildingMaintenance;

    // Log budget report
    console.log(`=== Monthly Budget ===`);
    console.log(`Revenue: $${totalRevenue}`);
    console.log(`  - Tax Revenue: $${taxRevenue}`);
    console.log(`Expenses: $${totalExpenses}`);
    console.log(`  - Road Maintenance: $${roadMaintenance}`);
    console.log(`  - Building Maintenance: $${buildingMaintenance}`);
    console.log(`Net Income: $${netIncome}`);
    console.log(`Treasury: $${this.treasury}`);

    // Warn if low on funds
    if (this.treasury < 0) {
      console.warn('⚠️ City is in debt!');
    } else if (this.treasury < 10000) {
      console.warn('⚠️ Low funds warning!');
    }
  }

  /**
   * Calculate tax revenue from all buildings
   */
  private calculateTaxRevenue(): number {
    let total = 0;
    const cells = this.grid.getAllCells();

    for (const cell of cells) {
      if (cell.buildingLevel > 0 && cell.zoneType !== ZoneType.NONE) {
        const props = BUILDING_PROPERTIES[cell.zoneType][cell.buildingLevel as BuildingStage];
        total += props.taxRevenue;
      }
    }

    return total;
  }

  /**
   * Calculate road maintenance costs
   */
  private calculateRoadMaintenance(): number {
    let total = 0;
    const cells = this.grid.getAllCells();

    for (const cell of cells) {
      if (cell.isRoad() && cell.roadType) {
        total += ROAD_MAINTENANCE_COSTS[cell.roadType];
      }
    }

    return total;
  }

  /**
   * Calculate building maintenance costs
   */
  private calculateBuildingMaintenance(): number {
    let total = 0;
    const cells = this.grid.getAllCells();

    for (const cell of cells) {
      if (cell.buildingLevel > 0 && cell.zoneType !== ZoneType.NONE) {
        const props = BUILDING_PROPERTIES[cell.zoneType][cell.buildingLevel as BuildingStage];
        total += props.maintenanceCost;
      }
    }

    return total;
  }

  /**
   * Get current treasury balance
   */
  getTreasury(): number {
    return this.treasury;
  }

  /**
   * Add money to treasury (for testing or events)
   */
  addMoney(amount: number): void {
    this.treasury += amount;
  }

  /**
   * Remove money from treasury (for construction costs, etc.)
   */
  spendMoney(amount: number): boolean {
    if (this.treasury >= amount) {
      this.treasury -= amount;
      return true;
    }
    return false;
  }

  /**
   * Get economic statistics
   */
  getStats(): EconomicStats {
    const citizenStats = this.citizenManager.getStats();

    // Calculate total jobs available
    const cells = this.grid.getAllCells();
    let totalJobs = 0;

    for (const cell of cells) {
      if (
        (cell.zoneType === ZoneType.COMMERCIAL || cell.zoneType === ZoneType.INDUSTRIAL) &&
        cell.buildingLevel > 0
      ) {
        const props = BUILDING_PROPERTIES[cell.zoneType][cell.buildingLevel as BuildingStage];
        totalJobs += props.jobs;
      }
    }

    return {
      totalCitizens: citizenStats.totalCitizens,
      employedCitizens: citizenStats.employedCitizens,
      unemployedCitizens: citizenStats.unemployedCitizens,
      retiredCitizens: citizenStats.retiredCitizens,
      totalJobs,
      availableJobs: citizenStats.availableJobs,
      unemploymentRate: citizenStats.unemploymentRate,

      totalRevenue: this.lastRevenue,
      totalExpenses: this.lastExpenses,
      netIncome: this.lastRevenue - this.lastExpenses,
      treasury: this.treasury,

      taxRevenue: this.lastTaxRevenue,
      roadMaintenance: this.lastRoadMaintenance,
      buildingMaintenance: this.lastBuildingMaintenance,
    };
  }

  /**
   * Reset economy (for new game)
   */
  reset(startingMoney: number = 100000): void {
    this.treasury = startingMoney;
    this.ticksSinceUpdate = 0;
    this.lastRevenue = 0;
    this.lastExpenses = 0;
    this.lastTaxRevenue = 0;
    this.lastRoadMaintenance = 0;
    this.lastBuildingMaintenance = 0;
  }
}
