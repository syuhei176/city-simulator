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

    // Progress along the path (simplified - move one node per tick)
    this.currentPathIndex++;

    // Check if reached destination
    if (this.currentPathIndex >= this.path.nodes.length) {
      this.state = CommuteState.AT_WORK;
      return true;
    }

    return false;
  }

  /**
   * Get current edge being traveled
   */
  getCurrentEdge(): { from: string; to: string } | null {
    if (!this.path || this.state !== CommuteState.COMMUTING) {
      return null;
    }

    if (this.currentPathIndex >= this.path.nodes.length - 1) {
      return null;
    }

    return {
      from: this.path.nodes[this.currentPathIndex],
      to: this.path.nodes[this.currentPathIndex + 1],
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
