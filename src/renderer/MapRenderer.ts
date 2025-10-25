import { Grid } from '@/core/Grid';
import { Cell } from '@/core/Cell';
import { CellType, RoadType } from '@/core/types';
import { Camera } from './Camera';

export enum HeatmapMode {
  NONE = 'none',
  TRAFFIC = 'traffic',
  POPULATION = 'population',
  DEMAND = 'demand',
  LAND_VALUE = 'land_value',
}

/**
 * Renders the city map to a canvas
 */
export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private cellSize: number;

  // Render options
  private showTrafficHeatmap: boolean = false;
  private heatmapMode: HeatmapMode = HeatmapMode.NONE;

  // Performance optimization
  private lastVisibleRange: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  private frameSkipCounter: number = 0;

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
    // Performance optimization: skip every other frame if performance is low
    this.frameSkipCounter++;
    const skipFrame = this.frameSkipCounter % 2 === 0 && this.isLowPerformance();

    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transform
    this.camera.applyTransform(this.ctx);

    // Calculate visible range
    const visibleRange = this.getVisibleRange(grid);

    // Check if visible range changed
    const rangeChanged = !this.lastVisibleRange ||
      visibleRange.minX !== this.lastVisibleRange.minX ||
      visibleRange.maxX !== this.lastVisibleRange.maxX ||
      visibleRange.minY !== this.lastVisibleRange.minY ||
      visibleRange.maxY !== this.lastVisibleRange.maxY;

    this.lastVisibleRange = { ...visibleRange };

    // Render cells (with optional frame skipping for performance)
    if (!skipFrame || rangeChanged) {
      for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
        for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
          const cell = grid.getCell(x, y);
          if (cell) {
            this.renderCell(cell);
          }
        }
      }
    }

    // Render grid lines (only at higher zoom levels)
    if (this.camera.zoom >= 0.5) {
      this.renderGrid(grid, visibleRange);
    }

    // Reset transform for UI elements
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Check if performance is low (simple heuristic)
   */
  private isLowPerformance(): boolean {
    // Consider performance low if zoom is very far out
    return this.camera.zoom < 0.3;
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

    // Draw heatmap overlay
    this.renderHeatmapOverlay(cell, x, y);
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
    // Building size increases with level
    const levelMultiplier = 0.5 + (cell.buildingLevel * 0.15);
    const margin = this.cellSize * (0.25 - levelMultiplier * 0.1);
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

    // Add details for higher level buildings
    if (cell.buildingLevel >= 2) {
      // Windows/details
      this.ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
      const detailSize = buildingSize * 0.15;
      const gap = buildingSize * 0.25;

      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          this.ctx.fillRect(
            x + margin + gap + i * gap,
            y + margin + gap + j * gap,
            detailSize,
            detailSize
          );
        }
      }
    }

    // Top highlight for level 3 buildings
    if (cell.buildingLevel >= 3) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillRect(
        x + margin,
        y + margin,
        buildingSize,
        buildingSize * 0.15
      );
    }
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
   * Render heatmap overlay based on current mode
   */
  private renderHeatmapOverlay(cell: Cell, x: number, y: number): void {
    let value = 0;
    let color: string | null = null;

    switch (this.heatmapMode) {
      case HeatmapMode.TRAFFIC:
        if (cell.isRoad()) {
          value = cell.trafficDensity;
          color = this.getHeatmapColor(value, 0, 100);
        }
        break;

      case HeatmapMode.POPULATION:
        value = cell.population;
        if (value > 0) {
          // Scale population to 0-100 range (assuming max ~500 per cell)
          const scaledValue = Math.min(100, (value / 500) * 100);
          color = this.getHeatmapColor(scaledValue, 0, 100);
        }
        break;

      case HeatmapMode.DEMAND:
        // Show demand based on zone type
        if (cell.type === CellType.RESIDENTIAL) {
          value = cell.demand;
        } else if (cell.type === CellType.COMMERCIAL) {
          value = cell.demand;
        } else if (cell.type === CellType.INDUSTRIAL) {
          value = cell.demand;
        }
        if (value > 0) {
          // Use different color scheme: red = low demand, green = high demand
          color = this.getDemandHeatmapColor(value);
        }
        break;

      case HeatmapMode.LAND_VALUE:
        // Calculate land value based on multiple factors
        const landValue = this.calculateLandValue(cell);
        if (landValue > 0) {
          color = this.getHeatmapColor(landValue, 0, 100);
        }
        break;

      case HeatmapMode.NONE:
      default:
        // Legacy support for old traffic heatmap toggle
        if (this.showTrafficHeatmap && cell.isRoad() && cell.trafficDensity > 0) {
          color = this.getHeatmapColor(cell.trafficDensity, 0, 100);
        }
        break;
    }

    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
    }
  }

  /**
   * Get heatmap color based on value (green -> yellow -> orange -> red)
   */
  private getHeatmapColor(value: number, min: number, max: number): string {
    const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    let r: number, g: number;

    if (normalized < 25) {
      // Green to Yellow
      const t = normalized / 25;
      r = Math.floor(255 * t);
      g = 255;
      return `rgba(${r}, ${g}, 0, 0.5)`;
    } else if (normalized < 50) {
      // Yellow to Orange
      const t = (normalized - 25) / 25;
      r = 255;
      g = Math.floor(255 * (1 - t * 0.5));
      return `rgba(${r}, ${g}, 0, 0.5)`;
    } else if (normalized < 75) {
      // Orange to Red
      const t = (normalized - 50) / 25;
      r = 255;
      g = Math.floor(128 * (1 - t));
      return `rgba(${r}, ${g}, 0, 0.6)`;
    } else {
      // Dark Red
      const t = (normalized - 75) / 25;
      r = Math.floor(255 * (1 - t * 0.2));
      return `rgba(${r}, 0, 0, 0.7)`;
    }
  }

  /**
   * Get demand heatmap color (red = low, green = high)
   */
  private getDemandHeatmapColor(demand: number): string {
    const normalized = Math.max(0, Math.min(100, demand));

    if (normalized < 50) {
      // Red to Yellow
      const t = normalized / 50;
      const r = 255;
      const g = Math.floor(255 * t);
      return `rgba(${r}, ${g}, 0, 0.5)`;
    } else {
      // Yellow to Green
      const t = (normalized - 50) / 50;
      const r = Math.floor(255 * (1 - t));
      const g = 255;
      return `rgba(${r}, ${g}, 0, 0.5)`;
    }
  }

  /**
   * Calculate land value based on multiple factors
   */
  private calculateLandValue(cell: Cell): number {
    let value = 0;

    // Base value from building level
    value += cell.buildingLevel * 20;

    // Population contributes to value
    value += Math.min(30, cell.population / 10);

    // Road access is valuable
    if (cell.roadAccess) {
      value += 20;
    }

    // Lower traffic density is better
    if (cell.isRoad()) {
      value += Math.max(0, 30 - cell.trafficDensity / 3);
    }

    return Math.min(100, value);
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

  /**
   * Toggle traffic heatmap (legacy support)
   */
  toggleTrafficHeatmap(): void {
    this.showTrafficHeatmap = !this.showTrafficHeatmap;
    if (this.showTrafficHeatmap) {
      this.heatmapMode = HeatmapMode.TRAFFIC;
    } else {
      this.heatmapMode = HeatmapMode.NONE;
    }
  }

  /**
   * Set traffic heatmap visibility (legacy support)
   */
  setTrafficHeatmap(visible: boolean): void {
    this.showTrafficHeatmap = visible;
    if (visible) {
      this.heatmapMode = HeatmapMode.TRAFFIC;
    } else {
      this.heatmapMode = HeatmapMode.NONE;
    }
  }

  /**
   * Get heatmap visibility (legacy support)
   */
  isHeatmapVisible(): boolean {
    return this.showTrafficHeatmap || this.heatmapMode !== HeatmapMode.NONE;
  }

  /**
   * Set heatmap mode
   */
  setHeatmapMode(mode: HeatmapMode): void {
    this.heatmapMode = mode;
    this.showTrafficHeatmap = mode === HeatmapMode.TRAFFIC;
  }

  /**
   * Get current heatmap mode
   */
  getHeatmapMode(): HeatmapMode {
    return this.heatmapMode;
  }

  /**
   * Cycle through heatmap modes
   */
  cycleHeatmapMode(): HeatmapMode {
    const modes = [
      HeatmapMode.NONE,
      HeatmapMode.TRAFFIC,
      HeatmapMode.POPULATION,
      HeatmapMode.DEMAND,
      HeatmapMode.LAND_VALUE,
    ];
    const currentIndex = modes.indexOf(this.heatmapMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setHeatmapMode(modes[nextIndex]);
    return this.heatmapMode;
  }
}
