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
  private largestComponent: Set<string> = new Set(); // Largest connected component

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
    console.log(`[Road Network] Building from ${roadCells.length} road cells`);

    // Create nodes for each road cell
    for (const cell of roadCells) {
      this.createNode(cell);
    }

    // Create edges between connected nodes
    for (const cell of roadCells) {
      this.createEdgesForCell(cell);
    }

    console.log(
      `[Road Network] Built: ${this.nodes.size} nodes, ${this.edges.size} edges`
    );

    // Log first few nodes for debugging
    if (this.nodes.size > 0 && this.nodes.size <= 10) {
      console.log(`[Road Network] Node IDs:`, Array.from(this.nodes.keys()));

      // Show connections for first few nodes
      const nodeArray = Array.from(this.nodes.values());
      for (let i = 0; i < Math.min(5, nodeArray.length); i++) {
        const node = nodeArray[i];
        console.log(`  Node ${node.id}: ${node.connections.length} connections ->`, node.connections.join(', '));
      }
    }

    // Check for isolated nodes (nodes with no connections)
    const isolatedNodes = Array.from(this.nodes.values()).filter(n => n.connections.length === 0);
    if (isolatedNodes.length > 0) {
      console.warn(`[Road Network] Warning: ${isolatedNodes.length} isolated nodes (no connections)`);
      if (isolatedNodes.length <= 5) {
        console.warn(`  Isolated nodes:`, isolatedNodes.map(n => n.id).join(', '));
      }
    }

    // Find connected components
    this.findConnectedComponents();
  }

  /**
   * Find connected components using DFS and identify the largest one
   */
  private findConnectedComponents(): void {
    const visited = new Set<string>();
    const components: string[][] = [];

    // DFS to find all nodes in a component
    const dfs = (nodeId: string, component: string[]) => {
      visited.add(nodeId);
      component.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (!node) return;

      for (const neighborId of node.connections) {
        if (!visited.has(neighborId)) {
          dfs(neighborId, component);
        }
      }
    };

    // Find all connected components
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        dfs(nodeId, component);
        components.push(component);
      }
    }

    // Find the largest component
    let largest: string[] = [];
    for (const component of components) {
      if (component.length > largest.length) {
        largest = component;
      }
    }

    this.largestComponent = new Set(largest);

    console.log(`[Road Network] Found ${components.length} connected component(s)`);
    if (components.length > 1) {
      console.log(`  Component sizes:`, components.map(c => c.length).join(', '));
      console.warn(`  Warning: Network is fragmented! Using largest component (${largest.length} nodes) for vehicle spawning`);
    } else {
      console.log(`  All ${this.nodes.size} nodes are connected ✓`);
    }
  }

  /**
   * Get nodes from the largest connected component
   */
  getConnectedNodes(): RoadNode[] {
    if (this.largestComponent.size === 0) {
      return this.getAllNodes();
    }
    return Array.from(this.largestComponent)
      .map(id => this.nodes.get(id))
      .filter((n): n is RoadNode => n !== undefined);
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
    direction: string
  ): void {
    const fromId = this.getCellNodeId(fromCell.x, fromCell.y);
    const toId = this.getCellNodeId(toX, toY);

    const toCell = this.grid.getCell(toX, toY);
    if (!toCell || !toCell.isRoad()) {
      console.log(`[Edge Creation] Failed: toCell at (${toX},${toY}) is not a road`);
      return;
    }

    // Create edge ID - use sorted IDs to avoid duplicates for bidirectional edges
    const edgeId1 = `${fromId}-${toId}`;
    const edgeId2 = `${toId}-${fromId}`;

    // Check if edge already exists in either direction
    if (this.edges.has(edgeId1) || this.edges.has(edgeId2)) {
      return;
    }

    const lanes = this.getLanesForRoadType(fromCell.roadType);
    const speedLimit = this.getSpeedLimitForRoadType(fromCell.roadType);
    const cost = this.calculateEdgeCost(fromCell, toCell);

    // Create edge in both directions for bidirectional roads
    const edge1: RoadEdge = {
      id: edgeId1,
      from: fromId,
      to: toId,
      cost,
      lanes,
      speedLimit,
      bidirectional: true,
    };

    const edge2: RoadEdge = {
      id: edgeId2,
      from: toId,
      to: fromId,
      cost,
      lanes,
      speedLimit,
      bidirectional: true,
    };

    this.edges.set(edgeId1, edge1);
    this.edges.set(edgeId2, edge2);

    // Update node connections (bidirectional)
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (fromNode && !fromNode.connections.includes(toId)) {
      fromNode.connections.push(toId);
    }
    if (toNode && !toNode.connections.includes(fromId)) {
      toNode.connections.push(fromId);
    }

    // Log first few edge creations
    if (this.edges.size <= 10) {
      console.log(`[Edge Created] ${fromId} <-> ${toId} (${direction})`);
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
