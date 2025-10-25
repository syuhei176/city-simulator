import { Grid } from './Grid';
import { GameConfig } from './types';
import { RoadNetwork } from '@/transport/RoadNetwork';
import { PathFinding } from '@/transport/PathFinding';
import { TrafficSimulator } from '@/transport/TrafficSimulator';
import { TrafficAnalytics } from '@/transport/TrafficAnalytics';

/**
 * Main game engine that manages the game loop and simulation
 */
export class GameEngine {
  private grid: Grid;
  private config: GameConfig;
  private running: boolean = false;
  private lastTickTime: number = 0;
  private tickAccumulator: number = 0;
  private tickInterval: number;
  private frameId: number | null = null;

  // Transport systems
  private roadNetwork: RoadNetwork;
  private pathFinding: PathFinding;
  private trafficSimulator: TrafficSimulator;
  private trafficAnalytics: TrafficAnalytics;
  private networkDirty: boolean = true;
  private networkRebuildInterval: number = 60; // Rebuild every 60 ticks
  private ticksSinceNetworkRebuild: number = 0;

  // Game state
  private gameTime: number = 0; // In-game time (in ticks)
  private speed: number = 1; // 0 = paused, 1 = normal, 2 = fast, 4 = very fast

  // Statistics
  public stats = {
    population: 0,
    money: 100000, // Starting money
    income: 0,
    expenses: 0,
    roadCount: 0,
    buildingCount: 0,
    networkNodes: 0,
    networkEdges: 0,
    vehicleCount: 0,
    averageTrafficSpeed: 0,
    trafficCongestion: 0,
  };

  constructor(config: GameConfig) {
    this.config = config;
    this.grid = new Grid(config.gridWidth, config.gridHeight);
    this.tickInterval = 1000 / config.tickRate; // ms per tick

    // Initialize transport systems
    this.roadNetwork = new RoadNetwork(this.grid);
    this.pathFinding = new PathFinding(this.roadNetwork);
    this.trafficSimulator = new TrafficSimulator(
      this.grid,
      this.roadNetwork,
      this.pathFinding,
      config.cellSize
    );
    this.trafficAnalytics = new TrafficAnalytics(this.grid, this.trafficSimulator);
  }

  /**
   * Get the grid
   */
  getGrid(): Grid {
    return this.grid;
  }

  /**
   * Get config
   */
  getConfig(): GameConfig {
    return this.config;
  }

  /**
   * Get road network
   */
  getRoadNetwork(): RoadNetwork {
    return this.roadNetwork;
  }

  /**
   * Get path finding
   */
  getPathFinding(): PathFinding {
    return this.pathFinding;
  }

  /**
   * Get traffic simulator
   */
  getTrafficSimulator(): TrafficSimulator {
    return this.trafficSimulator;
  }

  /**
   * Get traffic analytics
   */
  getTrafficAnalytics(): TrafficAnalytics {
    return this.trafficAnalytics;
  }

  /**
   * Mark network as dirty (needs rebuild)
   */
  markNetworkDirty(): void {
    this.networkDirty = true;
  }

  /**
   * Force rebuild road network
   */
  rebuildNetwork(): void {
    this.roadNetwork.buildFromGrid();
    this.networkDirty = false;
    this.ticksSinceNetworkRebuild = 0;
    console.log('Road network rebuilt');
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastTickTime = performance.now();
    this.gameLoop();
    console.log('Game engine started');
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    console.log('Game engine stopped');
  }

  /**
   * Main game loop
   */
  private gameLoop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = now - this.lastTickTime;
    this.lastTickTime = now;

    // Accumulate time
    if (this.speed > 0) {
      this.tickAccumulator += deltaTime * this.speed;
    }

    // Process ticks
    while (this.tickAccumulator >= this.tickInterval) {
      this.tick();
      this.tickAccumulator -= this.tickInterval;
    }

    this.frameId = requestAnimationFrame(this.gameLoop);
  };

  /**
   * Single simulation tick
   */
  private tick(): void {
    this.gameTime++;

    // Check if network needs rebuild
    this.ticksSinceNetworkRebuild++;
    if (this.networkDirty && this.ticksSinceNetworkRebuild >= this.networkRebuildInterval) {
      this.rebuildNetwork();
    }

    // Update traffic simulation
    this.trafficSimulator.update();
    this.trafficAnalytics.update();

    // Update game systems here
    this.updateStatistics();

    // Emit tick event for other systems
    this.onTick();
  }

  /**
   * Hook for tick events (override by systems)
   */
  protected onTick(): void {
    // Will be used by simulation systems
  }

  /**
   * Update game statistics
   */
  private updateStatistics(): void {
    const cells = this.grid.getAllCells();

    this.stats.roadCount = cells.filter(c => c.isRoad()).length;
    this.stats.buildingCount = cells.filter(c => c.buildingLevel > 0).length;
    this.stats.population = cells.reduce((sum, c) => sum + c.population, 0);

    // Network statistics
    const networkStats = this.roadNetwork.getStats();
    this.stats.networkNodes = networkStats.nodeCount;
    this.stats.networkEdges = networkStats.edgeCount;

    // Traffic statistics
    const trafficStats = this.trafficSimulator.getStats();
    this.stats.vehicleCount = trafficStats.totalVehicles;
    this.stats.averageTrafficSpeed = trafficStats.averageSpeed;
    this.stats.trafficCongestion = trafficStats.averageCongestion;
  }

  /**
   * Set game speed
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0, speed);
  }

  /**
   * Get game speed
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Get game time
   */
  getGameTime(): number {
    return this.gameTime;
  }

  /**
   * Pause the game
   */
  pause(): void {
    this.speed = 0;
  }

  /**
   * Resume the game
   */
  resume(): void {
    if (this.speed === 0) {
      this.speed = 1;
    }
  }

  /**
   * Toggle pause
   */
  togglePause(): void {
    if (this.speed === 0) {
      this.resume();
    } else {
      this.pause();
    }
  }
}
