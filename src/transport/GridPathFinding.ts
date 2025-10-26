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

  constructor(grid: Grid) {
    this.grid = grid;
  }

  /**
   * Find path between two positions using A* on the grid
   * All cells are walkable, but roads are faster
   */
  findPath(start: Position, end: Position): Path {
    const startCell = this.grid.getCell(start.x, start.y);
    const endCell = this.grid.getCell(end.x, end.y);

    if (!startCell || !endCell) {
      console.warn(`[GridPathFinding] Invalid cells - startCell: ${!!startCell}, endCell: ${!!endCell} at (${start.x},${start.y}) -> (${end.x},${end.y})`);
      return {
        nodes: [],
        totalCost: Infinity,
        distance: 0,
        exists: false,
      };
    }

    return this.aStar(start, end);
  }

  /**
   * A* algorithm implementation on grid
   */
  private aStar(start: Position, end: Position): Path {
    try {
      console.log(`[GridPathFinding] Finding path from (${start.x},${start.y}) to (${end.x},${end.y})`);

      const openSet = new PriorityQueue<string>();
      const cameFrom = new Map<string, string>();
      const gScore = new Map<string, number>();
      const fScore = new Map<string, number>();

      const startId = this.positionToId(start);
      const endId = this.positionToId(end);

      console.log(`[GridPathFinding] IDs created - start: ${startId}, end: ${endId}`);

      // Initialize
      gScore.set(startId, 0);
      console.log(`[GridPathFinding] Set gScore[${startId}] = 0`);
      const h = this.heuristic(start, end);
      console.log(`[GridPathFinding] Heuristic calculated: ${h}`);
      fScore.set(startId, h);
      openSet.enqueue(startId, h);
      console.log(`[GridPathFinding] Enqueued startId: ${startId} with priority: ${h}`);

      let iterations = 0;
      const maxIterations = 50000; // Increased for grid-based search

      console.log(`[GridPathFinding] Starting A* search. OpenSet initial size check...`);

    while (!openSet.isEmpty()) {
      iterations++;

      if (iterations === 1) {
        console.log(`[GridPathFinding] First iteration started, about to dequeue`);
      }

      if (iterations > maxIterations) {
        console.warn(`[GridPathFinding] Exceeded max iterations (${maxIterations})`);
        break;
      }

      const currentId = openSet.dequeue()!;

      if (iterations === 1) {
        console.log(`[GridPathFinding] Dequeued: ${currentId}`);
        console.log(`[GridPathFinding] gScore for currentId: ${gScore.get(currentId)}`);
        console.log(`[GridPathFinding] gScore has currentId: ${gScore.has(currentId)}`);
        console.log(`[GridPathFinding] All gScore keys:`, Array.from(gScore.keys()));
      }

      const current = this.idToPosition(currentId);

      if (iterations === 1) {
        console.log(`[GridPathFinding] Converted to position: (${current.x},${current.y})`);
        console.log(`[GridPathFinding] Checking if reached destination - current: ${currentId}, end: ${endId}, equal: ${currentId === endId}`);
      }

      // Reached destination
      if (currentId === endId) {
        console.log(`[GridPathFinding] Success! Path found in ${iterations} iterations, cost: ${gScore.get(currentId)?.toFixed(2)}`);
        return this.reconstructPath(cameFrom, currentId, gScore.get(currentId) || 0);
      }

      // Log progress every 5000 iterations
      if (iterations % 5000 === 0) {
        console.log(`[GridPathFinding] Still searching... ${iterations} iterations`);
      }

      // Explore neighbors (4-directional: up, down, left, right)
      const neighbors = this.getNeighbors(current);

      if (iterations === 1) {
        console.log(`[GridPathFinding] First iteration - found ${neighbors.length} neighbors`);
      }

      for (const neighbor of neighbors) {
        const neighborId = this.positionToId(neighbor);
        const movementCost = this.getMovementCost(current, neighbor);

        if (iterations === 1 && neighbor === neighbors[0]) {
          console.log(`[GridPathFinding] First neighbor - id: ${neighborId}, movementCost: ${movementCost}`);
        }

        if (movementCost === Infinity) {
          if (iterations === 1) {
            console.log(`[GridPathFinding] Neighbor ${neighborId} has infinite cost, skipping`);
          }
          continue; // Impassable
        }

        const tentativeGScore = (gScore.get(currentId) || Infinity) + movementCost;

        if (iterations === 1 && neighbor === neighbors[0]) {
          console.log(`[GridPathFinding] tentativeGScore: ${tentativeGScore}, current gScore for neighbor: ${gScore.get(neighborId) || Infinity}`);
          console.log(`[GridPathFinding] Should add to openSet: ${tentativeGScore < (gScore.get(neighborId) || Infinity)}`);
        }

        if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
          // This path is better
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeGScore);
          const h = this.heuristic(neighbor, end);
          const f = tentativeGScore + h;
          fScore.set(neighborId, f);

          if (iterations === 1 && neighbor === neighbors[0]) {
            console.log(`[GridPathFinding] Adding neighbor to openSet with f=${f}, h=${h}`);
          }

          openSet.enqueue(neighborId, f);

          if (iterations === 1 && neighbor === neighbors[0]) {
            console.log(`[GridPathFinding] After enqueue, openSet size: ${openSet.size()}`);
          }
        }
      }

      if (iterations === 1) {
        console.log(`[GridPathFinding] First iteration complete. OpenSet size: ${openSet.size()}`);
      }

      if (iterations === 2) {
        console.log(`[GridPathFinding] Second iteration started`);
      }
    }

      // No path found
      console.warn(`[GridPathFinding] No path found after ${iterations} iterations. OpenSet empty: ${openSet.isEmpty()}`);
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
}
