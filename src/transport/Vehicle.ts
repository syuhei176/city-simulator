import { Position } from '@/core/types';
import { Path } from '@/transport/types';

/**
 * Vehicle state
 */
export enum VehicleState {
  MOVING = 'moving',
  STOPPED = 'stopped',
  WAITING = 'waiting',
  ARRIVED = 'arrived',
}

/**
 * Vehicle type
 */
export enum VehicleType {
  CAR = 'car',
  BUS = 'bus',
  TRUCK = 'truck',
}

/**
 * Vehicle class representing a single vehicle in the simulation
 */
export class Vehicle {
  public readonly id: string;
  public readonly type: VehicleType;

  // Position and movement
  public position: Position;
  public targetPosition: Position;
  public destination: Position;
  public path: Path | null = null;
  public currentPathIndex: number = 0;

  // State
  public state: VehicleState = VehicleState.MOVING;
  public speed: number = 0; // Current speed (cells per tick)
  public maxSpeed: number = 1.0; // Maximum speed

  // Traffic behavior
  public waitTime: number = 0;
  public totalTravelTime: number = 0;
  public distanceTraveled: number = 0;

  constructor(
    id: string,
    type: VehicleType,
    start: Position,
    destination: Position
  ) {
    this.id = id;
    this.type = type;
    this.position = { ...start };
    this.targetPosition = { ...start };
    this.destination = { ...destination };

    // Set max speed based on vehicle type
    switch (type) {
      case VehicleType.CAR:
        this.maxSpeed = 2.0;
        break;
      case VehicleType.BUS:
        this.maxSpeed = 1.5;
        break;
      case VehicleType.TRUCK:
        this.maxSpeed = 1.2;
        break;
    }
  }

  /**
   * Set the path for this vehicle
   */
  setPath(path: Path): void {
    this.path = path;
    this.currentPathIndex = 0;
    if (path.nodes.length > 0) {
      this.state = VehicleState.MOVING;
    }
  }

  /**
   * Update vehicle position and state
   */
  update(_cellSize: number): void {
    if (!this.path || this.state === VehicleState.ARRIVED) {
      return;
    }

    this.totalTravelTime++;

    if (this.state === VehicleState.WAITING) {
      this.waitTime++;
      return;
    }

    // Move towards target position
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.1) {
      // Reached target, move to next node
      this.currentPathIndex++;

      if (this.currentPathIndex >= this.path.nodes.length) {
        // Reached destination
        this.state = VehicleState.ARRIVED;
        this.speed = 0;
        return;
      }

      // Get next target from path
      const nextNodeId = this.path.nodes[this.currentPathIndex];
      const [x, y] = nextNodeId.split(',').map(Number);
      this.targetPosition = { x, y };
    } else {
      // Move towards target
      const moveSpeed = Math.min(this.speed, distance);
      this.position.x += (dx / distance) * moveSpeed;
      this.position.y += (dy / distance) * moveSpeed;
      this.distanceTraveled += moveSpeed;
    }
  }

  /**
   * Accelerate vehicle
   */
  accelerate(amount: number): void {
    this.speed = Math.min(this.speed + amount, this.maxSpeed);
  }

  /**
   * Decelerate vehicle
   */
  decelerate(amount: number): void {
    this.speed = Math.max(this.speed - amount, 0);
  }

  /**
   * Stop vehicle
   */
  stop(): void {
    this.speed = 0;
    this.state = VehicleState.STOPPED;
  }

  /**
   * Resume vehicle movement
   */
  resume(): void {
    if (this.state === VehicleState.STOPPED || this.state === VehicleState.WAITING) {
      this.state = VehicleState.MOVING;
    }
  }

  /**
   * Check if vehicle has arrived
   */
  hasArrived(): boolean {
    return this.state === VehicleState.ARRIVED;
  }

  /**
   * Get current cell position
   */
  getCellPosition(): Position {
    return {
      x: Math.floor(this.position.x),
      y: Math.floor(this.position.y),
    };
  }

  /**
   * Get vehicle color based on type
   */
  getColor(): string {
    switch (this.type) {
      case VehicleType.CAR:
        return '#ffff00'; // Yellow
      case VehicleType.BUS:
        return '#00ff00'; // Green
      case VehicleType.TRUCK:
        return '#ff8800'; // Orange
      default:
        return '#ffffff';
    }
  }

  /**
   * Get average speed
   */
  getAverageSpeed(): number {
    if (this.totalTravelTime === 0) return 0;
    return this.distanceTraveled / this.totalTravelTime;
  }

  /**
   * Get congestion level (0-100)
   */
  getCongestionLevel(): number {
    const idealSpeed = this.maxSpeed;
    const actualSpeed = this.speed;
    return Math.round((1 - actualSpeed / idealSpeed) * 100);
  }
}
