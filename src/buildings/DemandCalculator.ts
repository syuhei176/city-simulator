import { Grid } from '@/core/Grid';
import { ZoneType } from '@/core/types';
import { DemandFactors, BUILDING_PROPERTIES, BuildingStage } from './types';

/**
 * Calculates demand for different zone types based on city state
 */
export class DemandCalculator {
  private grid: Grid;
  private updateInterval: number = 30; // Update every 30 ticks
  private ticksSinceUpdate: number = 0;

  private demand: DemandFactors = {
    residential: 50,
    commercial: 50,
    industrial: 50,
  };

  constructor(grid: Grid) {
    this.grid = grid;
  }

  /**
   * Update demand calculations
   */
  update(): void {
    this.ticksSinceUpdate++;

    if (this.ticksSinceUpdate >= this.updateInterval) {
      this.ticksSinceUpdate = 0;
      this.calculateDemand();
    }
  }

  /**
   * Calculate demand for all zone types
   */
  private calculateDemand(): void {
    const stats = this.calculateCityStats();

    // Residential demand based on job availability
    this.demand.residential = this.calculateResidentialDemand(stats);

    // Commercial demand based on population and industrial output
    this.demand.commercial = this.calculateCommercialDemand(stats);

    // Industrial demand based on population and commercial demand
    this.demand.industrial = this.calculateIndustrialDemand(stats);

    // Clamp all values to 0-100
    this.demand.residential = this.clamp(this.demand.residential, 0, 100);
    this.demand.commercial = this.clamp(this.demand.commercial, 0, 100);
    this.demand.industrial = this.clamp(this.demand.industrial, 0, 100);
  }

  /**
   * Calculate city statistics
   */
  private calculateCityStats() {
    const cells = this.grid.getAllCells();

    const stats = {
      residentialZones: 0,
      commercialZones: 0,
      industrialZones: 0,
      totalPopulation: 0,
      totalJobs: 0,
      commercialJobs: 0,
      industrialJobs: 0,
      residentialBuildings: 0,
      commercialBuildings: 0,
      industrialBuildings: 0,
    };

    for (const cell of cells) {
      // Count zones
      if (cell.zoneType === ZoneType.RESIDENTIAL) stats.residentialZones++;
      if (cell.zoneType === ZoneType.COMMERCIAL) stats.commercialZones++;
      if (cell.zoneType === ZoneType.INDUSTRIAL) stats.industrialZones++;

      // Count buildings and calculate totals
      if (cell.buildingLevel > 0) {
        const props = BUILDING_PROPERTIES[cell.zoneType][cell.buildingLevel as BuildingStage];

        if (cell.zoneType === ZoneType.RESIDENTIAL) {
          stats.residentialBuildings++;
          stats.totalPopulation += props.population;
        } else if (cell.zoneType === ZoneType.COMMERCIAL) {
          stats.commercialBuildings++;
          stats.totalPopulation += props.population;
          stats.totalJobs += props.jobs;
          stats.commercialJobs += props.jobs;
        } else if (cell.zoneType === ZoneType.INDUSTRIAL) {
          stats.industrialBuildings++;
          stats.totalPopulation += props.population;
          stats.totalJobs += props.jobs;
          stats.industrialJobs += props.jobs;
        }
      }
    }

    return stats;
  }

  /**
   * Calculate residential demand
   * High when: Many jobs available, low when: Unemployment is low
   */
  private calculateResidentialDemand(stats: any): number {
    let demand = 50; // Base demand

    // Calculate workers (60% of residential population works)
    const workers = stats.totalPopulation * 0.6;
    const jobRatio = workers > 0 ? stats.totalJobs / workers : 1;

    // More jobs = more demand for residential
    if (jobRatio > 1.2) {
      // Lots of jobs available
      demand += 30;
    } else if (jobRatio > 1.0) {
      demand += 20;
    } else if (jobRatio < 0.8) {
      // Not enough jobs
      demand -= 20;
    }

    // If we have many residential zones without buildings, reduce demand
    const residentialOccupancy =
      stats.residentialZones > 0
        ? stats.residentialBuildings / stats.residentialZones
        : 1;

    if (residentialOccupancy < 0.3) {
      // Too many empty zones
      demand -= 20;
    }

    // Starting boost - always some demand early game
    if (stats.totalPopulation < 100) {
      demand += 20;
    }

    return demand;
  }

  /**
   * Calculate commercial demand
   * High when: Population grows, low when: Not enough customers
   */
  private calculateCommercialDemand(stats: any): number {
    let demand = 50; // Base demand

    // Population drives commercial demand
    const popPerCommercial =
      stats.commercialBuildings > 0
        ? stats.totalPopulation / stats.commercialBuildings
        : Infinity;

    if (popPerCommercial > 100) {
      // High population per commercial building
      demand += 30;
    } else if (popPerCommercial > 50) {
      demand += 20;
    } else if (popPerCommercial < 20) {
      // Too many commercial buildings
      demand -= 20;
    }

    // Commercial needs workers
    const workers = stats.totalPopulation * 0.6;
    if (workers < stats.commercialJobs * 0.8) {
      // Not enough workers for commercial
      demand -= 15;
    }

    // If we have many commercial zones without buildings, reduce demand
    const commercialOccupancy =
      stats.commercialZones > 0
        ? stats.commercialBuildings / stats.commercialZones
        : 1;

    if (commercialOccupancy < 0.3) {
      demand -= 20;
    }

    // Early game boost
    if (stats.totalPopulation > 50 && stats.commercialBuildings < 5) {
      demand += 15;
    }

    return demand;
  }

  /**
   * Calculate industrial demand
   * High when: Population grows and commercial needs goods
   */
  private calculateIndustrialDemand(stats: any): number {
    let demand = 50; // Base demand

    // Industrial provides jobs and goods for commercial
    const popPerIndustrial =
      stats.industrialBuildings > 0
        ? stats.totalPopulation / stats.industrialBuildings
        : Infinity;

    if (popPerIndustrial > 80) {
      demand += 25;
    } else if (popPerIndustrial > 40) {
      demand += 15;
    } else if (popPerIndustrial < 15) {
      demand -= 20;
    }

    // Industrial needs workers
    const workers = stats.totalPopulation * 0.6;
    if (workers < stats.industrialJobs * 0.8) {
      demand -= 15;
    }

    // Commercial-Industrial balance
    const commercialToIndustrial =
      stats.industrialBuildings > 0
        ? stats.commercialBuildings / stats.industrialBuildings
        : 1;

    if (commercialToIndustrial > 2) {
      // Need more industry to support commercial
      demand += 20;
    } else if (commercialToIndustrial < 0.5) {
      // Too much industry
      demand -= 15;
    }

    // If we have many industrial zones without buildings, reduce demand
    const industrialOccupancy =
      stats.industrialZones > 0
        ? stats.industrialBuildings / stats.industrialZones
        : 1;

    if (industrialOccupancy < 0.3) {
      demand -= 20;
    }

    // Early game boost
    if (stats.totalPopulation > 20 && stats.industrialBuildings < 3) {
      demand += 15;
    }

    return demand;
  }

  /**
   * Get current demand
   */
  getDemand(): DemandFactors {
    return { ...this.demand };
  }

  /**
   * Clamp a value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
