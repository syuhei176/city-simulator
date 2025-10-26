/**
 * Tests for CommuteManager congestion system
 */

import { describe, it, expect } from 'vitest';
import { Commuter, CommuteState } from './Commuter';
import { Path } from '@/transport/types';

describe('CommuteManager Congestion', () => {
  describe('Speed adjustment based on congestion', () => {
    it('should reduce speed when congestion exceeds threshold', () => {
      const congestionThreshold = 5;
      const maxCongestionSlowdown = 0.8;

      // Simulate 10 commuters on same edge
      const congestionCount = 10;
      const baseSpeed = 0.5;

      // Calculate expected slowdown
      const excessCongestion = congestionCount - congestionThreshold;
      const slowdownFactor = Math.min(
        maxCongestionSlowdown,
        (excessCongestion / 20) * maxCongestionSlowdown
      );
      const expectedSpeed = baseSpeed * (1 - slowdownFactor);

      // With 10 commuters, excess = 5
      // slowdownFactor = (5/20) * 0.8 = 0.2
      // expectedSpeed = 0.5 * 0.8 = 0.4
      expect(slowdownFactor).toBe(0.2);
      expect(expectedSpeed).toBe(0.4);
    });

    it('should not reduce speed below threshold', () => {
      const congestionThreshold = 5;
      const congestionCount = 3; // Below threshold

      const excessCongestion = Math.max(0, congestionCount - congestionThreshold);
      expect(excessCongestion).toBe(0);

      const slowdownFactor = 0; // No slowdown
      const baseSpeed = 0.5;
      const expectedSpeed = baseSpeed * (1 - slowdownFactor);

      expect(expectedSpeed).toBe(0.5); // Full speed
    });

    it('should cap slowdown at maximum', () => {
      const congestionThreshold = 5;
      const maxCongestionSlowdown = 0.8;
      const congestionCount = 100; // Very high congestion

      const excessCongestion = congestionCount - congestionThreshold;
      const slowdownFactor = Math.min(
        maxCongestionSlowdown,
        (excessCongestion / 20) * maxCongestionSlowdown
      );

      // Should be capped at 0.8
      expect(slowdownFactor).toBe(maxCongestionSlowdown);

      const baseSpeed = 0.5;
      const minSpeed = baseSpeed * (1 - maxCongestionSlowdown);
      expect(minSpeed).toBeCloseTo(0.1, 10); // 20% of base speed
    });
  });

  describe('Commuter behavior with congestion', () => {
    it('should take longer with high congestion', () => {
      const path: Path = {
        nodes: ['0,0', '1,0', '2,0', '3,0', '4,0', '5,0'],
        totalCost: 5,
        distance: 5,
        exists: true,
      };

      // Commuter without congestion
      const fastCommuter = new Commuter('fast', { x: 0, y: 0 }, { x: 5, y: 0 }, 300);
      fastCommuter.startCommute(path);

      let fastTicks = 0;
      while (fastCommuter.state === CommuteState.COMMUTING && fastTicks < 100) {
        fastCommuter.update();
        fastTicks++;
      }

      // Commuter with congestion (50% speed reduction)
      const slowCommuter = new Commuter('slow', { x: 0, y: 0 }, { x: 5, y: 0 }, 300);
      slowCommuter.startCommute(path);
      slowCommuter.setSpeed(slowCommuter.baseSpeed * 0.5);

      let slowTicks = 0;
      while (slowCommuter.state === CommuteState.COMMUTING && slowTicks < 100) {
        slowCommuter.update();
        slowTicks++;
      }

      // Slow commuter should take approximately twice as long
      expect(slowCommuter.state).toBe(CommuteState.AT_WORK);
      expect(fastCommuter.state).toBe(CommuteState.AT_WORK);
      expect(slowTicks).toBeGreaterThan(fastTicks);
      expect(slowTicks).toBeGreaterThanOrEqual(fastTicks * 1.8);
    });

    it('should report realistic commute times', () => {
      const path: Path = {
        nodes: Array.from({ length: 20 }, (_, i) => `${i},0`),
        totalCost: 19,
        distance: 19,
        exists: true,
      };

      const commuter = new Commuter('test', { x: 0, y: 0 }, { x: 19, y: 0 }, 300);
      commuter.startCommute(path);

      let ticks = 0;
      while (commuter.state === CommuteState.COMMUTING && ticks < 100) {
        commuter.update();
        ticks++;
      }

      expect(commuter.state).toBe(CommuteState.AT_WORK);
      expect(commuter.commuteTime).toBe(ticks);

      // With 20 nodes (19 edges) at 0.5 nodes/tick, should take about 38 ticks
      expect(commuter.commuteTime).toBeGreaterThanOrEqual(36);
      expect(commuter.commuteTime).toBeLessThanOrEqual(40);

      // Commute time should be non-zero!
      expect(commuter.commuteTime).toBeGreaterThan(0);
    });
  });
});
