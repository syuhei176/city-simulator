import { Cell } from './Cell';
import { Position, RoadType, ZoneType } from './types';

/**
 * Grid system that manages all cells in the city
 */
export class Grid {
  private cells: Cell[][];
  public readonly width: number;
  public readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.initialize();
  }

  /**
   * Initialize the grid with empty cells
   */
  private initialize(): void {
    for (let y = 0; y < this.height; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x] = new Cell(x, y);
      }
    }
  }

  /**
   * Get a cell at the specified position
   */
  getCell(x: number, y: number): Cell | null {
    if (!this.isValidPosition(x, y)) {
      return null;
    }
    return this.cells[y][x];
  }

  /**
   * Get cell at position
   */
  getCellAt(pos: Position): Cell | null {
    return this.getCell(pos.x, pos.y);
  }

  /**
   * Check if position is valid
   */
  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Get neighboring cells (N, E, S, W)
   */
  getNeighbors(x: number, y: number): {
    north: Cell | null;
    east: Cell | null;
    south: Cell | null;
    west: Cell | null;
  } {
    return {
      north: this.getCell(x, y - 1),
      east: this.getCell(x + 1, y),
      south: this.getCell(x, y + 1),
      west: this.getCell(x - 1, y),
    };
  }

  /**
   * Get all 8 neighbors including diagonals
   */
  getAllNeighbors(x: number, y: number): Cell[] {
    const neighbors: Cell[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const cell = this.getCell(x + dx, y + dy);
        if (cell) neighbors.push(cell);
      }
    }
    return neighbors;
  }

  /**
   * Place a road and update connections
   */
  placeRoad(x: number, y: number, roadType: RoadType): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;

    cell.setRoad(roadType);
    this.updateRoadConnections(x, y);

    // Update neighbors' connections
    const neighbors = this.getNeighbors(x, y);
    if (neighbors.north) this.updateRoadConnections(x, y - 1);
    if (neighbors.east) this.updateRoadConnections(x + 1, y);
    if (neighbors.south) this.updateRoadConnections(x, y + 1);
    if (neighbors.west) this.updateRoadConnections(x - 1, y);

    return true;
  }

  /**
   * Update road connections for a cell
   */
  private updateRoadConnections(x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (!cell || !cell.isRoad()) return;

    const neighbors = this.getNeighbors(x, y);
    cell.roadConnections.north = neighbors.north?.isRoad() ?? false;
    cell.roadConnections.east = neighbors.east?.isRoad() ?? false;
    cell.roadConnections.south = neighbors.south?.isRoad() ?? false;
    cell.roadConnections.west = neighbors.west?.isRoad() ?? false;
  }

  /**
   * Set zone for a cell
   */
  setZone(x: number, y: number, zoneType: ZoneType): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;

    cell.setZone(zoneType);
    return true;
  }

  /**
   * Clear a cell
   */
  clearCell(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;

    const wasRoad = cell.isRoad();
    cell.clear();

    // Update neighbors if this was a road
    if (wasRoad) {
      const neighbors = this.getNeighbors(x, y);
      if (neighbors.north) this.updateRoadConnections(x, y - 1);
      if (neighbors.east) this.updateRoadConnections(x + 1, y);
      if (neighbors.south) this.updateRoadConnections(x, y + 1);
      if (neighbors.west) this.updateRoadConnections(x - 1, y);
    }

    return true;
  }

  /**
   * Get all cells
   */
  getAllCells(): Cell[] {
    const allCells: Cell[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        allCells.push(this.cells[y][x]);
      }
    }
    return allCells;
  }

  /**
   * Get all road cells
   */
  getRoadCells(): Cell[] {
    return this.getAllCells().filter(cell => cell.isRoad());
  }

  /**
   * Iterate over all cells
   */
  forEach(callback: (cell: Cell, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(this.cells[y][x], x, y);
      }
    }
  }
}
