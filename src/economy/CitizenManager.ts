/**
 * Manages all citizens in the city
 */

import { Grid } from '@/core/Grid';
import { Cell } from '@/core/Cell';
import { ZoneType } from '@/core/types';
import { Citizen } from './Citizen';
import { JobOffer, EmploymentStatus } from './types';
import { BUILDING_PROPERTIES, BuildingStage } from '@/buildings/types';

/**
 * CitizenManager handles citizen creation, job matching, and commuting
 */
export class CitizenManager {
  private grid: Grid;
  private citizens: Map<string, Citizen>;
  private updateInterval: number = 60; // Update every 60 ticks (about once per month)
  private ticksSinceUpdate: number = 0;

  // Track unemployment duration for each citizen
  private unemploymentDuration: Map<string, number> = new Map();
  private maxUnemploymentDuration: number = 180; // 3 months (3 * 60 ticks)
  private lowSatisfactionThreshold: number = 20; // Citizens below this may move away

  constructor(grid: Grid) {
    this.grid = grid;
    this.citizens = new Map();
  }

  /**
   * Update citizen system
   */
  update(): void {
    this.ticksSinceUpdate++;

    if (this.ticksSinceUpdate >= this.updateInterval) {
      this.ticksSinceUpdate = 0;
      this.updateCitizens();
    }
  }

  /**
   * Main citizen update logic
   */
  private updateCitizens(): void {
    // 1. Sync citizens with residential buildings
    this.syncCitizensWithHousing();

    // 2. Match unemployed citizens with available jobs
    this.matchCitizensToJobs();

    // 3. Track unemployment and handle emigration
    this.updateUnemploymentAndEmigration();

    // 4. Remove citizens from demolished buildings
    this.cleanupCitizens();
  }

  /**
   * Sync citizen count with residential building capacity
   */
  private syncCitizensWithHousing(): void {
    const residentialBuildings = this.getResidentialBuildings();

    for (const cell of residentialBuildings) {
      const location = { x: cell.x, y: cell.y };
      const capacity = cell.population; // Building capacity

      // Count citizens living at this location
      const residentsHere = Array.from(this.citizens.values()).filter(
        (c) => c.homeLocation?.x === location.x && c.homeLocation?.y === location.y
      );

      const currentCount = residentsHere.length;

      // Add citizens if under capacity
      if (currentCount < capacity) {
        const toAdd = capacity - currentCount;
        for (let i = 0; i < toAdd; i++) {
          const citizen = Citizen.createRandom(location);
          this.citizens.set(citizen.id, citizen);
        }
      }
      // Remove citizens if over capacity
      else if (currentCount > capacity) {
        const toRemove = currentCount - capacity;
        for (let i = 0; i < toRemove; i++) {
          if (residentsHere[i]) {
            this.removeCitizen(residentsHere[i].id);
          }
        }
      }
    }
  }

  /**
   * Match unemployed citizens to available jobs
   */
  private matchCitizensToJobs(): void {
    const jobOffers = this.getAvailableJobs();
    const unemployedCitizens = Array.from(this.citizens.values()).filter(
      (c) => c.needsJob()
    );

    // Simple matching: assign closest jobs first
    for (const citizen of unemployedCitizens) {
      if (jobOffers.length === 0) break;
      if (!citizen.homeLocation) continue;

      // Find closest job
      let closestJob: JobOffer | null = null;
      let minDistance = Infinity;

      for (const job of jobOffers) {
        const distance = Math.sqrt(
          Math.pow(citizen.homeLocation.x - job.location.x, 2) +
          Math.pow(citizen.homeLocation.y - job.location.y, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestJob = job;
        }
      }

      // Assign job
      if (closestJob) {
        citizen.assignJob(closestJob.location, closestJob.salary);
        closestJob.availablePositions--;

        if (closestJob.availablePositions <= 0) {
          const index = jobOffers.indexOf(closestJob);
          jobOffers.splice(index, 1);
        }
      }
    }
  }

  /**
   * Update unemployment duration and handle emigration
   */
  private updateUnemploymentAndEmigration(): void {
    const citizensToRemove: string[] = [];

    for (const [id, citizen] of this.citizens) {
      // Track unemployment duration
      if (citizen.employmentStatus === EmploymentStatus.UNEMPLOYED) {
        const duration = this.unemploymentDuration.get(id) || 0;
        this.unemploymentDuration.set(id, duration + this.updateInterval);

        // Long-term unemployed citizens move away
        if (duration >= this.maxUnemploymentDuration) {
          citizensToRemove.push(id);
          continue;
        }
      } else {
        // Reset unemployment duration if employed
        this.unemploymentDuration.delete(id);
      }

      // Citizens with very low satisfaction may move away
      if (citizen.satisfaction < this.lowSatisfactionThreshold) {
        // 10% chance per update cycle
        if (Math.random() < 0.1) {
          citizensToRemove.push(id);
        }
      }
    }

    // Remove emigrating citizens
    for (const id of citizensToRemove) {
      this.removeCitizen(id);
      this.unemploymentDuration.delete(id);
    }

    // Update building populations after emigration
    this.updateBuildingPopulations();
  }

  /**
   * Update building populations based on actual citizen count
   */
  private updateBuildingPopulations(): void {
    const residentialBuildings = this.getResidentialBuildings();

    for (const cell of residentialBuildings) {
      const location = { x: cell.x, y: cell.y };

      // Count citizens living at this location
      const residentsHere = Array.from(this.citizens.values()).filter(
        (c) => c.homeLocation?.x === location.x && c.homeLocation?.y === location.y
      );

      // Update cell population to reflect actual residents
      cell.population = residentsHere.length;
    }
  }

  /**
   * Remove citizens from demolished buildings
   */
  private cleanupCitizens(): void {
    const citizensToRemove: string[] = [];

    for (const [id, citizen] of this.citizens) {
      // Check if home still exists
      if (citizen.homeLocation) {
        const cell = this.grid.getCell(citizen.homeLocation.x, citizen.homeLocation.y);
        if (!cell || cell.zoneType !== ZoneType.RESIDENTIAL || cell.buildingLevel === 0) {
          citizensToRemove.push(id);
          continue;
        }
      }

      // Check if work location still exists
      if (citizen.workLocation) {
        const cell = this.grid.getCell(citizen.workLocation.x, citizen.workLocation.y);
        if (
          !cell ||
          (cell.zoneType !== ZoneType.COMMERCIAL && cell.zoneType !== ZoneType.INDUSTRIAL) ||
          cell.buildingLevel === 0
        ) {
          // Job was demolished, citizen becomes unemployed
          citizen.removeJob();
        }
      }
    }

    // Remove homeless citizens
    for (const id of citizensToRemove) {
      this.removeCitizen(id);
    }
  }

  /**
   * Get all residential buildings
   */
  private getResidentialBuildings(): Cell[] {
    return this.grid
      .getAllCells()
      .filter((c) => c.zoneType === ZoneType.RESIDENTIAL && c.buildingLevel > 0);
  }

  /**
   * Get available job offers
   */
  private getAvailableJobs(): JobOffer[] {
    const jobs: JobOffer[] = [];
    const cells = this.grid.getAllCells();

    for (const cell of cells) {
      if (
        (cell.zoneType === ZoneType.COMMERCIAL || cell.zoneType === ZoneType.INDUSTRIAL) &&
        cell.buildingLevel > 0
      ) {
        const props = BUILDING_PROPERTIES[cell.zoneType][cell.buildingLevel as BuildingStage];
        const totalJobs = props.jobs;

        // Count current employees at this location
        const employeesHere = Array.from(this.citizens.values()).filter(
          (c) => c.workLocation?.x === cell.x && c.workLocation?.y === cell.y
        ).length;

        const available = totalJobs - employeesHere;

        if (available > 0) {
          jobs.push({
            location: { x: cell.x, y: cell.y },
            availablePositions: available,
            salary: cell.zoneType === ZoneType.COMMERCIAL ? 1200 : 1000, // Commercial pays more
          });
        }
      }
    }

    return jobs;
  }

  /**
   * Remove a citizen
   */
  private removeCitizen(id: string): void {
    this.citizens.delete(id);
    this.unemploymentDuration.delete(id);
  }

  /**
   * Get all citizens
   */
  getCitizens(): Citizen[] {
    return Array.from(this.citizens.values());
  }

  /**
   * Get citizen statistics
   */
  getStats() {
    const citizens = Array.from(this.citizens.values());

    const employed = citizens.filter((c) => c.employmentStatus === EmploymentStatus.EMPLOYED).length;
    const unemployed = citizens.filter((c) => c.employmentStatus === EmploymentStatus.UNEMPLOYED).length;
    const retired = citizens.filter((c) => c.employmentStatus === EmploymentStatus.RETIRED).length;

    const totalJobs = this.getAvailableJobs().reduce(
      (sum, job) => sum + job.availablePositions,
      0
    );

    const workingAge = citizens.length - retired;
    const unemploymentRate = workingAge > 0 ? (unemployed / workingAge) * 100 : 0;

    return {
      totalCitizens: citizens.length,
      employedCitizens: employed,
      unemployedCitizens: unemployed,
      retiredCitizens: retired,
      availableJobs: totalJobs,
      unemploymentRate,
      averageSatisfaction: citizens.reduce((sum, c) => sum + c.satisfaction, 0) / Math.max(1, citizens.length),
    };
  }
}
