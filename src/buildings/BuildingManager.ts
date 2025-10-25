import { Grid } from '@/core/Grid';
import { Cell } from '@/core/Cell';
import { ZoneType } from '@/core/types';
import {
  BuildingStage,
  GrowthRequirements,
  BuildingProperties,
  GROWTH_CONFIGS,
  BUILDING_PROPERTIES,
  DemandFactors,
} from './types';

/**
 * Manages building growth and development
 */
export class BuildingManager {
  private grid: Grid;
  private growthCheckInterval: number = 30; // Check every 30 ticks
  private ticksSinceLastCheck: number = 0;
  private growthChance: number = 0.1; // 10% chance per check if conditions met

  // Current demand levels
  private demand: DemandFactors = {
    residential: 50,
    commercial: 50,
    industrial: 50,
  };

  // City-wide statistics
  private cityStats = {
    totalPopulation: 0,
    totalJobs: 0,
    totalWorkers: 0,
    powerAvailable: 1000, // TODO: Connect to power system
    waterAvailable: 1000, // TODO: Connect to water system
  };

  constructor(grid: Grid) {
    this.grid = grid;
  }

  /**
   * Update building system
   */
  update(): void {
    this.ticksSinceLastCheck++;

    if (this.ticksSinceLastCheck >= this.growthCheckInterval) {
      this.ticksSinceLastCheck = 0;
      this.updateCityStats();
      this.processGrowth();
    }
  }

  /**
   * Update city-wide statistics
   */
  private updateCityStats(): void {
    const cells = this.grid.getAllCells();

    this.cityStats.totalPopulation = 0;
    this.cityStats.totalJobs = 0;
    this.cityStats.totalWorkers = 0;

    for (const cell of cells) {
      if (cell.zoneType === ZoneType.NONE || cell.buildingLevel === 0) continue;

      const props = this.getBuildingProperties(cell.zoneType, cell.buildingLevel);

      if (cell.zoneType === ZoneType.RESIDENTIAL) {
        this.cityStats.totalPopulation += props.population;
        this.cityStats.totalWorkers += props.population * 0.6; // 60% work
      } else {
        this.cityStats.totalPopulation += props.population;
        this.cityStats.totalJobs += props.jobs;
      }
    }
  }

  /**
   * Process building growth for all zones
   */
  private processGrowth(): void {
    const cells = this.grid.getAllCells();
    const zonedCells = cells.filter(
      (c) => c.zoneType !== ZoneType.NONE && c.buildingLevel < BuildingStage.LARGE
    );

    for (const cell of zonedCells) {
      this.tryGrowBuilding(cell);
    }
  }

  /**
   * Try to grow a building on a cell
   */
  private tryGrowBuilding(cell: Cell): void {
    const requirements = GROWTH_CONFIGS[cell.zoneType];

    // Check all requirements
    if (!this.meetsGrowthRequirements(cell, requirements)) {
      return;
    }

    // Random chance to grow
    if (Math.random() > this.growthChance) {
      return;
    }

    // Grow the building
    this.growBuilding(cell);
  }

  /**
   * Check if a cell meets growth requirements
   */
  private meetsGrowthRequirements(
    cell: Cell,
    requirements: GrowthRequirements
  ): boolean {
    // Check road access
    if (requirements.minRoadAccess && !this.hasRoadAccess(cell)) {
      return false;
    }

    // Check population
    if (this.cityStats.totalPopulation < requirements.minPopulation) {
      return false;
    }

    // Check demand
    const zoneDemand = this.getZoneDemand(cell.zoneType);
    if (zoneDemand < requirements.minDemand) {
      return false;
    }

    // Check power supply (simplified - assume always 100 for now)
    cell.powerSupply = 100;
    if (cell.powerSupply < requirements.minPowerSupply) {
      return false;
    }

    // Check water supply (simplified - assume always 100 for now)
    cell.waterSupply = 100;
    if (cell.waterSupply < requirements.minWaterSupply) {
      return false;
    }

    // Check traffic density
    if (cell.trafficDensity > requirements.maxTrafficDensity) {
      return false;
    }

    return true;
  }

  /**
   * Check if cell has road access
   */
  private hasRoadAccess(cell: Cell): boolean {
    const neighbors = this.grid.getNeighbors(cell.x, cell.y);
    return (
      (neighbors.north?.isRoad() ?? false) ||
      (neighbors.east?.isRoad() ?? false) ||
      (neighbors.south?.isRoad() ?? false) ||
      (neighbors.west?.isRoad() ?? false)
    );
  }

  /**
   * Get demand for a zone type
   */
  private getZoneDemand(zoneType: ZoneType): number {
    switch (zoneType) {
      case ZoneType.RESIDENTIAL:
        return this.demand.residential;
      case ZoneType.COMMERCIAL:
        return this.demand.commercial;
      case ZoneType.INDUSTRIAL:
        return this.demand.industrial;
      default:
        return 0;
    }
  }

  /**
   * Grow a building by one level
   */
  private growBuilding(cell: Cell): void {
    if (cell.buildingLevel >= BuildingStage.LARGE) return;

    cell.buildingLevel++;

    // Update cell properties based on new building
    const props = this.getBuildingProperties(cell.zoneType, cell.buildingLevel);
    cell.population = props.population;

    console.log(
      `Building grew to level ${cell.buildingLevel} at (${cell.x}, ${cell.y}) - ${cell.zoneType}`
    );
  }

  /**
   * Get building properties for a zone type and level
   */
  getBuildingProperties(zoneType: ZoneType, level: number): BuildingProperties {
    return BUILDING_PROPERTIES[zoneType][level as BuildingStage] || BUILDING_PROPERTIES[ZoneType.NONE][BuildingStage.EMPTY];
  }

  /**
   * Set demand factors (will be updated by DemandCalculator)
   */
  setDemand(demand: DemandFactors): void {
    this.demand = demand;
  }

  /**
   * Get current demand factors
   */
  getDemand(): DemandFactors {
    return { ...this.demand };
  }

  /**
   * Get city statistics
   */
  getStats() {
    return {
      ...this.cityStats,
      demand: this.getDemand(),
    };
  }
}
