import { Position } from '@/core/types';

/**
 * Traffic light states
 */
export enum TrafficLightState {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
}

/**
 * Intersection type
 */
export enum IntersectionType {
  SIMPLE = 'simple', // 2-way
  T_JUNCTION = 't_junction', // 3-way
  CROSS = 'cross', // 4-way
  ROUNDABOUT = 'roundabout',
}

/**
 * Intersection manages traffic flow at connection points
 */
export class Intersection {
  public readonly id: string;
  public readonly position: Position;
  public readonly type: IntersectionType;

  private trafficLights: Map<string, TrafficLightState>;
  private currentPhase: number = 0;
  private phaseTimer: number = 0;
  private phaseDuration: number = 60; // ticks per phase

  constructor(id: string, position: Position, type: IntersectionType) {
    this.id = id;
    this.position = position;
    this.type = type;
    this.trafficLights = new Map();
  }

  /**
   * Update intersection state
   */
  update(): void {
    if (this.type === IntersectionType.ROUNDABOUT) {
      // Roundabouts don't need traffic lights
      return;
    }

    this.phaseTimer++;

    if (this.phaseTimer >= this.phaseDuration) {
      this.phaseTimer = 0;
      this.nextPhase();
    }
  }

  /**
   * Move to next traffic light phase
   */
  private nextPhase(): void {
    if (this.type === IntersectionType.CROSS) {
      // 4-way intersection: alternate between NS and EW
      this.currentPhase = (this.currentPhase + 1) % 2;
      this.updateCrossLights();
    } else if (this.type === IntersectionType.T_JUNCTION) {
      this.currentPhase = (this.currentPhase + 1) % 2;
      this.updateTJunctionLights();
    }
  }

  /**
   * Update lights for cross intersection
   */
  private updateCrossLights(): void {
    if (this.currentPhase === 0) {
      // North-South green
      this.trafficLights.set('north', TrafficLightState.GREEN);
      this.trafficLights.set('south', TrafficLightState.GREEN);
      this.trafficLights.set('east', TrafficLightState.RED);
      this.trafficLights.set('west', TrafficLightState.RED);
    } else {
      // East-West green
      this.trafficLights.set('north', TrafficLightState.RED);
      this.trafficLights.set('south', TrafficLightState.RED);
      this.trafficLights.set('east', TrafficLightState.GREEN);
      this.trafficLights.set('west', TrafficLightState.GREEN);
    }
  }

  /**
   * Update lights for T-junction
   */
  private updateTJunctionLights(): void {
    // Simple alternating pattern for T-junction
    // Implementation depends on which directions are connected
  }

  /**
   * Get traffic light state for a direction
   */
  getLightState(direction: string): TrafficLightState {
    return this.trafficLights.get(direction) || TrafficLightState.RED;
  }

  /**
   * Check if vehicle can pass from a direction
   */
  canPass(direction: string): boolean {
    if (this.type === IntersectionType.ROUNDABOUT) {
      return true; // Roundabouts always allow flow
    }

    const state = this.getLightState(direction);
    return state === TrafficLightState.GREEN;
  }

  /**
   * Get intersection capacity
   */
  getCapacity(): number {
    switch (this.type) {
      case IntersectionType.SIMPLE:
        return 10;
      case IntersectionType.T_JUNCTION:
        return 15;
      case IntersectionType.CROSS:
        return 20;
      case IntersectionType.ROUNDABOUT:
        return 30;
      default:
        return 10;
    }
  }

  /**
   * Determine intersection type from connection count
   */
  static determineType(connectionCount: number): IntersectionType {
    switch (connectionCount) {
      case 2:
        return IntersectionType.SIMPLE;
      case 3:
        return IntersectionType.T_JUNCTION;
      case 4:
        return IntersectionType.CROSS;
      default:
        return IntersectionType.SIMPLE;
    }
  }
}
