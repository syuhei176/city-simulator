import { Grid } from '@/core/Grid';
import { Cell } from '@/core/Cell';
import { CellType, RoadType } from '@/core/types';
import { Camera } from './Camera';

/**
 * Renders the city map to a canvas
 */
export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private cellSize: number;

  // Colors
  private readonly colors = {
    empty: '#2d5016',
    road: {
      small: '#4a4a4a',
      medium: '#3a3a3a',
      large: '#2a2a2a',
      highway: '#1a1a1a',
    },
    residential: '#4a7c59',
    commercial: '#4a5f7c',
    industrial: '#7c6f4a',
    grid: '#00000020',
    roadLine: '#ffeb3b',
  };

  constructor(canvas: HTMLCanvasElement, camera: Camera, cellSize: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = camera;
    this.cellSize = cellSize;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
  }

  /**
   * Render the entire map
   */
  render(grid: Grid): void {
    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transform
    this.camera.applyTransform(this.ctx);

    // Calculate visible range
    const visibleRange = this.getVisibleRange(grid);

    // Render cells
    for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
      for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
        const cell = grid.getCell(x, y);
        if (cell) {
          this.renderCell(cell);
        }
      }
    }

    // Render grid lines
    if (this.camera.zoom >= 0.5) {
      this.renderGrid(grid, visibleRange);
    }

    // Reset transform for UI elements
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Get visible range based on camera position and zoom
   */
  private getVisibleRange(grid: Grid): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const topLeft = this.camera.screenToWorld(0, 0);
    const bottomRight = this.camera.screenToWorld(
      this.canvas.width,
      this.canvas.height
    );

    const minX = Math.max(0, Math.floor(topLeft.x / this.cellSize) - 1);
    const maxX = Math.min(
      grid.width - 1,
      Math.ceil(bottomRight.x / this.cellSize) + 1
    );
    const minY = Math.max(0, Math.floor(topLeft.y / this.cellSize) - 1);
    const maxY = Math.min(
      grid.height - 1,
      Math.ceil(bottomRight.y / this.cellSize) + 1
    );

    return { minX, maxX, minY, maxY };
  }

  /**
   * Render a single cell
   */
  private renderCell(cell: Cell): void {
    const x = cell.x * this.cellSize;
    const y = cell.y * this.cellSize;

    // Draw base
    this.ctx.fillStyle = this.getCellColor(cell);
    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

    // Draw roads
    if (cell.isRoad()) {
      this.renderRoad(cell, x, y);
    }

    // Draw buildings
    if (cell.buildingLevel > 0) {
      this.renderBuilding(cell, x, y);
    }

    // Draw traffic density (if road)
    if (cell.isRoad() && cell.trafficDensity > 0) {
      this.renderTrafficDensity(cell, x, y);
    }
  }

  /**
   * Get cell color based on type
   */
  private getCellColor(cell: Cell): string {
    switch (cell.type) {
      case CellType.ROAD:
        return this.colors.road[cell.roadType || RoadType.SMALL];
      case CellType.RESIDENTIAL:
        return this.colors.residential;
      case CellType.COMMERCIAL:
        return this.colors.commercial;
      case CellType.INDUSTRIAL:
        return this.colors.industrial;
      default:
        return this.colors.empty;
    }
  }

  /**
   * Render road with connections
   */
  private renderRoad(cell: Cell, x: number, y: number): void {
    const { roadConnections } = cell;
    const center = this.cellSize / 2;

    this.ctx.strokeStyle = this.colors.roadLine;
    this.ctx.lineWidth = 1;

    // Draw road lines based on connections
    if (roadConnections.north || roadConnections.south) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + center, y);
      this.ctx.lineTo(x + center, y + this.cellSize);
      this.ctx.stroke();
    }

    if (roadConnections.east || roadConnections.west) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + center);
      this.ctx.lineTo(x + this.cellSize, y + center);
      this.ctx.stroke();
    }
  }

  /**
   * Render building on a cell
   */
  private renderBuilding(cell: Cell, x: number, y: number): void {
    const margin = this.cellSize * 0.1;
    const buildingSize = this.cellSize - margin * 2;

    // Building base
    this.ctx.fillStyle = this.getBuildingColor(cell);
    this.ctx.fillRect(
      x + margin,
      y + margin,
      buildingSize,
      buildingSize
    );

    // Building outline
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      x + margin,
      y + margin,
      buildingSize,
      buildingSize
    );
  }

  /**
   * Get building color
   */
  private getBuildingColor(cell: Cell): string {
    const baseBrightness = 40 + cell.buildingLevel * 20;
    switch (cell.type) {
      case CellType.RESIDENTIAL:
        return `rgb(${baseBrightness}, ${baseBrightness + 80}, ${baseBrightness})`;
      case CellType.COMMERCIAL:
        return `rgb(${baseBrightness}, ${baseBrightness}, ${baseBrightness + 80})`;
      case CellType.INDUSTRIAL:
        return `rgb(${baseBrightness + 80}, ${baseBrightness + 60}, ${baseBrightness})`;
      default:
        return '#666666';
    }
  }

  /**
   * Render traffic density overlay
   */
  private renderTrafficDensity(cell: Cell, x: number, y: number): void {
    const alpha = Math.min(cell.trafficDensity / 100, 1);
    this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.5})`;
    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
  }

  /**
   * Render grid lines
   */
  private renderGrid(
    _grid: Grid,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1 / this.camera.zoom;

    // Vertical lines
    for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
      const worldX = x * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(worldX, visibleRange.minY * this.cellSize);
      this.ctx.lineTo(worldX, (visibleRange.maxY + 1) * this.cellSize);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
      const worldY = y * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(visibleRange.minX * this.cellSize, worldY);
      this.ctx.lineTo((visibleRange.maxX + 1) * this.cellSize, worldY);
      this.ctx.stroke();
    }
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
