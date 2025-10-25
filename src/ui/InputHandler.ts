import { Camera } from '@/renderer/Camera';
import { Grid } from '@/core/Grid';
import { RoadType, ZoneType } from '@/core/types';

/**
 * Tool types for building
 */
export enum ToolType {
  NONE = 'none',
  ROAD_SMALL = 'road_small',
  ROAD_MEDIUM = 'road_medium',
  ROAD_LARGE = 'road_large',
  ZONE_RESIDENTIAL = 'zone_residential',
  ZONE_COMMERCIAL = 'zone_commercial',
  ZONE_INDUSTRIAL = 'zone_industrial',
  BULLDOZE = 'bulldoze',
}

/**
 * Handles user input (mouse, keyboard)
 */
export class InputHandler {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private grid: Grid;
  private cellSize: number;

  private currentTool: ToolType = ToolType.NONE;
  private isDrawing: boolean = false;

  // Touch support
  private lastTouchDistance: number = 0;
  private touches: Touch[] = [];

  // Callbacks
  private onRoadChangedCallback?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    grid: Grid,
    cellSize: number
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.grid = grid;
    this.cellSize = cellSize;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch events for iPad/mobile support
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });

    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Remove event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  /**
   * Get mouse position relative to canvas
   */
  private getMousePos(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Get touch position relative to canvas
   */
  private getTouchPos(touch: Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  /**
   * Calculate distance between two touches (for pinch zoom)
   */
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get center point between two touches
   */
  private getTouchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
      y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
    };
  }

  /**
   * Convert screen position to grid cell
   */
  private screenToGridCell(screenX: number, screenY: number): { x: number; y: number } | null {
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    const cellX = Math.floor(worldPos.x / this.cellSize);
    const cellY = Math.floor(worldPos.y / this.cellSize);

    if (this.grid.isValidPosition(cellX, cellY)) {
      return { x: cellX, y: cellY };
    }
    return null;
  }

  /**
   * Handle mouse down
   */
  private onMouseDown = (event: MouseEvent): void => {
    const pos = this.getMousePos(event);

    if (event.button === 0) {
      // Left click
      if (this.currentTool !== ToolType.NONE) {
        this.isDrawing = true;
        this.applyTool(pos.x, pos.y);
      } else {
        // Pan mode
        this.camera.onMouseDown(pos.x, pos.y);
      }
    } else if (event.button === 2) {
      // Right click - pan
      this.camera.onMouseDown(pos.x, pos.y);
    }
  };

  /**
   * Handle mouse move
   */
  private onMouseMove = (event: MouseEvent): void => {
    const pos = this.getMousePos(event);

    // Handle panning
    if (this.camera.onMouseMove(pos.x, pos.y)) {
      return;
    }

    // Handle tool drawing
    if (this.isDrawing && this.currentTool !== ToolType.NONE) {
      this.applyTool(pos.x, pos.y);
    }
  };

  /**
   * Handle mouse up
   */
  private onMouseUp = (): void => {
    this.camera.onMouseUp();
    this.isDrawing = false;
  };

  /**
   * Handle mouse wheel (zoom)
   */
  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const pos = this.getMousePos(event);
    const delta = -event.deltaY * 0.001;
    this.camera.zoomAt(pos.x, pos.y, delta);
  };

  /**
   * Handle keyboard input
   */
  private onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Escape':
        this.setTool(ToolType.NONE);
        break;
      case '1':
        this.setTool(ToolType.ROAD_SMALL);
        break;
      case '2':
        this.setTool(ToolType.ROAD_MEDIUM);
        break;
      case '3':
        this.setTool(ToolType.ROAD_LARGE);
        break;
      case 'r':
      case 'R':
        this.setTool(ToolType.ZONE_RESIDENTIAL);
        break;
      case 'c':
      case 'C':
        this.setTool(ToolType.ZONE_COMMERCIAL);
        break;
      case 'i':
      case 'I':
        this.setTool(ToolType.ZONE_INDUSTRIAL);
        break;
      case 'd':
      case 'D':
        this.setTool(ToolType.BULLDOZE);
        break;
    }
  };

  /**
   * Handle touch start
   */
  private onTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    this.touches = Array.from(event.touches);

    if (this.touches.length === 1) {
      // Single touch - drawing or panning
      const pos = this.getTouchPos(this.touches[0]);

      if (this.currentTool !== ToolType.NONE) {
        this.isDrawing = true;
        this.applyTool(pos.x, pos.y);
      } else {
        // Pan mode
        this.camera.onMouseDown(pos.x, pos.y);
      }
    } else if (this.touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      this.isDrawing = false;
      this.camera.onMouseUp(); // Stop any panning
      this.lastTouchDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
    }
  };

  /**
   * Handle touch move
   */
  private onTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    this.touches = Array.from(event.touches);

    if (this.touches.length === 1) {
      // Single touch - drawing or panning
      const pos = this.getTouchPos(this.touches[0]);

      // Handle panning
      if (this.camera.onMouseMove(pos.x, pos.y)) {
        return;
      }

      // Handle tool drawing
      if (this.isDrawing && this.currentTool !== ToolType.NONE) {
        this.applyTool(pos.x, pos.y);
      }
    } else if (this.touches.length === 2) {
      // Two finger touch - pinch zoom
      const currentDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
      const center = this.getTouchCenter(this.touches[0], this.touches[1]);

      if (this.lastTouchDistance > 0) {
        const delta = (currentDistance - this.lastTouchDistance) * 0.01;
        this.camera.zoomAt(center.x, center.y, delta);
      }

      this.lastTouchDistance = currentDistance;
    }
  };

  /**
   * Handle touch end
   */
  private onTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();
    this.touches = Array.from(event.touches);

    if (this.touches.length === 0) {
      // All touches ended
      this.camera.onMouseUp();
      this.isDrawing = false;
      this.lastTouchDistance = 0;
    } else if (this.touches.length === 1) {
      // Went from 2+ touches to 1 touch
      this.lastTouchDistance = 0;
      const pos = this.getTouchPos(this.touches[0]);

      if (this.currentTool === ToolType.NONE) {
        // Resume panning with remaining touch
        this.camera.onMouseDown(pos.x, pos.y);
      }
    }
  };

  /**
   * Apply current tool at screen position
   */
  private applyTool(screenX: number, screenY: number): void {
    const cell = this.screenToGridCell(screenX, screenY);
    if (!cell) return;

    let roadChanged = false;

    switch (this.currentTool) {
      case ToolType.ROAD_SMALL:
        this.grid.placeRoad(cell.x, cell.y, RoadType.SMALL);
        roadChanged = true;
        break;
      case ToolType.ROAD_MEDIUM:
        this.grid.placeRoad(cell.x, cell.y, RoadType.MEDIUM);
        roadChanged = true;
        break;
      case ToolType.ROAD_LARGE:
        this.grid.placeRoad(cell.x, cell.y, RoadType.LARGE);
        roadChanged = true;
        break;
      case ToolType.ZONE_RESIDENTIAL:
        this.grid.setZone(cell.x, cell.y, ZoneType.RESIDENTIAL);
        break;
      case ToolType.ZONE_COMMERCIAL:
        this.grid.setZone(cell.x, cell.y, ZoneType.COMMERCIAL);
        break;
      case ToolType.ZONE_INDUSTRIAL:
        this.grid.setZone(cell.x, cell.y, ZoneType.INDUSTRIAL);
        break;
      case ToolType.BULLDOZE:
        const wasRoad = this.grid.getCell(cell.x, cell.y)?.isRoad();
        this.grid.clearCell(cell.x, cell.y);
        if (wasRoad) roadChanged = true;
        break;
    }

    // Notify if road changed
    if (roadChanged && this.onRoadChangedCallback) {
      this.onRoadChangedCallback();
    }
  }

  /**
   * Set current tool
   */
  setTool(tool: ToolType): void {
    this.currentTool = tool;
    console.log(`Tool changed to: ${tool}`);
  }

  /**
   * Get current tool
   */
  getCurrentTool(): ToolType {
    return this.currentTool;
  }

  /**
   * Set callback for road changes
   */
  onRoadChanged(callback: () => void): void {
    this.onRoadChangedCallback = callback;
  }
}
