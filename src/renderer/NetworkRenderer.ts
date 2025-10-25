import { RoadNetwork } from '@/transport/RoadNetwork';
import { Path } from '@/transport/types';
import { Camera } from './Camera';

/**
 * Renders road network debugging visualization
 */
export class NetworkRenderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private cellSize: number;

  private showNodes: boolean = false;
  private showEdges: boolean = false;
  private showPath: Path | null = null;

  private readonly colors = {
    node: '#ff0000',
    intersection: '#ff00ff',
    edge: '#00ff0080',
    path: '#00ffff',
  };

  constructor(canvas: HTMLCanvasElement, camera: Camera, cellSize: number) {
    this.ctx = canvas.getContext('2d')!;
    this.camera = camera;
    this.cellSize = cellSize;
  }

  /**
   * Render network visualization
   */
  render(network: RoadNetwork): void {
    if (!this.showNodes && !this.showEdges && !this.showPath) {
      return; // Nothing to render
    }

    // Apply camera transform
    this.camera.applyTransform(this.ctx);

    // Render edges first (background)
    if (this.showEdges) {
      this.renderEdges(network);
    }

    // Render path
    if (this.showPath) {
      this.renderPath(this.showPath, network);
    }

    // Render nodes last (foreground)
    if (this.showNodes) {
      this.renderNodes(network);
    }

    // Reset transform
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Render all nodes
   */
  private renderNodes(network: RoadNetwork): void {
    const nodes = network.getAllNodes();

    for (const node of nodes) {
      const x = node.position.x * this.cellSize + this.cellSize / 2;
      const y = node.position.y * this.cellSize + this.cellSize / 2;
      const radius = node.isIntersection ? 6 : 4;

      this.ctx.fillStyle = node.isIntersection
        ? this.colors.intersection
        : this.colors.node;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius / this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw connection count for intersections
      if (node.isIntersection && this.camera.zoom >= 1) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${12 / this.camera.zoom}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          node.connections.length.toString(),
          x,
          y
        );
      }
    }
  }

  /**
   * Render all edges
   */
  private renderEdges(network: RoadNetwork): void {
    const edges = network.getAllEdges();

    this.ctx.strokeStyle = this.colors.edge;
    this.ctx.lineWidth = 2 / this.camera.zoom;

    for (const edge of edges) {
      const fromNode = network.getNode(edge.from);
      const toNode = network.getNode(edge.to);

      if (!fromNode || !toNode) continue;

      const x1 = fromNode.position.x * this.cellSize + this.cellSize / 2;
      const y1 = fromNode.position.y * this.cellSize + this.cellSize / 2;
      const x2 = toNode.position.x * this.cellSize + this.cellSize / 2;
      const y2 = toNode.position.y * this.cellSize + this.cellSize / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();

      // Draw arrow for directional edges
      if (!edge.bidirectional) {
        this.drawArrow(x1, y1, x2, y2);
      }
    }
  }

  /**
   * Render a path
   */
  private renderPath(path: Path, network: RoadNetwork): void {
    if (path.nodes.length < 2) return;

    this.ctx.strokeStyle = this.colors.path;
    this.ctx.lineWidth = 4 / this.camera.zoom;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();

    for (let i = 0; i < path.nodes.length; i++) {
      const node = network.getNode(path.nodes[i]);
      if (!node) continue;

      const x = node.position.x * this.cellSize + this.cellSize / 2;
      const y = node.position.y * this.cellSize + this.cellSize / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Draw start and end markers
    const startNode = network.getNode(path.nodes[0]);
    const endNode = network.getNode(path.nodes[path.nodes.length - 1]);

    if (startNode) {
      const x = startNode.position.x * this.cellSize + this.cellSize / 2;
      const y = startNode.position.y * this.cellSize + this.cellSize / 2;
      this.ctx.fillStyle = '#00ff00';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 8 / this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (endNode) {
      const x = endNode.position.x * this.cellSize + this.cellSize / 2;
      const y = endNode.position.y * this.cellSize + this.cellSize / 2;
      this.ctx.fillStyle = '#ff0000';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 8 / this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Draw arrow on an edge
   */
  private drawArrow(x1: number, y1: number, x2: number, y2: number): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowSize = 10 / this.camera.zoom;

    // Arrow position (middle of edge)
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(mx, my);
    this.ctx.lineTo(
      mx - arrowSize * Math.cos(angle - Math.PI / 6),
      my - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(mx, my);
    this.ctx.lineTo(
      mx - arrowSize * Math.cos(angle + Math.PI / 6),
      my - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  /**
   * Toggle node visualization
   */
  toggleNodes(): void {
    this.showNodes = !this.showNodes;
  }

  /**
   * Toggle edge visualization
   */
  toggleEdges(): void {
    this.showEdges = !this.showEdges;
  }

  /**
   * Set path to visualize
   */
  setPath(path: Path | null): void {
    this.showPath = path;
  }

  /**
   * Get current visualization state
   */
  getState(): { nodes: boolean; edges: boolean; hasPath: boolean } {
    return {
      nodes: this.showNodes,
      edges: this.showEdges,
      hasPath: this.showPath !== null,
    };
  }
}
