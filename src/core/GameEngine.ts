import { Grid } from './Grid';
import { GameConfig } from './types';
import { RoadNetwork } from '@/transport/RoadNetwork';
import { PathFinding } from '@/transport/PathFinding';
import { TrafficSimulator } from '@/transport/TrafficSimulator';
import { TrafficAnalytics } from '@/transport/TrafficAnalytics';
import { BuildingManager } from '@/buildings/BuildingManager';
import { DemandCalculator } from '@/buildings/DemandCalculator';
import { CitizenManager } from '@/economy/CitizenManager';
import { EconomyManager } from '@/economy/EconomyManager';
import { TransitManager } from '@/transit/TransitManager';
import { HistoricalDataCollector } from '@/analytics/HistoricalDataCollector';

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

  // Building systems
  private buildingManager: BuildingManager;
  private demandCalculator: DemandCalculator;

  // Economy systems
  private citizenManager: CitizenManager;
  private economyManager: EconomyManager;

  // Transit systems
  private transitManager: TransitManager;

  // Analytics systems
  private historicalDataCollector: HistoricalDataCollector;

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
    residentialDemand: 50,
    commercialDemand: 50,
    industrialDemand: 50,
    // Economy stats
    citizens: 0,
    employed: 0,
    unemployed: 0,
    unemploymentRate: 0,
    totalJobs: 0,
    availableJobs: 0,
    // Transit stats
    transitRoutes: 0,
    transitStops: 0,
    transitVehicles: 0,
    transitPassengers: 0,
    transitRidership: 0,
    transitCoverage: 0,
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

    // Initialize building systems
    this.buildingManager = new BuildingManager(this.grid);
    this.demandCalculator = new DemandCalculator(this.grid);

    // Initialize economy systems
    this.citizenManager = new CitizenManager(this.grid);
    this.citizenManager.setTrafficSimulator(this.trafficSimulator);
    this.economyManager = new EconomyManager(this.grid, this.citizenManager, this.stats.money);

    // Initialize transit systems
    this.transitManager = new TransitManager(this.grid);

    // Initialize analytics systems
    this.historicalDataCollector = new HistoricalDataCollector(200, 10);

    // Build initial road network
    this.roadNetwork.buildFromGrid();
    console.log('Initial road network built');
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
   * Get building manager
   */
  getBuildingManager(): BuildingManager {
    return this.buildingManager;
  }

  /**
   * Get demand calculator
   */
  getDemandCalculator(): DemandCalculator {
    return this.demandCalculator;
  }

  /**
   * Get citizen manager
   */
  getCitizenManager(): CitizenManager {
    return this.citizenManager;
  }

  /**
   * Get economy manager
   */
  getEconomyManager(): EconomyManager {
    return this.economyManager;
  }

  /**
   * Get transit manager
   */
  getTransitManager(): TransitManager {
    return this.transitManager;
  }

  /**
   * Get historical data collector
   */
  getHistoricalDataCollector(): HistoricalDataCollector {
    return this.historicalDataCollector;
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

    // Update building systems
    this.demandCalculator.update();
    const demand = this.demandCalculator.getDemand();
    this.buildingManager.setDemand(demand);
    this.buildingManager.update();

    // Update economy systems
    this.citizenManager.update();
    this.economyManager.update();

    // Update transit systems
    this.transitManager.update();

    // Update game systems here
    this.updateStatistics();

    // Update historical data
    this.historicalDataCollector.update(this.gameTime, this.stats);

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

    // Demand statistics
    const demand = this.demandCalculator.getDemand();
    this.stats.residentialDemand = Math.round(demand.residential);
    this.stats.commercialDemand = Math.round(demand.commercial);
    this.stats.industrialDemand = Math.round(demand.industrial);

    // Economy statistics
    const economyStats = this.economyManager.getStats();
    this.stats.money = Math.round(economyStats.treasury);
    this.stats.income = Math.round(economyStats.totalRevenue);
    this.stats.expenses = Math.round(economyStats.totalExpenses);
    this.stats.citizens = economyStats.totalCitizens;
    this.stats.employed = economyStats.employedCitizens;
    this.stats.unemployed = economyStats.unemployedCitizens;
    this.stats.unemploymentRate = Math.round(economyStats.unemploymentRate);
    this.stats.totalJobs = economyStats.totalJobs;
    this.stats.availableJobs = economyStats.availableJobs;

    // Transit statistics
    const transitStats = this.transitManager.getStats();
    this.stats.transitRoutes = transitStats.totalRoutes;
    this.stats.transitStops = transitStats.totalStops;
    this.stats.transitVehicles = transitStats.totalVehicles;
    this.stats.transitPassengers = transitStats.totalPassengers;
    this.stats.transitRidership = transitStats.ridership;
    this.stats.transitCoverage = Math.round(transitStats.coverage);
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
