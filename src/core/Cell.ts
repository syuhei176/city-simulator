import { CellType, CellData, ZoneType, RoadType } from './types';

/**
 * Represents a single cell in the city grid
 */
export class Cell {
  public type: CellType;
  public zoneType: ZoneType;
  public roadType?: RoadType;
  public buildingLevel: number;
  public roadConnections: {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
  };

  // Traffic and resource properties
  public trafficDensity: number = 0; // 0-100
  public population: number = 0;
  public powerSupply: number = 0; // 0-100
  public waterSupply: number = 0; // 0-100
  public roadAccess: boolean = false; // Has access to a road
  public demand: number = 0; // Zone demand (0-100)

  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    this.type = CellType.EMPTY;
    this.zoneType = ZoneType.NONE;
    this.buildingLevel = 0;
    this.roadConnections = {
      north: false,
      east: false,
      south: false,
      west: false,
    };
  }

  /**
   * Sets this cell as a road
   */
  setRoad(roadType: RoadType): void {
    this.type = CellType.ROAD;
    this.roadType = roadType;
    this.zoneType = ZoneType.NONE;
    this.buildingLevel = 0;
  }

  /**
   * Sets this cell as a zone
   */
  setZone(zoneType: ZoneType): void {
    if (this.type === CellType.ROAD) return; // Can't zone over roads

    this.zoneType = zoneType;
    switch (zoneType) {
      case ZoneType.RESIDENTIAL:
        this.type = CellType.RESIDENTIAL;
        break;
      case ZoneType.COMMERCIAL:
        this.type = CellType.COMMERCIAL;
        break;
      case ZoneType.INDUSTRIAL:
        this.type = CellType.INDUSTRIAL;
        break;
      default:
        this.type = CellType.EMPTY;
    }
  }

  /**
   * Clears this cell
   */
  clear(): void {
    this.type = CellType.EMPTY;
    this.zoneType = ZoneType.NONE;
    this.roadType = undefined;
    this.buildingLevel = 0;
    this.roadConnections = {
      north: false,
      east: false,
      south: false,
      west: false,
    };
    this.trafficDensity = 0;
    this.population = 0;
  }

  /**
   * Check if this cell is a road
   */
  isRoad(): boolean {
    return this.type === CellType.ROAD;
  }

  /**
   * Check if this cell is buildable (zoned but no building)
   */
  isBuildable(): boolean {
    return this.zoneType !== ZoneType.NONE && this.buildingLevel === 0;
  }

  /**
   * Serialize cell data
   */
  toData(): CellData {
    return {
      type: this.type,
      zoneType: this.zoneType,
      roadType: this.roadType,
      buildingLevel: this.buildingLevel,
      roadConnections: { ...this.roadConnections },
    };
  }

  /**
   * Load cell data
   */
  fromData(data: CellData): void {
    this.type = data.type;
    this.zoneType = data.zoneType;
    this.roadType = data.roadType;
    this.buildingLevel = data.buildingLevel;
    this.roadConnections = { ...data.roadConnections };
  }
}
