/**
 * Manages public transit system
 */

import { Grid } from '@/core/Grid';
import { Position } from '@/core/types';
import {
  TransitType,
  TransitStop,
  TransitRoute,
  TransitVehicle,
  TransitStats,
  VEHICLE_CAPACITY,
  VEHICLE_SPEED,
} from './types';

/**
 * TransitManager handles all public transit operations
 */
export class TransitManager {
  private grid: Grid;
  private stops: Map<string, TransitStop>;
  private routes: Map<string, TransitRoute>;
  private vehicles: Map<string, TransitVehicle>;

  private nextStopId = 0;
  private nextRouteId = 0;
  private nextVehicleId = 0;

  // Statistics
  private totalRidership = 0;
  private averageWaitTime = 0;

  constructor(grid: Grid) {
    this.grid = grid;
    this.stops = new Map();
    this.routes = new Map();
    this.vehicles = new Map();
  }

  /**
   * Add a transit stop
   */
  addStop(position: Position, type: TransitType, name?: string): TransitStop | null {
    // Check if stop already exists at this position
    for (const stop of this.stops.values()) {
      if (stop.position.x === position.x && stop.position.y === position.y) {
        return null; // Stop already exists
      }
    }

    // Check if position is valid (on a road for bus, etc.)
    const cell = this.grid.getCell(position.x, position.y);
    if (!cell) return null;

    if (type === TransitType.BUS && !cell.isRoad()) {
      return null; // Bus stops must be on roads
    }

    const stop: TransitStop = {
      id: `stop_${this.nextStopId++}`,
      position: { ...position },
      type,
      name: name || `${type} Stop ${this.nextStopId}`,
      passengers: 0,
    };

    this.stops.set(stop.id, stop);
    console.log(`Transit stop created: ${stop.name} at (${position.x}, ${position.y})`);
    return stop;
  }

  /**
   * Remove a transit stop
   */
  removeStop(stopId: string): boolean {
    // Check if stop is used in any route
    for (const route of this.routes.values()) {
      if (route.stops.includes(stopId)) {
        console.warn(`Cannot remove stop ${stopId}: used in route ${route.name}`);
        return false;
      }
    }

    return this.stops.delete(stopId);
  }

  /**
   * Create a transit route
   */
  createRoute(
    name: string,
    type: TransitType,
    stopIds: string[],
    color: string = '#0088ff',
    frequency: number = 10,
    isLoop: boolean = true
  ): TransitRoute | null {
    // Validate stops
    if (stopIds.length < 2) {
      console.error('Route must have at least 2 stops');
      return null;
    }

    for (const stopId of stopIds) {
      const stop = this.stops.get(stopId);
      if (!stop) {
        console.error(`Invalid stop ID: ${stopId}`);
        return null;
      }
      if (stop.type !== type) {
        console.error(`Stop ${stopId} type mismatch`);
        return null;
      }
    }

    const route: TransitRoute = {
      id: `route_${this.nextRouteId++}`,
      name,
      type,
      stops: [...stopIds],
      color,
      frequency,
      isLoop,
    };

    this.routes.set(route.id, route);
    console.log(`Transit route created: ${name} with ${stopIds.length} stops`);

    // Spawn initial vehicle
    this.spawnVehicle(route.id);

    return route;
  }

  /**
   * Remove a transit route
   */
  removeRoute(routeId: string): boolean {
    // Remove all vehicles on this route
    for (const [vehicleId, vehicle] of this.vehicles) {
      if (vehicle.routeId === routeId) {
        this.vehicles.delete(vehicleId);
      }
    }

    return this.routes.delete(routeId);
  }

  /**
   * Spawn a vehicle on a route
   */
  private spawnVehicle(routeId: string): TransitVehicle | null {
    const route = this.routes.get(routeId);
    if (!route || route.stops.length === 0) return null;

    const firstStop = this.stops.get(route.stops[0]);
    if (!firstStop) return null;

    const vehicle: TransitVehicle = {
      id: `vehicle_${this.nextVehicleId++}`,
      routeId,
      type: route.type,
      currentStopIndex: 0,
      nextStopIndex: 1,
      position: { ...firstStop.position },
      passengers: 0,
      capacity: VEHICLE_CAPACITY[route.type],
      speed: VEHICLE_SPEED[route.type],
      progress: 0,
    };

    this.vehicles.set(vehicle.id, vehicle);
    return vehicle;
  }

  /**
   * Update transit system
   */
  update(): void {
    // Update all vehicles
    for (const vehicle of this.vehicles.values()) {
      this.updateVehicle(vehicle);
    }
  }

  /**
   * Update a single vehicle
   */
  private updateVehicle(vehicle: TransitVehicle): void {
    const route = this.routes.get(vehicle.routeId);
    if (!route) return;

    const currentStop = this.stops.get(route.stops[vehicle.currentStopIndex]);
    const nextStop = this.stops.get(route.stops[vehicle.nextStopIndex]);

    if (!currentStop || !nextStop) return;

    // Move towards next stop
    vehicle.progress += vehicle.speed / 10; // Normalize speed

    if (vehicle.progress >= 1.0) {
      // Reached next stop
      vehicle.progress = 0;
      vehicle.currentStopIndex = vehicle.nextStopIndex;
      vehicle.position = { ...nextStop.position };

      // Pick up/drop off passengers
      this.handlePassengers(vehicle, nextStop);

      // Determine next stop
      if (vehicle.currentStopIndex >= route.stops.length - 1) {
        if (route.isLoop) {
          vehicle.nextStopIndex = 0;
        } else {
          // Reverse direction
          vehicle.nextStopIndex = vehicle.currentStopIndex - 1;
        }
      } else {
        vehicle.nextStopIndex = vehicle.currentStopIndex + 1;
      }
    } else {
      // Interpolate position
      vehicle.position.x = currentStop.position.x +
        (nextStop.position.x - currentStop.position.x) * vehicle.progress;
      vehicle.position.y = currentStop.position.y +
        (nextStop.position.y - currentStop.position.y) * vehicle.progress;
    }
  }

  /**
   * Handle passenger boarding/alighting
   */
  private handlePassengers(vehicle: TransitVehicle, stop: TransitStop): void {
    // Drop off some passengers (simplified)
    const alighting = Math.floor(vehicle.passengers * 0.3);
    vehicle.passengers -= alighting;

    // Pick up waiting passengers
    const availableSpace = vehicle.capacity - vehicle.passengers;
    const boarding = Math.min(stop.passengers, availableSpace);
    vehicle.passengers += boarding;
    stop.passengers -= boarding;

    this.totalRidership += boarding;
  }

  /**
   * Add waiting passengers to a stop
   */
  addPassengersToStop(stopId: string, count: number): void {
    const stop = this.stops.get(stopId);
    if (stop) {
      stop.passengers += count;
    }
  }

  /**
   * Find nearest stop to a position
   */
  findNearestStop(position: Position, type?: TransitType, maxDistance: number = 50): TransitStop | null {
    let nearest: TransitStop | null = null;
    let minDistance = maxDistance;

    for (const stop of this.stops.values()) {
      if (type && stop.type !== type) continue;

      const distance = Math.sqrt(
        Math.pow(stop.position.x - position.x, 2) +
        Math.pow(stop.position.y - position.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = stop;
      }
    }

    return nearest;
  }

  /**
   * Get all stops
   */
  getStops(): TransitStop[] {
    return Array.from(this.stops.values());
  }

  /**
   * Get all routes
   */
  getRoutes(): TransitRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get all vehicles
   */
  getVehicles(): TransitVehicle[] {
    return Array.from(this.vehicles.values());
  }

  /**
   * Get transit statistics
   */
  getStats(): TransitStats {
    const totalPassengers = Array.from(this.vehicles.values())
      .reduce((sum, v) => sum + v.passengers, 0);

    // Calculate coverage (simplified: percentage of cells within range of a stop)
    const cellsInRange = new Set<string>();
    const coverageRadius = 20;

    for (const stop of this.stops.values()) {
      for (let dx = -coverageRadius; dx <= coverageRadius; dx++) {
        for (let dy = -coverageRadius; dy <= coverageRadius; dy++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= coverageRadius) {
            const x = stop.position.x + dx;
            const y = stop.position.y + dy;
            cellsInRange.add(`${x},${y}`);
          }
        }
      }
    }

    const totalCells = this.grid.width * this.grid.height;
    const coverage = (cellsInRange.size / totalCells) * 100;

    return {
      totalRoutes: this.routes.size,
      totalStops: this.stops.size,
      totalVehicles: this.vehicles.size,
      totalPassengers,
      averageWaitTime: this.averageWaitTime,
      ridership: this.totalRidership,
      coverage: Math.min(100, coverage),
    };
  }

  /**
   * Reset ridership counter (called monthly)
   */
  resetMonthlyStats(): void {
    this.totalRidership = 0;
  }

  /**
   * Auto-create route when bus stops are placed
   * Creates or updates a default bus route connecting all bus stops
   */
  autoCreateBusRoute(): void {
    // Get all bus stops
    const busStops = Array.from(this.stops.values())
      .filter(stop => stop.type === TransitType.BUS);

    // Need at least 2 stops to create a route
    if (busStops.length < 2) {
      console.log('Not enough bus stops for a route (need at least 2)');
      return;
    }

    // Check if default route already exists
    let defaultRoute = Array.from(this.routes.values())
      .find(route => route.name === 'バスルート1');

    const stopIds = busStops.map(stop => stop.id);

    if (defaultRoute) {
      // Update existing route
      defaultRoute.stops = stopIds;
      console.log(`Updated bus route with ${stopIds.length} stops`);

      // Remove old vehicles and spawn new one
      for (const [vehicleId, vehicle] of this.vehicles) {
        if (vehicle.routeId === defaultRoute.id) {
          this.vehicles.delete(vehicleId);
        }
      }
      this.spawnVehicle(defaultRoute.id);
    } else {
      // Create new route
      this.createRoute(
        'バスルート1',
        TransitType.BUS,
        stopIds,
        '#ff6b00',
        10,
        true
      );
    }
  }

  /**
   * Get transit stop data for serialization
   */
  getStopsData(): Array<{
    id: string;
    position: Position;
    type: TransitType;
    name: string;
    passengers: number;
  }> {
    return Array.from(this.stops.values()).map(stop => ({
      id: stop.id,
      position: { ...stop.position },
      type: stop.type,
      name: stop.name,
      passengers: stop.passengers,
    }));
  }

  /**
   * Get routes data for serialization
   */
  getRoutesData(): Array<{
    id: string;
    name: string;
    type: TransitType;
    stops: string[];
    color: string;
    frequency: number;
    isLoop: boolean;
  }> {
    return Array.from(this.routes.values()).map(route => ({
      id: route.id,
      name: route.name,
      type: route.type,
      stops: [...route.stops],
      color: route.color,
      frequency: route.frequency,
      isLoop: route.isLoop,
    }));
  }

  /**
   * Get vehicles data for serialization
   */
  getVehiclesData(): Array<{
    id: string;
    routeId: string;
    type: TransitType;
    currentStopIndex: number;
    nextStopIndex: number;
    position: Position;
    passengers: number;
    capacity: number;
    speed: number;
    progress: number;
  }> {
    return Array.from(this.vehicles.values()).map(vehicle => ({
      id: vehicle.id,
      routeId: vehicle.routeId,
      type: vehicle.type,
      currentStopIndex: vehicle.currentStopIndex,
      nextStopIndex: vehicle.nextStopIndex,
      position: { ...vehicle.position },
      passengers: vehicle.passengers,
      capacity: vehicle.capacity,
      speed: vehicle.speed,
      progress: vehicle.progress,
    }));
  }

  /**
   * Load transit data from serialized format
   */
  loadData(data: {
    stops: Array<any>;
    routes: Array<any>;
    vehicles: Array<any>;
    nextStopId: number;
    nextRouteId: number;
    nextVehicleId: number;
  }): void {
    // Clear existing data
    this.stops.clear();
    this.routes.clear();
    this.vehicles.clear();

    // Restore stops
    for (const stopData of data.stops) {
      this.stops.set(stopData.id, {
        id: stopData.id,
        position: { ...stopData.position },
        type: stopData.type,
        name: stopData.name,
        passengers: stopData.passengers,
      });
    }

    // Restore routes
    for (const routeData of data.routes) {
      this.routes.set(routeData.id, {
        id: routeData.id,
        name: routeData.name,
        type: routeData.type,
        stops: [...routeData.stops],
        color: routeData.color,
        frequency: routeData.frequency,
        isLoop: routeData.isLoop,
      });
    }

    // Restore vehicles
    for (const vehicleData of data.vehicles) {
      this.vehicles.set(vehicleData.id, {
        id: vehicleData.id,
        routeId: vehicleData.routeId,
        type: vehicleData.type,
        currentStopIndex: vehicleData.currentStopIndex,
        nextStopIndex: vehicleData.nextStopIndex,
        position: { ...vehicleData.position },
        passengers: vehicleData.passengers,
        capacity: vehicleData.capacity,
        speed: vehicleData.speed,
        progress: vehicleData.progress,
      });
    }

    // Restore ID counters
    this.nextStopId = data.nextStopId;
    this.nextRouteId = data.nextRouteId;
    this.nextVehicleId = data.nextVehicleId;

    console.log(`Transit data loaded: ${this.stops.size} stops, ${this.routes.size} routes, ${this.vehicles.size} vehicles`);
  }
}
