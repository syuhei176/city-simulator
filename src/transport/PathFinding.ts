import { RoadNetwork } from './RoadNetwork';
import { RoadNode, Path } from './types';
import { Position } from '@/core/types';
import { PriorityQueue } from '@/utils/PriorityQueue';

/**
 * A* pathfinding algorithm for road networks
 */
export class PathFinding {
  private network: RoadNetwork;

  constructor(network: RoadNetwork) {
    this.network = network;
  }

  /**
   * Find path between two positions using A* algorithm
   */
  findPath(start: Position, end: Position): Path {
    const startNode = this.network.getNodeAtPosition(start.x, start.y);
    const endNode = this.network.getNodeAtPosition(end.x, end.y);

    if (!startNode || !endNode) {
      return {
        nodes: [],
        totalCost: Infinity,
        distance: 0,
        exists: false,
      };
    }

    return this.aStar(startNode.id, endNode.id);
  }

  /**
   * Find path between two nodes using A* algorithm
   */
  findPathBetweenNodes(startNodeId: string, endNodeId: string): Path {
    return this.aStar(startNodeId, endNodeId);
  }

  /**
   * A* algorithm implementation
   */
  private aStar(startId: string, endId: string): Path {
    const startNode = this.network.getNode(startId);
    const endNode = this.network.getNode(endId);

    if (!startNode || !endNode) {
      return {
        nodes: [],
        totalCost: Infinity,
        distance: 0,
        exists: false,
      };
    }

    // Check if start node has any connections
    if (startNode.connections.length === 0) {
      return {
        nodes: [],
        totalCost: Infinity,
        distance: 0,
        exists: false,
      };
    }

    const openSet = new PriorityQueue<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    // Initialize
    gScore.set(startId, 0);
    fScore.set(startId, this.heuristic(startId, endId));
    openSet.enqueue(startId, fScore.get(startId)!);

    let iterations = 0;
    const maxIterations = 10000;

    while (!openSet.isEmpty()) {
      iterations++;
      if (iterations > maxIterations) {
        break;
      }

      const current = openSet.dequeue()!;

      // Reached destination
      if (current === endId) {
        return this.reconstructPath(cameFrom, current);
      }

      // Explore neighbors
      const neighbors = this.network.getNeighbors(current);

      for (const neighbor of neighbors) {
        const edge = this.network.getEdgeBetween(current, neighbor.id);
        if (!edge) {
          continue;
        }

        const tentativeGScore = (gScore.get(current) || Infinity) + edge.cost;

        if (tentativeGScore < (gScore.get(neighbor.id) || Infinity)) {
          // This path is better
          cameFrom.set(neighbor.id, current);
          gScore.set(neighbor.id, tentativeGScore);
          const h = this.heuristic(neighbor.id, endId);
          const f = tentativeGScore + h;
          fScore.set(neighbor.id, f);

          // Add to open set if not already there
          openSet.enqueue(neighbor.id, f);
        }
      }
    }

    // No path found
    return {
      nodes: [],
      totalCost: Infinity,
      distance: 0,
      exists: false,
    };
  }

  /**
   * Heuristic function (Manhattan distance)
   */
  private heuristic(nodeId1: string, nodeId2: string): number {
    const node1 = this.network.getNode(nodeId1);
    const node2 = this.network.getNode(nodeId2);

    if (!node1 || !node2) return Infinity;

    // Manhattan distance
    const dx = Math.abs(node1.position.x - node2.position.x);
    const dy = Math.abs(node1.position.y - node2.position.y);

    return dx + dy;
  }

  /**
   * Reconstruct path from came-from map
   */
  private reconstructPath(
    cameFrom: Map<string, string>,
    current: string
  ): Path {
    const path: string[] = [current];
    let totalCost = 0;

    while (cameFrom.has(current)) {
      const previous = current;
      current = cameFrom.get(current)!;
      path.unshift(current);

      // Add edge cost
      const edge = this.network.getEdgeBetween(current, previous);
      if (edge) {
        totalCost += edge.cost;
      }
    }

    // Calculate actual distance
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const node1 = this.network.getNode(path[i]);
      const node2 = this.network.getNode(path[i + 1]);
      if (node1 && node2) {
        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        distance += Math.sqrt(dx * dx + dy * dy);
      }
    }

    return {
      nodes: path,
      totalCost,
      distance,
      exists: true,
    };
  }

  /**
   * Find nearest road node to a position
   */
  findNearestRoadNode(position: Position): RoadNode | null {
    const allNodes = this.network.getAllNodes();
    if (allNodes.length === 0) return null;

    let nearest: RoadNode | null = null;
    let minDistance = Infinity;

    for (const node of allNodes) {
      const dx = node.position.x - position.x;
      const dy = node.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = node;
      }
    }

    return nearest;
  }

  /**
   * Check if there is a path between two positions
   */
  hasPath(start: Position, end: Position): boolean {
    const path = this.findPath(start, end);
    return path.exists;
  }
}
