import { Position } from '@/core/types';

/**
 * Camera system for panning and zooming the viewport
 */
export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;

  public readonly minZoom: number = 0.25;
  public readonly maxZoom: number = 4;
  public readonly zoomSpeed: number = 0.1;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(
    public readonly viewportWidth: number,
    public readonly viewportHeight: number
  ) {}

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): Position {
    return {
      x: (screenX - this.viewportWidth / 2) / this.zoom + this.x,
      y: (screenY - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): Position {
    return {
      x: (worldX - this.x) * this.zoom + this.viewportWidth / 2,
      y: (worldY - this.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    this.setZoom(this.zoom + this.zoomSpeed);
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    this.setZoom(this.zoom - this.zoomSpeed);
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }

  /**
   * Zoom at a specific point
   */
  zoomAt(screenX: number, screenY: number, delta: number): void {
    // Get world position before zoom
    const worldPosBefore = this.screenToWorld(screenX, screenY);

    // Apply zoom
    const newZoom = this.zoom * (1 + delta);
    this.setZoom(newZoom);

    // Get world position after zoom
    const worldPosAfter = this.screenToWorld(screenX, screenY);

    // Adjust camera position to keep the point under the cursor
    this.x += worldPosBefore.x - worldPosAfter.x;
    this.y += worldPosBefore.y - worldPosAfter.y;
  }

  /**
   * Pan the camera
   */
  pan(dx: number, dy: number): void {
    this.x += dx / this.zoom;
    this.y += dy / this.zoom;
  }

  /**
   * Set camera position
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Center camera on a world position
   */
  centerOn(worldX: number, worldY: number): void {
    this.x = worldX;
    this.y = worldY;
  }

  /**
   * Handle mouse down for dragging
   */
  onMouseDown(x: number, y: number): void {
    this.isDragging = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  /**
   * Handle mouse move for dragging
   */
  onMouseMove(x: number, y: number): boolean {
    if (!this.isDragging) return false;

    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;

    this.pan(-dx, -dy);

    this.lastMouseX = x;
    this.lastMouseY = y;

    return true;
  }

  /**
   * Handle mouse up
   */
  onMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Check if camera is currently dragging
   */
  getIsDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Apply camera transformation to canvas context
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}
