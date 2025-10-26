/**
 * Manages citizen commutes and calculates road congestion
 */

import { Grid } from '@/core/Grid';
import { RoadNetwork } from '@/transport/RoadNetwork';
import { PathFinding } from '@/transport/PathFinding';
import { CitizenManager } from './CitizenManager';
import { Commuter, CommuteState } from './Commuter';
import { EmploymentStatus } from './types';

export interface CommuteStats {
  totalCommuters: number;
  activeCommuters: number;
  failedCommuters: number;
  succeededCommuters: number;
  averageCommuteTime: number;
  maxCommuteTime: number;
}

export interface RoadCongestionData {
  edgeId: string;
  commuterCount: number;
  congestionLevel: number; // 0-100
}

/**
 * Manages commuting simulation for all employed citizens
 */
export class CommuteManager {
  private grid: Grid;
  private pathFinding: PathFinding;
  private citizenManager: CitizenManager;

  private commuters: Map<string, Commuter>; // citizenId -> Commuter
  private roadCongestion: Map<string, number>; // edgeId -> commuter count

  private simulationInterval: number = 120; // Run commute simulation every 120 ticks (daily)
  private ticksSinceSimulation: number = 0;
  private isSimulating: boolean = false;

  private maxCommuteTime: number = 300; // Maximum allowed commute time in ticks
  private congestionSlowdownFactor: number = 0.1; // How much congestion slows down commute

  private stats: CommuteStats = {
    totalCommuters: 0,
    activeCommuters: 0,
    failedCommuters: 0,
    succeededCommuters: 0,
    averageCommuteTime: 0,
    maxCommuteTime: 0,
  };

  constructor(
    grid: Grid,
    roadNetwork: RoadNetwork,
    citizenManager: CitizenManager
  ) {
    this.grid = grid;
    this.pathFinding = new PathFinding(roadNetwork);
    this.citizenManager = citizenManager;
    this.commuters = new Map();
    this.roadCongestion = new Map();
  }

  /**
   * Update commute system
   */
  update(): void {
    this.ticksSinceSimulation++;

    if (this.isSimulating) {
      this.updateCommuters();
    } else if (this.ticksSinceSimulation >= this.simulationInterval) {
      this.ticksSinceSimulation = 0;
      this.startCommuteSimulation();
    }
  }

  /**
   * Start a new commute simulation cycle
   */
  private startCommuteSimulation(): void {
    this.commuters.clear();
    this.roadCongestion.clear();
    this.isSimulating = true;

    // Create commuters for all employed citizens
    const citizens = this.citizenManager.getCitizens();

    for (const citizen of citizens) {
      if (
        citizen.employmentStatus === EmploymentStatus.EMPLOYED &&
        citizen.homeLocation &&
        citizen.workLocation
      ) {
        const commuter = new Commuter(
          citizen.id,
          citizen.homeLocation,
          citizen.workLocation,
          this.maxCommuteTime
        );

        // Find path from home to work
        const path = this.pathFinding.findPath(
          citizen.homeLocation,
          citizen.workLocation
        );

        if (path.exists) {
          commuter.startCommute(path);
          this.commuters.set(citizen.id, commuter);

          // Track road usage for congestion calculation
          this.trackRoadUsage(path.nodes);
        } else {
          // No path available - immediate failure
          commuter.state = CommuteState.FAILED;
          this.commuters.set(citizen.id, commuter);
        }
      }
    }

    this.updateStats();
  }

  /**
   * Update all active commuters
   */
  private updateCommuters(): void {
    let activeCount = 0;
    const currentCongestion = new Map<string, number>();

    for (const commuter of this.commuters.values()) {
      if (commuter.state === CommuteState.COMMUTING) {
        // Apply congestion slowdown
        const currentEdge = commuter.getCurrentEdge();
        if (currentEdge) {
          const edgeId = `${currentEdge.from}-${currentEdge.to}`;
          const congestion = this.roadCongestion.get(edgeId) || 0;
          const slowdown = Math.floor(congestion * this.congestionSlowdownFactor);

          // Skip update based on congestion (simulates slower movement)
          if (slowdown > 0 && Math.random() < slowdown / 10) {
            commuter.commuteTime++;
            activeCount++;
            continue;
          }
        }

        const isComplete = commuter.update();

        if (!isComplete) {
          activeCount++;

          // Track current position for real-time congestion
          const edge = commuter.getCurrentEdge();
          if (edge) {
            const edgeId = `${edge.from}-${edge.to}`;
            currentCongestion.set(edgeId, (currentCongestion.get(edgeId) || 0) + 1);
          }
        }
      }
    }

    // Update grid traffic density based on current congestion
    this.updateGridTrafficDensity(currentCongestion);

    // Check if simulation is complete
    if (activeCount === 0) {
      this.finishCommuteSimulation();
    }

    this.updateStats();
  }

  /**
   * Track road usage for initial congestion calculation
   */
  private trackRoadUsage(pathNodes: string[]): void {
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const edgeId = `${pathNodes[i]}-${pathNodes[i + 1]}`;
      this.roadCongestion.set(edgeId, (this.roadCongestion.get(edgeId) || 0) + 1);
    }
  }

  /**
   * Update grid cell traffic density based on commuter count
   */
  private updateGridTrafficDensity(congestion: Map<string, number>): void {
    // Reset all road cells
    const roadCells = this.grid.getRoadCells();
    for (const cell of roadCells) {
      cell.trafficDensity = 0;
    }

    // Calculate traffic density for each edge
    for (const [edgeId, count] of congestion) {
      const [fromId, toId] = edgeId.split('-');
      const [fromX, fromY] = fromId.split(',').map(Number);
      const [toX, toY] = toId.split(',').map(Number);

      // Update both cells in the edge
      const fromCell = this.grid.getCell(fromX, fromY);
      const toCell = this.grid.getCell(toX, toY);

      // Traffic density is based on commuter count (capped at 100)
      const density = Math.min(100, count * 5);

      if (fromCell) {
        fromCell.trafficDensity = Math.max(fromCell.trafficDensity, density);
      }
      if (toCell) {
        toCell.trafficDensity = Math.max(toCell.trafficDensity, density);
      }
    }
  }

  /**
   * Finish commute simulation and handle failures
   */
  private finishCommuteSimulation(): void {
    this.isSimulating = false;

    // Process failed commutes
    const failedCitizens: string[] = [];

    for (const [citizenId, commuter] of this.commuters) {
      if (commuter.hasFailed()) {
        failedCitizens.push(citizenId);
      }
    }

    // Notify about failed commutes (these citizens will lose their jobs)
    if (failedCitizens.length > 0) {
      this.handleFailedCommutes(failedCitizens);
    }

    this.updateStats();
  }

  /**
   * Handle citizens who failed to commute
   */
  private handleFailedCommutes(citizenIds: string[]): void {
    const citizens = this.citizenManager.getCitizens();

    for (const citizenId of citizenIds) {
      const citizen = citizens.find(c => c.id === citizenId);
      if (citizen) {
        // Citizen loses job due to failed commute
        citizen.removeJob();

        // In a real implementation, there could be a chance the citizen moves away
        // For now, they just become unemployed
      }
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const commuters = Array.from(this.commuters.values());

    const failed = commuters.filter(c => c.hasFailed()).length;
    const succeeded = commuters.filter(c => c.hasSucceeded()).length;
    const active = commuters.filter(c => c.state === CommuteState.COMMUTING).length;

    const commuteTimes = commuters
      .filter(c => c.hasSucceeded())
      .map(c => c.commuteTime);

    this.stats = {
      totalCommuters: commuters.length,
      activeCommuters: active,
      failedCommuters: failed,
      succeededCommuters: succeeded,
      averageCommuteTime: commuteTimes.length > 0
        ? commuteTimes.reduce((a, b) => a + b, 0) / commuteTimes.length
        : 0,
      maxCommuteTime: commuteTimes.length > 0
        ? Math.max(...commuteTimes)
        : 0,
    };
  }

  /**
   * Get commute statistics
   */
  getStats(): CommuteStats {
    return { ...this.stats };
  }

  /**
   * Get road congestion data
   */
  getRoadCongestion(): RoadCongestionData[] {
    const data: RoadCongestionData[] = [];

    for (const [edgeId, count] of this.roadCongestion) {
      data.push({
        edgeId,
        commuterCount: count,
        congestionLevel: Math.min(100, count * 5),
      });
    }

    return data;
  }

  /**
   * Get all active commuters
   */
  getCommuters(): Commuter[] {
    return Array.from(this.commuters.values());
  }

  /**
   * Check if currently simulating commutes
   */
  isActivelySimulating(): boolean {
    return this.isSimulating;
  }

  /**
   * Set max commute time
   */
  setMaxCommuteTime(ticks: number): void {
    this.maxCommuteTime = ticks;
  }

  /**
   * Set simulation interval
   */
  setSimulationInterval(ticks: number): void {
    this.simulationInterval = ticks;
  }
}
