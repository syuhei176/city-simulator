import { describe, it, expect, beforeEach } from 'vitest';
import { GridPathFinding } from './GridPathFinding';
import { Grid } from '@/core/Grid';
import { CellType } from '@/core/types';

describe('GridPathFinding', () => {
  let grid: Grid;
  let pathFinding: GridPathFinding;

  beforeEach(() => {
    // Create a 10x10 grid for testing
    grid = new Grid(10, 10);
    pathFinding = new GridPathFinding(grid);
  });

  describe('Simple path finding', () => {
    it('should find path between two adjacent cells', () => {
      console.log('\n=== Test: Adjacent cells ===');
      const start = { x: 5, y: 5 };
      const end = { x: 6, y: 5 };

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      console.log('Path nodes:', path.nodes);
      console.log('Path cost:', path.totalCost);

      expect(path.exists).toBe(true);
      expect(path.nodes.length).toBeGreaterThan(0);
    });

    it('should find path between two cells 3 units apart', () => {
      console.log('\n=== Test: 3 units apart ===');
      const start = { x: 5, y: 5 };
      const end = { x: 8, y: 5 };

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      console.log('Path nodes:', path.nodes);
      console.log('Path cost:', path.totalCost);

      expect(path.exists).toBe(true);
      expect(path.nodes.length).toBeGreaterThan(0);
    });

    it('should find path with roads (lower cost)', () => {
      console.log('\n=== Test: Path with roads ===');

      // Create a horizontal road from (5,5) to (8,5)
      for (let x = 5; x <= 8; x++) {
        const cell = grid.getCell(x, 5);
        if (cell) {
          cell.type = CellType.ROAD;
        }
      }

      const start = { x: 5, y: 5 };
      const end = { x: 8, y: 5 };

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      console.log('Path nodes:', path.nodes);
      console.log('Path cost:', path.totalCost);
      console.log('Expected cost (3 * 1.0):', 3);

      expect(path.exists).toBe(true);
      expect(path.totalCost).toBeLessThan(10); // Should be ~3 with roads, not 15 with walking
    });

    it('should prefer roads over walking', () => {
      console.log('\n=== Test: Prefer roads over direct walking ===');

      // Create an L-shaped road: (0,0) -> (5,0) -> (5,5)
      for (let x = 0; x <= 5; x++) {
        const cell = grid.getCell(x, 0);
        if (cell) {
          cell.type = CellType.ROAD;
        }
      }
      for (let y = 0; y <= 5; y++) {
        const cell = grid.getCell(5, y);
        if (cell) {
          cell.type = CellType.ROAD;
        }
      }

      const start = { x: 0, y: 0 };
      const end = { x: 5, y: 5 };

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      console.log('Path nodes:', path.nodes);
      console.log('Path cost:', path.totalCost);
      console.log('Manhattan distance:', 10);
      console.log('Cost via roads (10 * 1.0):', 10);
      console.log('Cost via walking (10 * 5.0):', 50);

      expect(path.exists).toBe(true);
      // Path should use roads (cost ~10) rather than cutting diagonally through non-roads (cost ~50)
      expect(path.totalCost).toBeLessThan(15);
    });

    it('should handle same start and end position', () => {
      console.log('\n=== Test: Same start and end ===');
      const start = { x: 5, y: 5 };
      const end = { x: 5, y: 5 };

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      console.log('Path nodes:', path.nodes);
      console.log('Path cost:', path.totalCost);

      expect(path.exists).toBe(true);
      expect(path.totalCost).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should return no path for out of bounds positions', () => {
      console.log('\n=== Test: Out of bounds ===');
      const start = { x: -1, y: 5 };
      const end = { x: 5, y: 5 };

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      expect(path.exists).toBe(false);
    });

    it('should find path across entire grid', () => {
      console.log('\n=== Test: Across entire grid ===');
      const start = { x: 0, y: 0 };
      const end = { x: 9, y: 9 };

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      console.log('Path nodes:', path.nodes);
      console.log('Path cost:', path.totalCost);
      console.log('Manhattan distance:', 18);

      expect(path.exists).toBe(true);
      expect(path.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('Debugging the actual bug', () => {
    it('should reproduce the bug from logs', () => {
      console.log('\n=== Test: Reproduce actual bug ===');

      // Test with the exact coordinates from the log: (85,99) to (88,96)
      // But our test grid is only 10x10, so scale it down: (5,9) to (8,6)

      const start = { x: 5, y: 9 };
      const end = { x: 8, y: 6 };

      console.log(`Finding path from (${start.x},${start.y}) to (${end.x},${end.y})`);
      console.log(`Manhattan distance: ${Math.abs(end.x - start.x) + Math.abs(end.y - start.y)}`);

      const path = pathFinding.findPath(start, end);

      console.log('Path found:', path.exists);
      console.log('Path nodes:', path.nodes);
      console.log('Path cost:', path.totalCost);

      expect(path.exists).toBe(true);
      expect(path.nodes.length).toBeGreaterThan(0);
    });
  });
});
