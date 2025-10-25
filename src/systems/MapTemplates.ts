import { Grid } from '@/core/Grid';
import { RoadType } from '@/core/types';

export interface MapTemplate {
  name: string;
  description: string;
  apply: (grid: Grid) => void;
}

/**
 * Predefined map templates for quick setup
 */
export class MapTemplates {
  /**
   * Get all available templates
   */
  static getAllTemplates(): MapTemplate[] {
    return [
      this.getEmptyTemplate(),
      this.getGridCityTemplate(),
      this.getRadialCityTemplate(),
      this.getRiverCityTemplate(),
    ];
  }

  /**
   * Empty map (default)
   */
  private static getEmptyTemplate(): MapTemplate {
    return {
      name: '空のマップ',
      description: '何もない空のマップです',
      apply: (grid: Grid) => {
        // Clear all cells
        const cells = grid.getAllCells();
        for (const cell of cells) {
          cell.clear();
        }
      },
    };
  }

  /**
   * Grid city with major roads
   */
  private static getGridCityTemplate(): MapTemplate {
    return {
      name: 'グリッド都市',
      description: '格子状の道路網を持つ都市',
      apply: (grid: Grid) => {
        const width = grid.width;
        const height = grid.height;

        // Clear all cells
        const cells = grid.getAllCells();
        for (const cell of cells) {
          cell.clear();
        }

        // Create grid pattern with major roads every 20 cells
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = grid.getCell(x, y);
            if (!cell) continue;

            // Major roads
            if (x % 20 === 0 || y % 20 === 0) {
              cell.setRoad(x % 20 === 0 && y % 20 === 0 ? RoadType.LARGE : RoadType.MEDIUM);
            }
            // Minor roads
            else if (x % 10 === 0 || y % 10 === 0) {
              cell.setRoad(RoadType.SMALL);
            }
          }
        }

        // Update road connections manually
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = grid.getCell(x, y);
            if (cell && cell.isRoad()) {
              const north = grid.getCell(x, y - 1);
              const east = grid.getCell(x + 1, y);
              const south = grid.getCell(x, y + 1);
              const west = grid.getCell(x - 1, y);

              cell.roadConnections.north = !!north?.isRoad();
              cell.roadConnections.east = !!east?.isRoad();
              cell.roadConnections.south = !!south?.isRoad();
              cell.roadConnections.west = !!west?.isRoad();
            }
          }
        }
      },
    };
  }

  /**
   * Radial city with roads from center
   */
  private static getRadialCityTemplate(): MapTemplate {
    return {
      name: '放射状都市',
      description: '中心から放射状に伸びる道路網',
      apply: (grid: Grid) => {
        const width = grid.width;
        const height = grid.height;
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);

        // Clear all cells
        const cells = grid.getAllCells();
        for (const cell of cells) {
          cell.clear();
        }

        // Create ring roads
        const rings = [20, 40, 60, 80];
        for (const radius of rings) {
          const roadType = radius <= 40 ? RoadType.LARGE : RoadType.MEDIUM;
          for (let angle = 0; angle < 360; angle += 2) {
            const rad = (angle * Math.PI) / 180;
            const x = Math.floor(centerX + radius * Math.cos(rad));
            const y = Math.floor(centerY + radius * Math.sin(rad));
            const cell = grid.getCell(x, y);
            if (cell && !cell.isRoad()) {
              cell.setRoad(roadType);
            }
          }
        }

        // Create radial roads
        for (let angle = 0; angle < 360; angle += 30) {
          const rad = (angle * Math.PI) / 180;
          for (let r = 0; r < 100; r += 1) {
            const x = Math.floor(centerX + r * Math.cos(rad));
            const y = Math.floor(centerY + r * Math.sin(rad));
            const cell = grid.getCell(x, y);
            if (cell && !cell.isRoad()) {
              cell.setRoad(r < 50 ? RoadType.LARGE : RoadType.MEDIUM);
            }
          }
        }

        // Update road connections manually
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = grid.getCell(x, y);
            if (cell && cell.isRoad()) {
              const north = grid.getCell(x, y - 1);
              const east = grid.getCell(x + 1, y);
              const south = grid.getCell(x, y + 1);
              const west = grid.getCell(x - 1, y);

              cell.roadConnections.north = !!north?.isRoad();
              cell.roadConnections.east = !!east?.isRoad();
              cell.roadConnections.south = !!south?.isRoad();
              cell.roadConnections.west = !!west?.isRoad();
            }
          }
        }
      },
    };
  }

  /**
   * City with a river running through it
   */
  private static getRiverCityTemplate(): MapTemplate {
    return {
      name: '河川都市',
      description: '川が流れる都市（道路と橋）',
      apply: (grid: Grid) => {
        const width = grid.width;
        const height = grid.height;
        const centerY = Math.floor(height / 2);

        // Clear all cells
        const cells = grid.getAllCells();
        for (const cell of cells) {
          cell.clear();
        }

        // Create river (leave empty cells)
        const riverWidth = 8;
        const riverStart = centerY - Math.floor(riverWidth / 2);

        // Create grid roads on both sides
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = grid.getCell(x, y);
            if (!cell) continue;

            // Skip river area
            if (y >= riverStart && y < riverStart + riverWidth) {
              continue;
            }

            // Create roads
            if (x % 15 === 0 || y % 15 === 0) {
              cell.setRoad(RoadType.MEDIUM);
            } else if (x % 10 === 0 || y % 10 === 0) {
              cell.setRoad(RoadType.SMALL);
            }
          }
        }

        // Create bridges
        const bridgePositions = [30, 60, 90, 120, 150, 180];
        for (const x of bridgePositions) {
          for (let y = riverStart; y < riverStart + riverWidth; y++) {
            const cell = grid.getCell(x, y);
            if (cell) {
              cell.setRoad(RoadType.LARGE);
            }
          }
        }

        // Update road connections manually
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = grid.getCell(x, y);
            if (cell && cell.isRoad()) {
              const north = grid.getCell(x, y - 1);
              const east = grid.getCell(x + 1, y);
              const south = grid.getCell(x, y + 1);
              const west = grid.getCell(x - 1, y);

              cell.roadConnections.north = !!north?.isRoad();
              cell.roadConnections.east = !!east?.isRoad();
              cell.roadConnections.south = !!south?.isRoad();
              cell.roadConnections.west = !!west?.isRoad();
            }
          }
        }
      },
    };
  }

  /**
   * Apply a template by name
   */
  static applyTemplate(grid: Grid, templateName: string): boolean {
    const template = this.getAllTemplates().find(t => t.name === templateName);
    if (!template) {
      console.warn(`Template not found: ${templateName}`);
      return false;
    }

    template.apply(grid);
    console.log(`Applied template: ${templateName}`);
    return true;
  }
}
