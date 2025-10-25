/**
 * Renders transit stops, routes, and vehicles
 */

import { TransitManager } from '@/transit/TransitManager';
import { Camera } from './Camera';
import { TransitType } from '@/transit/types';

/**
 * TransitRenderer handles visualization of public transit
 */
export class TransitRenderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private cellSize: number;
  private transitManager: TransitManager;

  // Visibility toggles
  private showStops: boolean = true;
  private showRoutes: boolean = true;
  private showVehicles: boolean = true;

  constructor(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    cellSize: number,
    transitManager: TransitManager
  ) {
    this.ctx = ctx;
    this.camera = camera;
    this.cellSize = cellSize;
    this.transitManager = transitManager;
  }

  /**
   * Render all transit elements
   */
  render(): void {
    if (this.showRoutes) {
      this.renderRoutes();
    }
    if (this.showStops) {
      this.renderStops();
    }
    if (this.showVehicles) {
      this.renderVehicles();
    }
  }

  /**
   * Render transit routes
   */
  private renderRoutes(): void {
    const routes = this.transitManager.getRoutes();
    const stops = this.transitManager.getStops();
    const stopMap = new Map(stops.map(s => [s.id, s]));

    for (const route of routes) {
      if (route.stops.length < 2) continue;

      this.ctx.strokeStyle = route.color;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();

      let first = true;
      for (const stopId of route.stops) {
        const stop = stopMap.get(stopId);
        if (!stop) continue;

        const screenPos = this.camera.worldToScreen(
          stop.position.x * this.cellSize + this.cellSize / 2,
          stop.position.y * this.cellSize + this.cellSize / 2
        );

        if (first) {
          this.ctx.moveTo(screenPos.x, screenPos.y);
          first = false;
        } else {
          this.ctx.lineTo(screenPos.x, screenPos.y);
        }
      }

      // Close loop if route is circular
      if (route.isLoop && route.stops.length > 0) {
        const firstStop = stopMap.get(route.stops[0]);
        if (firstStop) {
          const screenPos = this.camera.worldToScreen(
            firstStop.position.x * this.cellSize + this.cellSize / 2,
            firstStop.position.y * this.cellSize + this.cellSize / 2
          );
          this.ctx.lineTo(screenPos.x, screenPos.y);
        }
      }

      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Render transit stops
   */
  private renderStops(): void {
    const stops = this.transitManager.getStops();

    for (const stop of stops) {
      const worldX = stop.position.x * this.cellSize + this.cellSize / 2;
      const worldY = stop.position.y * this.cellSize + this.cellSize / 2;
      const screenPos = this.camera.worldToScreen(worldX, worldY);

      // Draw stop icon
      const radius = 6 * this.camera.zoom;

      // Background circle
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Colored border based on type
      switch (stop.type) {
        case TransitType.BUS:
          this.ctx.strokeStyle = '#ff8800';
          break;
        case TransitType.SUBWAY:
          this.ctx.strokeStyle = '#0088ff';
          break;
        case TransitType.TRAM:
          this.ctx.strokeStyle = '#00ff88';
          break;
      }
      this.ctx.lineWidth = 2 * this.camera.zoom;
      this.ctx.stroke();

      // Draw waiting passengers indicator
      if (stop.passengers > 0) {
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = `${10 * this.camera.zoom}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(
          stop.passengers.toString(),
          screenPos.x,
          screenPos.y - radius - 2
        );
      }
    }
  }

  /**
   * Render transit vehicles
   */
  private renderVehicles(): void {
    const vehicles = this.transitManager.getVehicles();

    for (const vehicle of vehicles) {
      const worldX = vehicle.position.x * this.cellSize + this.cellSize / 2;
      const worldY = vehicle.position.y * this.cellSize + this.cellSize / 2;
      const screenPos = this.camera.worldToScreen(worldX, worldY);

      // Draw vehicle
      const size = 8 * this.camera.zoom;

      // Vehicle shape based on type
      switch (vehicle.type) {
        case TransitType.BUS:
          // Draw rectangle for bus
          this.ctx.fillStyle = '#ff8800';
          this.ctx.fillRect(
            screenPos.x - size / 2,
            screenPos.y - size / 2,
            size,
            size
          );
          break;
        case TransitType.SUBWAY:
          // Draw rounded rectangle for subway
          this.ctx.fillStyle = '#0088ff';
          this.ctx.beginPath();
          this.ctx.roundRect(
            screenPos.x - size / 2,
            screenPos.y - size / 2,
            size,
            size,
            size / 4
          );
          this.ctx.fill();
          break;
        case TransitType.TRAM:
          // Draw diamond for tram
          this.ctx.fillStyle = '#00ff88';
          this.ctx.beginPath();
          this.ctx.moveTo(screenPos.x, screenPos.y - size / 2);
          this.ctx.lineTo(screenPos.x + size / 2, screenPos.y);
          this.ctx.lineTo(screenPos.x, screenPos.y + size / 2);
          this.ctx.lineTo(screenPos.x - size / 2, screenPos.y);
          this.ctx.closePath();
          this.ctx.fill();
          break;
      }

      // Draw passenger count
      if (vehicle.passengers > 0) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${8 * this.camera.zoom}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          vehicle.passengers.toString(),
          screenPos.x,
          screenPos.y
        );
      }
    }
  }

  /**
   * Toggle stop visibility
   */
  toggleStops(): void {
    this.showStops = !this.showStops;
  }

  /**
   * Toggle route visibility
   */
  toggleRoutes(): void {
    this.showRoutes = !this.showRoutes;
  }

  /**
   * Toggle vehicle visibility
   */
  toggleVehicles(): void {
    this.showVehicles = !this.showVehicles;
  }

  /**
   * Get visibility states
   */
  getVisibility() {
    return {
      stops: this.showStops,
      routes: this.showRoutes,
      vehicles: this.showVehicles,
    };
  }
}
