/**
 * Commuter class - represents a citizen commuting to work
 */

import { Position } from '@/core/types';
import { Path } from '@/transport/types';

export enum CommuteState {
  WAITING = 'waiting',      // Waiting to start commute
  COMMUTING = 'commuting',  // Currently commuting
  AT_WORK = 'at_work',      // At work location
  FAILED = 'failed',        // Failed to commute (too long)
}

/**
 * Represents a citizen's commute to work
 */
export class Commuter {
  public citizenId: string;
  public homeLocation: Position;
  public workLocation: Position;
  public state: CommuteState;
  public path: Path | null;
  public currentPathIndex: number;
  public commuteTime: number; // Actual time taken (in ticks)
  public maxCommuteTime: number; // Maximum allowed commute time
  public baseSpeed: number; // Base movement speed (nodes per tick)
  public currentSpeed: number; // Current speed (affected by congestion)

  constructor(
    citizenId: string,
    homeLocation: Position,
    workLocation: Position,
    maxCommuteTime: number = 300 // Default: 300 ticks
  ) {
    this.citizenId = citizenId;
    this.homeLocation = homeLocation;
    this.workLocation = workLocation;
    this.state = CommuteState.WAITING;
    this.path = null;
    this.currentPathIndex = 0;
    this.commuteTime = 0;
    this.maxCommuteTime = maxCommuteTime;
    this.baseSpeed = 0.5; // Default: 0.5 nodes per tick (2 ticks per node)
    this.currentSpeed = this.baseSpeed;
  }

  /**
   * Start commuting with the given path
   */
  startCommute(path: Path): void {
    if (!path.exists) {
      this.state = CommuteState.FAILED;
      return;
    }

    this.path = path;
    this.currentPathIndex = 0;
    this.commuteTime = 0;
    this.state = CommuteState.COMMUTING;
  }

  /**
   * Update commute progress
   * @returns true if commute is complete or failed
   */
  update(): boolean {
    if (this.state !== CommuteState.COMMUTING) {
      return this.state !== CommuteState.WAITING;
    }

    if (!this.path) {
      this.state = CommuteState.FAILED;
      return true;
    }

    this.commuteTime++;

    // Check if commute time exceeded
    if (this.commuteTime > this.maxCommuteTime) {
      this.state = CommuteState.FAILED;
      return true;
    }

    // Progress along the path based on current speed
    // Speed is affected by congestion (set by CommuteManager)
    this.currentPathIndex += this.currentSpeed;

    // Check if reached destination
    if (this.currentPathIndex >= this.path.nodes.length - 1) {
      this.state = CommuteState.AT_WORK;
      return true;
    }

    return false;
  }

  /**
   * Set current speed (for congestion simulation)
   */
  setSpeed(speed: number): void {
    this.currentSpeed = Math.max(0, speed);
  }

  /**
   * Reset speed to base speed
   */
  resetSpeed(): void {
    this.currentSpeed = this.baseSpeed;
  }

  /**
   * Get current edge being traveled
   */
  getCurrentEdge(): { from: string; to: string } | null {
    if (!this.path || this.state !== CommuteState.COMMUTING) {
      return null;
    }

    const currentNodeIndex = Math.floor(this.currentPathIndex);
    if (currentNodeIndex >= this.path.nodes.length - 1) {
      return null;
    }

    return {
      from: this.path.nodes[currentNodeIndex],
      to: this.path.nodes[currentNodeIndex + 1],
    };
  }

  /**
   * Check if commute failed
   */
  hasFailed(): boolean {
    return this.state === CommuteState.FAILED;
  }

  /**
   * Check if commute succeeded
   */
  hasSucceeded(): boolean {
    return this.state === CommuteState.AT_WORK;
  }
}
