/**
 * Public transit system type definitions
 */

import { Position } from '@/core/types';

/**
 * Transit types
 */
export enum TransitType {
  BUS = 'bus',
  SUBWAY = 'subway',
  TRAM = 'tram',
}

/**
 * Transit stop/station
 */
export interface TransitStop {
  id: string;
  position: Position;
  type: TransitType;
  name: string;
  passengers: number;           // Current waiting passengers
}

/**
 * Transit route
 */
export interface TransitRoute {
  id: string;
  name: string;
  type: TransitType;
  stops: string[];              // Stop IDs in order
  color: string;                // Route color for visualization
  frequency: number;            // Minutes between vehicles
  isLoop: boolean;              // Whether route loops back to start
}

/**
 * Transit vehicle
 */
export interface TransitVehicle {
  id: string;
  routeId: string;
  type: TransitType;
  currentStopIndex: number;     // Current position in route
  nextStopIndex: number;        // Next stop to visit
  position: Position;           // Current world position
  passengers: number;           // Current passenger count
  capacity: number;             // Maximum capacity
  speed: number;                // Current speed
  progress: number;             // Progress to next stop (0-1)
}

/**
 * Transit statistics
 */
export interface TransitStats {
  totalRoutes: number;
  totalStops: number;
  totalVehicles: number;
  totalPassengers: number;
  averageWaitTime: number;      // Average wait time in ticks
  ridership: number;            // Total riders per month
  coverage: number;             // Percentage of city covered (0-100)
}

/**
 * Vehicle capacity by type
 */
export const VEHICLE_CAPACITY: Record<TransitType, number> = {
  [TransitType.BUS]: 40,
  [TransitType.SUBWAY]: 150,
  [TransitType.TRAM]: 80,
};

/**
 * Vehicle speed by type (cells per tick)
 */
export const VEHICLE_SPEED: Record<TransitType, number> = {
  [TransitType.BUS]: 0.5,
  [TransitType.SUBWAY]: 1.0,
  [TransitType.TRAM]: 0.7,
};

/**
 * Construction costs
 */
export const TRANSIT_COSTS = {
  busStop: 5000,
  subwayStation: 50000,
  tramStation: 20000,
  busVehicle: 100000,
  subwayVehicle: 500000,
  tramVehicle: 300000,
};
