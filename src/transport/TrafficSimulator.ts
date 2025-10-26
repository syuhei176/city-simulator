import { Grid } from '@/core/Grid';
import { RoadNetwork } from './RoadNetwork';
import { PathFinding } from './PathFinding';
import { Vehicle, VehicleType, VehicleState } from './Vehicle';

/**
 * Traffic simulator that manages vehicle spawning and movement
 */
export class TrafficSimulator {
  private grid: Grid;
  private network: RoadNetwork;
  private pathFinding: PathFinding;
  private vehicles: Map<string, Vehicle>;
  private nextVehicleId: number = 0;

  // Simulation parameters
  private spawnRate: number = 0.3; // Probability of spawning vehicle per tick
  private maxVehicles: number = 100;
  private cellSize: number;

  // Statistics
  private totalVehiclesSpawned: number = 0;
  private totalVehiclesArrived: number = 0;

  constructor(
    grid: Grid,
    network: RoadNetwork,
    pathFinding: PathFinding,
    cellSize: number
  ) {
    this.grid = grid;
    this.network = network;
    this.pathFinding = pathFinding;
    this.cellSize = cellSize;
    this.vehicles = new Map();
  }

  /**
   * Update simulation
   */
  update(): void {
    // Try to spawn new vehicles
    if (Math.random() < this.spawnRate && this.vehicles.size < this.maxVehicles) {
      this.spawnRandomVehicle();
    }

    // Update all vehicles
    const vehiclesToRemove: string[] = [];

    for (const vehicle of this.vehicles.values()) {
      vehicle.update(this.cellSize);

      // Update vehicle speed based on traffic
      this.updateVehicleSpeed(vehicle);

      // Remove arrived vehicles
      if (vehicle.hasArrived()) {
        vehiclesToRemove.push(vehicle.id);
        this.totalVehiclesArrived++;
      }
    }

    // Remove arrived vehicles
    for (const id of vehiclesToRemove) {
      this.vehicles.delete(id);
    }

    // Update traffic density on roads
    this.updateTrafficDensity();
  }

  /**
   * Spawn a vehicle at random locations
   */
  private spawnRandomVehicle(): void {
    const nodes = this.network.getAllNodes();
    if (nodes.length < 2) {
      // Only log once to avoid spam
      if (this.totalVehiclesSpawned === 0 && this.vehicles.size === 0) {
        console.log(`Cannot spawn vehicles: insufficient road nodes (${nodes.length} nodes, need at least 2)`);
      }
      return;
    }

    // Pick random start and end nodes
    const startNode = nodes[Math.floor(Math.random() * nodes.length)];
    const endNode = nodes[Math.floor(Math.random() * nodes.length)];

    if (startNode.id === endNode.id) return;

    // Find path
    const path = this.pathFinding.findPathBetweenNodes(startNode.id, endNode.id);
    if (!path.exists) return;

    // Create vehicle
    const vehicleType = this.getRandomVehicleType();
    const vehicle = new Vehicle(
      `v${this.nextVehicleId++}`,
      vehicleType,
      startNode.position,
      endNode.position
    );

    vehicle.setPath(path);

    // Set initial speed to a reasonable value (50-70% of max speed)
    const initialSpeedRatio = 0.5 + Math.random() * 0.2; // 50-70%
    vehicle.speed = vehicle.maxSpeed * initialSpeedRatio;

    this.vehicles.set(vehicle.id, vehicle);
    this.totalVehiclesSpawned++;

    // Log first few vehicle spawns
    if (this.totalVehiclesSpawned <= 3) {
      console.log(`Vehicle spawned: ${vehicle.id} at speed ${vehicle.speed.toFixed(2)} (total: ${this.totalVehiclesSpawned})`);
    }
  }

  /**
   * Get random vehicle type
   */
  private getRandomVehicleType(): VehicleType {
    const rand = Math.random();
    if (rand < 0.7) return VehicleType.CAR;
    if (rand < 0.9) return VehicleType.BUS;
    return VehicleType.TRUCK;
  }

  /**
   * Update vehicle speed based on surrounding traffic
   */
  private updateVehicleSpeed(vehicle: Vehicle): void {
    if (vehicle.state !== VehicleState.MOVING) return;

    const cellPos = vehicle.getCellPosition();
    const cell = this.grid.getCell(cellPos.x, cellPos.y);
    if (!cell || !cell.isRoad()) {
      vehicle.decelerate(0.1);
      return;
    }

    // Check for vehicles ahead
    const hasVehicleAhead = this.checkVehicleAhead(vehicle);

    if (hasVehicleAhead) {
      // Slow down if vehicle ahead
      vehicle.decelerate(0.05);
    } else {
      // Check traffic density
      const trafficDensity = cell.trafficDensity;

      if (trafficDensity > 80) {
        // Heavy traffic - slow down
        vehicle.decelerate(0.03);
      } else if (trafficDensity > 50) {
        // Moderate traffic - maintain speed slightly slower
        vehicle.decelerate(0.005);
      } else {
        // Light traffic - speed up more aggressively
        vehicle.accelerate(0.05);
      }
    }
  }

  /**
   * Check if there's a vehicle ahead
   */
  private checkVehicleAhead(vehicle: Vehicle): boolean {
    const minDistance = 1.5; // Minimum safe distance

    for (const other of this.vehicles.values()) {
      if (other.id === vehicle.id) continue;
      if (other.state !== VehicleState.MOVING) continue;

      // Check if on same path and ahead
      if (!vehicle.path || !other.path) continue;

      const dx = other.position.x - vehicle.position.x;
      const dy = other.position.y - vehicle.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        // Check if ahead in direction of travel
        const targetDx = vehicle.targetPosition.x - vehicle.position.x;
        const targetDy = vehicle.targetPosition.y - vehicle.position.y;
        const dotProduct = dx * targetDx + dy * targetDy;

        if (dotProduct > 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update traffic density on road cells
   */
  private updateTrafficDensity(): void {
    // Reset all densities
    const roadCells = this.grid.getRoadCells();
    for (const cell of roadCells) {
      cell.trafficDensity = 0;
    }

    // Count vehicles on each cell
    const cellVehicleCount = new Map<string, number>();

    for (const vehicle of this.vehicles.values()) {
      const cellPos = vehicle.getCellPosition();
      const key = `${cellPos.x},${cellPos.y}`;
      cellVehicleCount.set(key, (cellVehicleCount.get(key) || 0) + 1);
    }

    // Update densities (normalize to 0-100)
    for (const [key, count] of cellVehicleCount.entries()) {
      const [x, y] = key.split(',').map(Number);
      const cell = this.grid.getCell(x, y);
      if (cell && cell.isRoad()) {
        // Scale density (5 vehicles = 100% congestion)
        cell.trafficDensity = Math.min(100, (count / 5) * 100);
      }
    }

    // Apply smoothing to neighboring cells
    this.smoothTrafficDensity();
  }

  /**
   * Smooth traffic density to neighbors
   */
  private smoothTrafficDensity(): void {
    const roadCells = this.grid.getRoadCells();
    const densities = new Map<string, number>();

    for (const cell of roadCells) {
      const neighbors = this.grid.getAllNeighbors(cell.x, cell.y);
      const roadNeighbors = neighbors.filter(n => n.isRoad());

      if (roadNeighbors.length === 0) continue;

      const avgDensity = roadNeighbors.reduce((sum, n) => sum + n.trafficDensity, cell.trafficDensity)
        / (roadNeighbors.length + 1);

      densities.set(`${cell.x},${cell.y}`, avgDensity);
    }

    // Apply smoothed densities
    for (const [key, density] of densities.entries()) {
      const [x, y] = key.split(',').map(Number);
      const cell = this.grid.getCell(x, y);
      if (cell) {
        cell.trafficDensity = density;
      }
    }
  }

  /**
   * Get all vehicles
   */
  getVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  /**
   * Get vehicle count
   */
  getVehicleCount(): number {
    return this.vehicles.size;
  }

  /**
   * Get statistics
   */
  getStats() {
    const vehicles = Array.from(this.vehicles.values());
    const movingVehicles = vehicles.filter(v => v.state === VehicleState.MOVING);
    const stoppedVehicles = vehicles.filter(v => v.state === VehicleState.STOPPED || v.state === VehicleState.WAITING);

    const avgSpeed = vehicles.length > 0
      ? vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length
      : 0;

    const avgCongestion = vehicles.length > 0
      ? vehicles.reduce((sum, v) => sum + v.getCongestionLevel(), 0) / vehicles.length
      : 0;

    return {
      totalVehicles: this.vehicles.size,
      movingVehicles: movingVehicles.length,
      stoppedVehicles: stoppedVehicles.length,
      totalSpawned: this.totalVehiclesSpawned,
      totalArrived: this.totalVehiclesArrived,
      averageSpeed: avgSpeed,
      averageCongestion: avgCongestion,
    };
  }

  /**
   * Set spawn rate
   */
  setSpawnRate(rate: number): void {
    this.spawnRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set max vehicles
   */
  setMaxVehicles(max: number): void {
    this.maxVehicles = Math.max(0, max);
  }

  /**
   * Clear all vehicles
   */
  clearVehicles(): void {
    this.vehicles.clear();
  }
}
