/**
 * Core type definitions for the city simulator
 */

export interface Position {
  x: number;
  y: number;
}

export enum CellType {
  EMPTY = 'empty',
  ROAD = 'road',
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  PARK = 'park',
  POWER_PLANT = 'power_plant',
  WATER_FACILITY = 'water_facility',
}

export enum ZoneType {
  NONE = 'none',
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
}

export enum RoadType {
  SMALL = 'small',      // 2 lanes
  MEDIUM = 'medium',    // 4 lanes
  LARGE = 'large',      // 6 lanes
  HIGHWAY = 'highway',  // 8 lanes
}

export interface CellData {
  type: CellType;
  zoneType: ZoneType;
  roadType?: RoadType;
  buildingLevel: number; // 0 = empty, 1-3 = building growth level
  roadConnections: {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
  };
}

export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  tickRate: number; // Simulation ticks per second
}
