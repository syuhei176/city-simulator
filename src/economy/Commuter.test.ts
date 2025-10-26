/**
 * Tests for Commuter class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Commuter, CommuteState } from './Commuter';
import { Path } from '@/transport/types';

describe('Commuter', () => {
  let commuter: Commuter;
  const homeLocation = { x: 0, y: 0 };
  const workLocation = { x: 10, y: 10 };

  beforeEach(() => {
    commuter = new Commuter('citizen1', homeLocation, workLocation, 300);
  });

  describe('Speed-based movement', () => {
    it('should initialize with default speed', () => {
      expect(commuter.baseSpeed).toBe(0.5);
      expect(commuter.currentSpeed).toBe(0.5);
    });

    it('should progress at base speed without congestion', () => {
      const path: Path = {
        nodes: ['0,0', '1,0', '2,0', '3,0', '4,0'],
        totalCost: 4,
        distance: 4,
        exists: true,
      };

      commuter.startCommute(path);
      expect(commuter.state).toBe(CommuteState.COMMUTING);
      expect(commuter.currentPathIndex).toBe(0);

      // First update: should progress by 0.5 nodes
      commuter.update();
      expect(commuter.currentPathIndex).toBe(0.5);
      expect(commuter.commuteTime).toBe(1);

      // Second update: should progress to 1.0
      commuter.update();
      expect(commuter.currentPathIndex).toBe(1.0);
      expect(commuter.commuteTime).toBe(2);
    });

    it('should take realistic time for a path', () => {
      const path: Path = {
        nodes: ['0,0', '1,0', '2,0', '3,0', '4,0', '5,0'],
        totalCost: 5,
        distance: 5,
        exists: true,
      };

      commuter.startCommute(path);

      let ticks = 0;
      while (commuter.state === CommuteState.COMMUTING && ticks < 100) {
        commuter.update();
        ticks++;
      }

      // With 6 nodes and speed 0.5, should take about 10 ticks
      // (need to traverse 5 edges at 0.5 nodes/tick = 10 ticks)
      expect(commuter.state).toBe(CommuteState.AT_WORK);
      expect(ticks).toBeGreaterThanOrEqual(10);
      expect(ticks).toBeLessThanOrEqual(12); // Allow some margin
    });

    it('should slow down when speed is reduced', () => {
      const path: Path = {
        nodes: ['0,0', '1,0', '2,0', '3,0'],
        totalCost: 3,
        distance: 3,
        exists: true,
      };

      commuter.startCommute(path);

      // Simulate congestion: reduce speed to 25% of base
      commuter.setSpeed(commuter.baseSpeed * 0.25);

      let ticks = 0;
      while (commuter.state === CommuteState.COMMUTING && ticks < 100) {
        commuter.update();
        ticks++;
      }

      // With 4 nodes and speed 0.125, should take about 24 ticks
      // (need to traverse 3 edges at 0.125 nodes/tick = 24 ticks)
      expect(commuter.state).toBe(CommuteState.AT_WORK);
      expect(ticks).toBeGreaterThanOrEqual(22);
      expect(ticks).toBeLessThanOrEqual(26);
    });

    it('should fail if commute takes too long', () => {
      const path: Path = {
        nodes: Array.from({ length: 100 }, (_, i) => `${i},0`),
        totalCost: 99,
        distance: 99,
        exists: true,
      };

      commuter.startCommute(path);
      commuter.setSpeed(0.1); // Very slow speed

      let ticks = 0;
      while (
        commuter.state === CommuteState.COMMUTING &&
        ticks < commuter.maxCommuteTime + 10
      ) {
        commuter.update();
        ticks++;
      }

      // Should fail due to exceeding max commute time
      expect(commuter.state).toBe(CommuteState.FAILED);
      expect(commuter.hasFailed()).toBe(true);
    });
  });

  describe('getCurrentEdge', () => {
    it('should return correct edge for fractional path index', () => {
      const path: Path = {
        nodes: ['0,0', '1,0', '2,0', '3,0'],
        totalCost: 3,
        distance: 3,
        exists: true,
      };

      commuter.startCommute(path);
      commuter.currentPathIndex = 0.7; // Between first and second node

      const edge = commuter.getCurrentEdge();
      expect(edge).toEqual({ from: '0,0', to: '1,0' });

      commuter.currentPathIndex = 1.3; // Between second and third node
      const edge2 = commuter.getCurrentEdge();
      expect(edge2).toEqual({ from: '1,0', to: '2,0' });
    });
  });
});
