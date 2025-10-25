import { GameEngine } from '@/core/GameEngine';
import { CellType, ZoneType, RoadType } from '@/core/types';

export interface SaveData {
  version: string;
  timestamp: number;
  gameTime: number;
  speed: number;
  stats: any;
  cells: Array<{
    x: number;
    y: number;
    type: CellType;
    zoneType: ZoneType;
    roadType?: RoadType;
    buildingLevel: number;
    population: number;
    trafficDensity: number;
    powerSupply: number;
    waterSupply: number;
    roadAccess: boolean;
    demand: number;
    roadConnections: {
      north: boolean;
      east: boolean;
      south: boolean;
      west: boolean;
    };
  }>;
}

/**
 * Manages save/load functionality using LocalStorage
 */
export class SaveLoadManager {
  private static readonly STORAGE_KEY = 'city-simulator-save';
  private static readonly MAX_SAVES = 5;
  private static readonly VERSION = '1.0.0';

  /**
   * Save current game state
   */
  static save(engine: GameEngine, slotName: string = 'autosave'): boolean {
    try {
      const grid = engine.getGrid();
      const saveData: SaveData = {
        version: this.VERSION,
        timestamp: Date.now(),
        gameTime: engine.getGameTime(),
        speed: engine.getSpeed(),
        stats: { ...engine.stats },
        cells: [],
      };

      // Save only non-empty cells to reduce size
      const allCells = grid.getAllCells();
      for (const cell of allCells) {
        if (cell.type !== CellType.EMPTY || cell.population > 0) {
          saveData.cells.push({
            x: cell.x,
            y: cell.y,
            type: cell.type,
            zoneType: cell.zoneType,
            roadType: cell.roadType,
            buildingLevel: cell.buildingLevel,
            population: cell.population,
            trafficDensity: cell.trafficDensity,
            powerSupply: cell.powerSupply,
            waterSupply: cell.waterSupply,
            roadAccess: cell.roadAccess,
            demand: cell.demand,
            roadConnections: { ...cell.roadConnections },
          });
        }
      }

      // Get existing saves
      const saves = this.getAllSaves();
      saves[slotName] = saveData;

      // Limit number of saves
      const saveKeys = Object.keys(saves);
      if (saveKeys.length > this.MAX_SAVES) {
        // Remove oldest save (except autosave)
        const sortedKeys = saveKeys
          .filter(k => k !== 'autosave')
          .sort((a, b) => saves[a].timestamp - saves[b].timestamp);
        if (sortedKeys.length > 0) {
          delete saves[sortedKeys[0]];
        }
      }

      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
      console.log(`Game saved to slot: ${slotName}`);
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  /**
   * Load game state from a save slot
   */
  static load(engine: GameEngine, slotName: string = 'autosave'): boolean {
    try {
      const saves = this.getAllSaves();
      const saveData = saves[slotName];

      if (!saveData) {
        console.warn(`No save found in slot: ${slotName}`);
        return false;
      }

      // Verify version compatibility
      if (saveData.version !== this.VERSION) {
        console.warn('Save file version mismatch, attempting to load anyway...');
      }

      // Clear current grid
      const grid = engine.getGrid();
      const allCells = grid.getAllCells();
      for (const cell of allCells) {
        cell.clear();
      }

      // Restore cells
      for (const cellData of saveData.cells) {
        const cell = grid.getCell(cellData.x, cellData.y);
        if (cell) {
          cell.type = cellData.type;
          cell.zoneType = cellData.zoneType;
          cell.roadType = cellData.roadType;
          cell.buildingLevel = cellData.buildingLevel;
          cell.population = cellData.population;
          cell.trafficDensity = cellData.trafficDensity;
          cell.powerSupply = cellData.powerSupply;
          cell.waterSupply = cellData.waterSupply;
          cell.roadAccess = cellData.roadAccess;
          cell.demand = cellData.demand;
          cell.roadConnections = { ...cellData.roadConnections };
        }
      }

      // Restore game state
      engine.setSpeed(saveData.speed);
      Object.assign(engine.stats, saveData.stats);

      // Mark network as dirty to rebuild
      engine.markNetworkDirty();
      engine.rebuildNetwork();

      console.log(`Game loaded from slot: ${slotName}`);
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  /**
   * Get all saves
   */
  static getAllSaves(): Record<string, SaveData> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return {};
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load saves:', error);
      return {};
    }
  }

  /**
   * Delete a save
   */
  static deleteSave(slotName: string): boolean {
    try {
      const saves = this.getAllSaves();
      if (saves[slotName]) {
        delete saves[slotName];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
        console.log(`Save deleted: ${slotName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  /**
   * Export save data as JSON file
   */
  static exportSave(slotName: string): void {
    const saves = this.getAllSaves();
    const saveData = saves[slotName];
    if (!saveData) {
      console.warn(`No save found in slot: ${slotName}`);
      return;
    }

    const dataStr = JSON.stringify(saveData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `city-simulator-${slotName}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Save exported: ${slotName}`);
  }

  /**
   * Import save data from JSON file
   */
  static importSave(file: File, slotName: string, callback: (success: boolean) => void): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target?.result as string) as SaveData;
        const saves = this.getAllSaves();
        saves[slotName] = saveData;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
        console.log(`Save imported to slot: ${slotName}`);
        callback(true);
      } catch (error) {
        console.error('Failed to import save:', error);
        callback(false);
      }
    };
    reader.onerror = () => {
      console.error('Failed to read file');
      callback(false);
    };
    reader.readAsText(file);
  }

  /**
   * Check if a save exists
   */
  static hasSave(slotName: string): boolean {
    const saves = this.getAllSaves();
    return !!saves[slotName];
  }

  /**
   * Get save info without loading the full save
   */
  static getSaveInfo(slotName: string): { timestamp: number; gameTime: number; population: number } | null {
    const saves = this.getAllSaves();
    const saveData = saves[slotName];
    if (!saveData) return null;

    return {
      timestamp: saveData.timestamp,
      gameTime: saveData.gameTime,
      population: saveData.stats?.population || 0,
    };
  }
}
