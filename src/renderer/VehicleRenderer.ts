import { Vehicle } from '@/transport/Vehicle';
import { Camera } from './Camera';

/**
 * Renders vehicles on the map
 */
export class VehicleRenderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private cellSize: number;
  private showVehicles: boolean = true;

  constructor(canvas: HTMLCanvasElement, camera: Camera, cellSize: number) {
    this.ctx = canvas.getContext('2d')!;
    this.camera = camera;
    this.cellSize = cellSize;
  }

  /**
   * Render all vehicles
   */
  render(vehicles: Vehicle[]): void {
    if (!this.showVehicles || vehicles.length === 0) {
      return;
    }

    // Apply camera transform
    this.camera.applyTransform(this.ctx);

    for (const vehicle of vehicles) {
      this.renderVehicle(vehicle);
    }

    // Reset transform
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Render a single vehicle
   */
  private renderVehicle(vehicle: Vehicle): void {
    const x = vehicle.position.x * this.cellSize + this.cellSize / 2;
    const y = vehicle.position.y * this.cellSize + this.cellSize / 2;
    const size = 8 / this.camera.zoom;

    // Draw vehicle as circle
    this.ctx.fillStyle = vehicle.getColor();
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw outline
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1 / this.camera.zoom;
    this.ctx.stroke();

    // Draw direction indicator
    if (vehicle.speed > 0) {
      const dx = vehicle.targetPosition.x - vehicle.position.x;
      const dy = vehicle.targetPosition.y - vehicle.position.y;
      const angle = Math.atan2(dy, dx);

      const arrowLength = size * 1.5;
      const arrowX = x + Math.cos(angle) * arrowLength;
      const arrowY = y + Math.sin(angle) * arrowLength;

      this.ctx.strokeStyle = vehicle.getColor();
      this.ctx.lineWidth = 2 / this.camera.zoom;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(arrowX, arrowY);
      this.ctx.stroke();
    }
  }

  /**
   * Toggle vehicle visibility
   */
  toggleVehicles(): void {
    this.showVehicles = !this.showVehicles;
  }

  /**
   * Set vehicle visibility
   */
  setVehiclesVisible(visible: boolean): void {
    this.showVehicles = visible;
  }

  /**
   * Get visibility state
   */
  isVisible(): boolean {
    return this.showVehicles;
  }
}
