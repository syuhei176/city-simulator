import { Grid } from '@/core/Grid';
import { TrafficSimulator } from './TrafficSimulator';

/**
 * Traffic analytics system
 * Collects and analyzes traffic data
 */
export class TrafficAnalytics {
  private grid: Grid;
  private simulator: TrafficSimulator;

  // Historical data
  private congestionHistory: number[] = [];
  private vehicleCountHistory: number[] = [];
  private maxHistoryLength: number = 100;

  // Hot spots (high congestion areas)
  private hotSpots: Map<string, number> = new Map();

  constructor(grid: Grid, simulator: TrafficSimulator) {
    this.grid = grid;
    this.simulator = simulator;
  }

  /**
   * Update analytics
   */
  update(): void {
    const stats = this.simulator.getStats();

    // Record history
    this.congestionHistory.push(stats.averageCongestion);
    this.vehicleCountHistory.push(stats.totalVehicles);

    // Trim history
    if (this.congestionHistory.length > this.maxHistoryLength) {
      this.congestionHistory.shift();
      this.vehicleCountHistory.shift();
    }

    // Update hot spots
    this.updateHotSpots();
  }

  /**
   * Find areas with high congestion
   */
  private updateHotSpots(): void {
    const roadCells = this.grid.getRoadCells();

    for (const cell of roadCells) {
      if (cell.trafficDensity > 70) {
        const key = `${cell.x},${cell.y}`;
        const current = this.hotSpots.get(key) || 0;
        this.hotSpots.set(key, current + 1);
      }
    }

    // Decay old hot spots
    for (const [key, value] of this.hotSpots.entries()) {
      if (value > 0) {
        this.hotSpots.set(key, value * 0.95);
      } else {
        this.hotSpots.delete(key);
      }
    }
  }

  /**
   * Get average congestion over history
   */
  getAverageCongestion(): number {
    if (this.congestionHistory.length === 0) return 0;
    return this.congestionHistory.reduce((a, b) => a + b, 0) / this.congestionHistory.length;
  }

  /**
   * Get average vehicle count over history
   */
  getAverageVehicleCount(): number {
    if (this.vehicleCountHistory.length === 0) return 0;
    return this.vehicleCountHistory.reduce((a, b) => a + b, 0) / this.vehicleCountHistory.length;
  }

  /**
   * Get congestion trend (positive = increasing, negative = decreasing)
   */
  getCongestionTrend(): number {
    if (this.congestionHistory.length < 10) return 0;

    const recent = this.congestionHistory.slice(-10);
    const older = this.congestionHistory.slice(-20, -10);

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    return recentAvg - olderAvg;
  }

  /**
   * Get hot spots (areas with frequent congestion)
   */
  getHotSpots(): Array<{ x: number; y: number; intensity: number }> {
    const spots: Array<{ x: number; y: number; intensity: number }> = [];

    for (const [key, value] of this.hotSpots.entries()) {
      if (value > 10) {
        const [x, y] = key.split(',').map(Number);
        spots.push({ x, y, intensity: Math.min(value, 100) });
      }
    }

    return spots.sort((a, b) => b.intensity - a.intensity);
  }

  /**
   * Get most congested roads
   */
  getMostCongestedRoads(limit: number = 10): Array<{ x: number; y: number; density: number }> {
    const roadCells = this.grid.getRoadCells();
    const congested = roadCells
      .filter(cell => cell.trafficDensity > 0)
      .map(cell => ({
        x: cell.x,
        y: cell.y,
        density: cell.trafficDensity,
      }))
      .sort((a, b) => b.density - a.density)
      .slice(0, limit);

    return congested;
  }

  /**
   * Get overall traffic health score (0-100)
   */
  getTrafficHealthScore(): number {
    const avgCongestion = this.getAverageCongestion();
    const trend = this.getCongestionTrend();

    // Lower congestion = higher score
    let score = 100 - avgCongestion;

    // Penalize increasing congestion
    if (trend > 0) {
      score -= trend * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get traffic report
   */
  getReport() {
    const stats = this.simulator.getStats();
    const hotSpots = this.getHotSpots();
    const congestedRoads = this.getMostCongestedRoads(5);

    return {
      currentVehicles: stats.totalVehicles,
      averageSpeed: stats.averageSpeed,
      averageCongestion: stats.averageCongestion,
      historicalCongestion: this.getAverageCongestion(),
      congestionTrend: this.getCongestionTrend(),
      healthScore: this.getTrafficHealthScore(),
      hotSpotCount: hotSpots.length,
      topHotSpots: hotSpots.slice(0, 5),
      mostCongestedRoads: congestedRoads,
    };
  }

  /**
   * Reset analytics
   */
  reset(): void {
    this.congestionHistory = [];
    this.vehicleCountHistory = [];
    this.hotSpots.clear();
  }
}
