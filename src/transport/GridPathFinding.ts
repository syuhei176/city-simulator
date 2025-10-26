import { Grid } from '@/core/Grid';
import { Cell } from '@/core/Cell';
import { Position } from '@/core/types';
import { Path } from './types';
import { PriorityQueue } from '@/utils/PriorityQueue';

/**
 * Grid-based A* pathfinding that allows walking on all cells
 * Roads are faster, other cells are walkable but slower
 */
export class GridPathFinding {
  private grid: Grid;

  // Movement costs
  private readonly ROAD_COST = 1.0;        // Fast movement on roads
  private readonly WALKING_COST = 5.0;      // Slow walking on non-roads

  // Path cache to avoid recalculating same paths
  private pathCache: Map<string, Path>;
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(grid: Grid) {
    this.grid = grid;
    this.pathCache = new Map();
  }

  /**
   * Find path between two positions using A* on the grid
   * All cells are walkable, but roads are faster
   */
  findPath(start: Position, end: Position): Path {
    const startCell = this.grid.getCell(start.x, start.y);
    const endCell = this.grid.getCell(end.x, end.y);

    if (!startCell || !endCell) {
      return {
        nodes: [],
        totalCost: Infinity,
        distance: 0,
        exists: false,
      };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(start, end);
    const cachedPath = this.pathCache.get(cacheKey);
    if (cachedPath) {
      return cachedPath;
    }

    // Calculate new path
    const path = this.aStar(start, end);

    // Store in cache (with size limit)
    if (this.pathCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry (first entry in map)
      const firstKey = this.pathCache.keys().next().value;
      if (firstKey) {
        this.pathCache.delete(firstKey);
      }
    }
    this.pathCache.set(cacheKey, path);

    return path;
  }

  /**
   * A* algorithm implementation on grid
   */
  private aStar(start: Position, end: Position): Path {
    try {
      const openSet = new PriorityQueue<string>();
      const cameFrom = new Map<string, string>();
      const gScore = new Map<string, number>();
      const fScore = new Map<string, number>();

      const startId = this.positionToId(start);
      const endId = this.positionToId(end);

      // Initialize
      gScore.set(startId, 0);
      const h = this.heuristic(start, end);
      fScore.set(startId, h);
      openSet.enqueue(startId, h);

      let iterations = 0;
      const maxIterations = 10000; // Reduced to improve performance

    while (!openSet.isEmpty()) {
      iterations++;

      if (iterations > maxIterations) {
        break;
      }

      const currentId = openSet.dequeue()!;
      const current = this.idToPosition(currentId);

      // Reached destination
      if (currentId === endId) {
        return this.reconstructPath(cameFrom, currentId, gScore.get(currentId) || 0);
      }

      // Explore neighbors (4-directional: up, down, left, right)
      const neighbors = this.getNeighbors(current);

      for (const neighbor of neighbors) {
        const neighborId = this.positionToId(neighbor);
        const movementCost = this.getMovementCost(current, neighbor);

        if (movementCost === Infinity) {
          continue; // Impassable
        }

        const currentGScore = gScore.get(currentId);
        const tentativeGScore = (currentGScore !== undefined ? currentGScore : Infinity) + movementCost;

        const neighborGScore = gScore.get(neighborId);
        if (tentativeGScore < (neighborGScore !== undefined ? neighborGScore : Infinity)) {
          // This path is better
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeGScore);
          const h = this.heuristic(neighbor, end);
          const f = tentativeGScore + h;
          fScore.set(neighborId, f);

          openSet.enqueue(neighborId, f);
        }
      }
    }

      // No path found
      return {
        nodes: [],
        totalCost: Infinity,
        distance: 0,
        exists: false,
      };
    } catch (error) {
      console.error(`[GridPathFinding] Exception in aStar:`, error);
      return {
        nodes: [],
        totalCost: Infinity,
        distance: 0,
        exists: false,
      };
    }
  }

  /**
   * Get valid neighboring cells (4-directional)
   */
  private getNeighbors(pos: Position): Position[] {
    const neighbors: Position[] = [];
    const directions = [
      { x: 0, y: -1 },  // North
      { x: 1, y: 0 },   // East
      { x: 0, y: 1 },   // South
      { x: -1, y: 0 },  // West
    ];

    for (const dir of directions) {
      const newPos = { x: pos.x + dir.x, y: pos.y + dir.y };
      const cell = this.grid.getCell(newPos.x, newPos.y);

      if (cell) {
        neighbors.push(newPos);
      }
    }

    return neighbors;
  }

  /**
   * Calculate movement cost between two adjacent cells
   */
  private getMovementCost(from: Position, to: Position): number {
    const fromCell = this.grid.getCell(from.x, from.y);
    const toCell = this.grid.getCell(to.x, to.y);

    if (!fromCell || !toCell) {
      return Infinity;
    }

    // Calculate base cost
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const baseDistance = dx + dy; // Manhattan distance (always 1 for adjacent cells)

    // Determine movement type cost
    let movementMultiplier: number;

    if (fromCell.isRoad() && toCell.isRoad()) {
      // Road to road: fast movement (vehicle or fast walk)
      movementMultiplier = this.ROAD_COST;
    } else if (fromCell.isRoad() || toCell.isRoad()) {
      // Road to non-road or vice versa: medium speed (walking from/to road)
      movementMultiplier = (this.ROAD_COST + this.WALKING_COST) / 2;
    } else {
      // Non-road to non-road: slow walking
      movementMultiplier = this.WALKING_COST;
    }

    return baseDistance * movementMultiplier;
  }

  /**
   * Heuristic function (Manhattan distance with road cost bias)
   */
  private heuristic(from: Position, to: Position): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // Use road cost as base for heuristic (optimistic estimate)
    return (dx + dy) * this.ROAD_COST;
  }

  /**
   * Reconstruct path from came-from map
   */
  private reconstructPath(
    cameFrom: Map<string, string>,
    currentId: string,
    totalCost: number
  ): Path {
    const pathIds: string[] = [currentId];
    let current = currentId;

    while (cameFrom.has(current)) {
      current = cameFrom.get(current)!;
      pathIds.unshift(current);
    }

    // Convert to node IDs (using same format as RoadNetwork for compatibility)
    const nodes = pathIds;

    // Calculate actual distance
    let distance = 0;
    for (let i = 0; i < pathIds.length - 1; i++) {
      const pos1 = this.idToPosition(pathIds[i]);
      const pos2 = this.idToPosition(pathIds[i + 1]);
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      distance += Math.sqrt(dx * dx + dy * dy);
    }

    return {
      nodes,
      totalCost,
      distance,
      exists: true,
    };
  }

  /**
   * Convert position to node ID string
   */
  private positionToId(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }

  /**
   * Convert node ID string to position
   */
  private idToPosition(id: string): Position {
    const [x, y] = id.split(',').map(Number);
    return { x, y };
  }

  /**
   * Check if there is a path between two positions
   */
  hasPath(start: Position, end: Position): boolean {
    const path = this.findPath(start, end);
    return path.exists;
  }

  /**
   * Get the cell at a position for debugging
   */
  getCell(pos: Position): Cell | null {
    return this.grid.getCell(pos.x, pos.y);
  }

  /**
   * Generate cache key from start and end positions
   */
  private getCacheKey(start: Position, end: Position): string {
    return `${start.x},${start.y}->${end.x},${end.y}`;
  }

  /**
   * Clear the path cache (useful when road network changes)
   */
  clearCache(): void {
    this.pathCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.pathCache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}
