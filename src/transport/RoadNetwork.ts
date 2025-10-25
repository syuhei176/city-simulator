import { Grid } from '@/core/Grid';
import { Cell } from '@/core/Cell';
import { RoadType } from '@/core/types';
import { RoadNode, RoadEdge } from './types';

/**
 * Road network graph structure
 * Manages nodes (intersections) and edges (road segments)
 */
export class RoadNetwork {
  private nodes: Map<string, RoadNode>;
  private edges: Map<string, RoadEdge>;
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
    this.nodes = new Map();
    this.edges = new Map();
  }

  /**
   * Build network from grid
   */
  buildFromGrid(): void {
    this.nodes.clear();
    this.edges.clear();

    const roadCells = this.grid.getRoadCells();

    // Create nodes for each road cell
    for (const cell of roadCells) {
      this.createNode(cell);
    }

    // Create edges between connected nodes
    for (const cell of roadCells) {
      this.createEdgesForCell(cell);
    }

    console.log(
      `Road network built: ${this.nodes.size} nodes, ${this.edges.size} edges`
    );
  }

  /**
   * Create a node for a road cell
   */
  private createNode(cell: Cell): void {
    const nodeId = this.getCellNodeId(cell.x, cell.y);
    const isIntersection = this.isIntersection(cell);

    const node: RoadNode = {
      id: nodeId,
      position: { x: cell.x, y: cell.y },
      connections: [],
      isIntersection,
    };

    this.nodes.set(nodeId, node);
  }

  /**
   * Check if a cell is an intersection (3 or 4 connections)
   */
  private isIntersection(cell: Cell): boolean {
    const connections = Object.values(cell.roadConnections).filter(Boolean);
    return connections.length >= 3;
  }

  /**
   * Create edges for a cell's connections
   */
  private createEdgesForCell(cell: Cell): void {
    const { roadConnections } = cell;

    // Check each direction
    if (roadConnections.north) {
      this.createEdge(cell, cell.x, cell.y - 1, 'north');
    }
    if (roadConnections.east) {
      this.createEdge(cell, cell.x + 1, cell.y, 'east');
    }
    if (roadConnections.south) {
      this.createEdge(cell, cell.x, cell.y + 1, 'south');
    }
    if (roadConnections.west) {
      this.createEdge(cell, cell.x - 1, cell.y, 'west');
    }
  }

  /**
   * Create an edge between two cells
   */
  private createEdge(
    fromCell: Cell,
    toX: number,
    toY: number,
    _direction: string
  ): void {
    const fromId = this.getCellNodeId(fromCell.x, fromCell.y);
    const toId = this.getCellNodeId(toX, toY);

    // Avoid duplicate edges
    const edgeId = `${fromId}-${toId}`;
    if (this.edges.has(edgeId)) return;

    const toCell = this.grid.getCell(toX, toY);
    if (!toCell || !toCell.isRoad()) return;

    const lanes = this.getLanesForRoadType(fromCell.roadType);
    const speedLimit = this.getSpeedLimitForRoadType(fromCell.roadType);
    const cost = this.calculateEdgeCost(fromCell, toCell);

    const edge: RoadEdge = {
      id: edgeId,
      from: fromId,
      to: toId,
      cost,
      lanes,
      speedLimit,
      bidirectional: true, // Most roads are bidirectional
    };

    this.edges.set(edgeId, edge);

    // Update node connections
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (fromNode && !fromNode.connections.includes(toId)) {
      fromNode.connections.push(toId);
    }
    if (toNode && !toNode.connections.includes(fromId)) {
      toNode.connections.push(fromId);
    }
  }

  /**
   * Calculate edge cost based on road properties
   */
  private calculateEdgeCost(fromCell: Cell, toCell: Cell): number {
    // Base cost is distance (1 for adjacent cells)
    let cost = 1;

    // Adjust cost based on road type (smaller = better)
    const fromType = fromCell.roadType || RoadType.SMALL;
    const toType = toCell.roadType || RoadType.SMALL;

    const roadTypeCost = {
      [RoadType.SMALL]: 1.5,
      [RoadType.MEDIUM]: 1.2,
      [RoadType.LARGE]: 1.0,
      [RoadType.HIGHWAY]: 0.5,
    };

    cost *= (roadTypeCost[fromType] + roadTypeCost[toType]) / 2;

    // Add traffic density penalty
    cost *= 1 + fromCell.trafficDensity / 200;

    return cost;
  }

  /**
   * Get number of lanes for road type
   */
  private getLanesForRoadType(roadType?: RoadType): number {
    switch (roadType) {
      case RoadType.SMALL:
        return 2;
      case RoadType.MEDIUM:
        return 4;
      case RoadType.LARGE:
        return 6;
      case RoadType.HIGHWAY:
        return 8;
      default:
        return 2;
    }
  }

  /**
   * Get speed limit for road type
   */
  private getSpeedLimitForRoadType(roadType?: RoadType): number {
    switch (roadType) {
      case RoadType.SMALL:
        return 30;
      case RoadType.MEDIUM:
        return 50;
      case RoadType.LARGE:
        return 70;
      case RoadType.HIGHWAY:
        return 100;
      default:
        return 30;
    }
  }

  /**
   * Get node ID from cell coordinates
   */
  private getCellNodeId(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Get node by position
   */
  getNodeAtPosition(x: number, y: number): RoadNode | undefined {
    return this.nodes.get(this.getCellNodeId(x, y));
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): RoadNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get edge by ID
   */
  getEdge(edgeId: string): RoadEdge | undefined {
    return this.edges.get(edgeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): RoadNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getAllEdges(): RoadEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(nodeId: string): RoadNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    return node.connections
      .map((id) => this.nodes.get(id))
      .filter((n): n is RoadNode => n !== undefined);
  }

  /**
   * Get edge between two nodes
   */
  getEdgeBetween(fromId: string, toId: string): RoadEdge | undefined {
    const edgeId1 = `${fromId}-${toId}`;
    const edgeId2 = `${toId}-${fromId}`;
    return this.edges.get(edgeId1) || this.edges.get(edgeId2);
  }

  /**
   * Check if network needs rebuild
   */
  needsRebuild(): boolean {
    const roadCells = this.grid.getRoadCells();
    return roadCells.length !== this.nodes.size;
  }

  /**
   * Get network statistics
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    intersectionCount: number;
    averageConnections: number;
  } {
    const nodes = this.getAllNodes();
    const intersectionCount = nodes.filter((n) => n.isIntersection).length;
    const totalConnections = nodes.reduce(
      (sum, n) => sum + n.connections.length,
      0
    );

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      intersectionCount,
      averageConnections:
        this.nodes.size > 0 ? totalConnections / this.nodes.size : 0,
    };
  }
}
