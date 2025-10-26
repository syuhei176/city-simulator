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
  private cellSize: number;

  // Statistics
  private totalVehiclesSpawned: number = 0;
  private totalVehiclesArrived: number = 0;
  private arrivedVehicles: string[] = [];

  // Debug counter for logging
  private updateCounter: number = 0;

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
    this.updateCounter++;

    // Log every 100 updates to confirm update is being called
    if (this.updateCounter % 100 === 0) {
      console.log(`[Traffic Update] Update #${this.updateCounter}, vehicles: ${this.vehicles.size}, nodes: ${this.network.getAllNodes().length}`);
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
        this.arrivedVehicles.push(vehicle.id);
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
   * Create and add a vehicle to the simulation (for commute)
   */
  createCommuteVehicle(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): string | null {
    // Use only connected nodes to ensure path exists
    const nodes = this.network.getConnectedNodes();
    if (nodes.length < 2) {
      return null;
    }

    // Find nearest road nodes to start and end positions
    const startNode = this.pathFinding.findNearestRoadNode(start);
    const endNode = this.pathFinding.findNearestRoadNode(end);

    if (!startNode || !endNode) {
      return null;
    }

    if (startNode.id === endNode.id) {
      return null;
    }

    // Find path
    const path = this.pathFinding.findPathBetweenNodes(startNode.id, endNode.id);
    if (!path.exists) {
      return null;
    }

    // Create vehicle
    const vehicleId = `commute_${this.nextVehicleId++}`;
    const vehicle = new Vehicle(
      vehicleId,
      VehicleType.CAR,
      startNode.position,
      endNode.position
    );

    vehicle.setPath(path);

    // Set initial speed to a reasonable value (50-70% of max speed)
    const initialSpeedRatio = 0.5 + Math.random() * 0.2; // 50-70%
    vehicle.speed = vehicle.maxSpeed * initialSpeedRatio;

    this.vehicles.set(vehicleId, vehicle);
    this.totalVehiclesSpawned++;

    // Log first few commute vehicle spawns
    if (this.totalVehiclesSpawned <= 10 || this.totalVehiclesSpawned % 50 === 0) {
      console.log(`[TrafficSimulator] Commute vehicle created: ${vehicleId} from ${startNode.id} to ${endNode.id} (total: ${this.totalVehiclesSpawned}, current: ${this.vehicles.size})`);
    }

    return vehicleId;
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
   * Get and clear arrived vehicles (for commute tracking)
   */
  getAndClearArrivedVehicles(): string[] {
    const arrived = [...this.arrivedVehicles];
    this.arrivedVehicles = [];
    return arrived;
  }

  /**
   * Check if a vehicle exists
   */
  hasVehicle(vehicleId: string): boolean {
    return this.vehicles.has(vehicleId);
  }

  /**
   * Clear all vehicles
   */
  clearVehicles(): void {
    this.vehicles.clear();
  }
}
