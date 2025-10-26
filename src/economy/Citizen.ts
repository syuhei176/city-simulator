/**
 * Citizen agent class
 */

import { Position } from '@/core/types';
import { AgeGroup, EmploymentStatus, CitizenData, CommuteState } from './types';

/**
 * Represents a single citizen in the city
 */
export class Citizen {
  public id: string;
  public age: AgeGroup;
  public employmentStatus: EmploymentStatus;
  public homeLocation: Position | null;
  public workLocation: Position | null;
  public income: number;
  public satisfaction: number;
  public commuteState: CommuteState;
  public vehicleId: string | null;

  private static nextId = 0;

  constructor(
    age: AgeGroup = AgeGroup.YOUNG,
    homeLocation: Position | null = null
  ) {
    this.id = `citizen_${Citizen.nextId++}`;
    this.age = age;
    this.employmentStatus = age === AgeGroup.SENIOR
      ? EmploymentStatus.RETIRED
      : EmploymentStatus.UNEMPLOYED;
    this.homeLocation = homeLocation;
    this.workLocation = null;
    this.income = 0;
    this.satisfaction = 50; // Start neutral
    this.commuteState = CommuteState.AT_HOME;
    this.vehicleId = null;
  }

  /**
   * Assign a job to this citizen
   */
  assignJob(location: Position, salary: number): void {
    if (this.employmentStatus === EmploymentStatus.RETIRED) return;

    this.workLocation = location;
    this.employmentStatus = EmploymentStatus.EMPLOYED;
    this.income = salary;
    this.updateSatisfaction();
  }

  /**
   * Remove job from this citizen
   */
  removeJob(): void {
    if (this.employmentStatus === EmploymentStatus.RETIRED) return;

    this.workLocation = null;
    this.employmentStatus = EmploymentStatus.UNEMPLOYED;
    this.income = 0;
    this.updateSatisfaction();
  }

  /**
   * Assign a home to this citizen
   */
  assignHome(location: Position): void {
    this.homeLocation = location;
    this.updateSatisfaction();
  }

  /**
   * Remove home from this citizen
   */
  removeHome(): void {
    this.homeLocation = null;
    this.updateSatisfaction();
  }

  /**
   * Update citizen satisfaction based on current state
   */
  private updateSatisfaction(): void {
    let satisfaction = 50; // Base

    // Has home
    if (this.homeLocation) {
      satisfaction += 20;
    } else {
      satisfaction -= 30;
    }

    // Has job (if working age)
    if (this.age !== AgeGroup.SENIOR) {
      if (this.employmentStatus === EmploymentStatus.EMPLOYED) {
        satisfaction += 20;
      } else {
        satisfaction -= 20;
      }
    }

    // Income level
    if (this.income > 0) {
      satisfaction += Math.min(10, this.income / 100);
    }

    // Commute distance (if both home and work exist)
    if (this.homeLocation && this.workLocation) {
      const distance = Math.sqrt(
        Math.pow(this.homeLocation.x - this.workLocation.x, 2) +
        Math.pow(this.homeLocation.y - this.workLocation.y, 2)
      );

      // Penalty for long commutes
      if (distance > 50) {
        satisfaction -= 10;
      } else if (distance > 100) {
        satisfaction -= 20;
      }
    }

    this.satisfaction = Math.max(0, Math.min(100, satisfaction));
  }

  /**
   * Check if citizen needs a job
   */
  needsJob(): boolean {
    return (
      this.age !== AgeGroup.SENIOR &&
      this.employmentStatus === EmploymentStatus.UNEMPLOYED
    );
  }

  /**
   * Check if citizen needs a home
   */
  needsHome(): boolean {
    return this.homeLocation === null;
  }

  /**
   * Check if citizen should commute (has both home and work)
   */
  canCommute(): boolean {
    return (
      this.homeLocation !== null &&
      this.workLocation !== null &&
      this.employmentStatus === EmploymentStatus.EMPLOYED
    );
  }

  /**
   * Start commute to work
   */
  startCommuteToWork(vehicleId: string): void {
    this.commuteState = CommuteState.COMMUTING_TO_WORK;
    this.vehicleId = vehicleId;
  }

  /**
   * Arrive at work
   */
  arriveAtWork(): void {
    this.commuteState = CommuteState.AT_WORK;
    this.vehicleId = null;
  }

  /**
   * Start commute to home
   */
  startCommuteToHome(vehicleId: string): void {
    this.commuteState = CommuteState.COMMUTING_TO_HOME;
    this.vehicleId = vehicleId;
  }

  /**
   * Arrive at home
   */
  arriveAtHome(): void {
    this.commuteState = CommuteState.AT_HOME;
    this.vehicleId = null;
  }

  /**
   * Get citizen data
   */
  getData(): CitizenData {
    return {
      id: this.id,
      age: this.age,
      employmentStatus: this.employmentStatus,
      homeLocation: this.homeLocation,
      workLocation: this.workLocation,
      income: this.income,
      satisfaction: this.satisfaction,
    };
  }

  /**
   * Create a random citizen
   */
  static createRandom(homeLocation: Position | null = null): Citizen {
    const rand = Math.random();
    let age: AgeGroup;

    if (rand < 0.3) {
      age = AgeGroup.YOUNG;
    } else if (rand < 0.8) {
      age = AgeGroup.MIDDLE;
    } else {
      age = AgeGroup.SENIOR;
    }

    return new Citizen(age, homeLocation);
  }
}
