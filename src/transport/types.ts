/**
 * Transport system type definitions
 */

import { Position } from '@/core/types';

/**
 * Road node represents an intersection or connection point
 */
export interface RoadNode {
  id: string;
  position: Position;
  connections: string[]; // IDs of connected nodes
  isIntersection: boolean;
}

/**
 * Road edge represents a connection between two nodes
 */
export interface RoadEdge {
  id: string;
  from: string; // Node ID
  to: string; // Node ID
  cost: number; // Travel cost (distance, time, etc.)
  lanes: number; // Number of lanes
  speedLimit: number; // Speed limit
  bidirectional: boolean; // Can travel in both directions
}

/**
 * Path finding result
 */
export interface Path {
  nodes: string[]; // Ordered list of node IDs
  totalCost: number;
  distance: number;
  exists: boolean;
}

/**
 * Traffic data for a road segment
 */
export interface TrafficData {
  edgeId: string;
  vehicleCount: number;
  averageSpeed: number;
  congestionLevel: number; // 0-100
}
