/**
 * Historical data collector for tracking game statistics over time
 */
export interface DataPoint {
  time: number;
  value: number;
}

export interface HistoricalData {
  population: DataPoint[];
  money: DataPoint[];
  income: DataPoint[];
  expenses: DataPoint[];
  citizens: DataPoint[];
  employed: DataPoint[];
  unemployed: DataPoint[];
  unemploymentRate: DataPoint[];
  vehicleCount: DataPoint[];
  trafficCongestion: DataPoint[];
  averageTrafficSpeed: DataPoint[];
  residentialDemand: DataPoint[];
  commercialDemand: DataPoint[];
  industrialDemand: DataPoint[];
  transitRidership: DataPoint[];
  transitCoverage: DataPoint[];
  totalCommuters: DataPoint[];
  activeCommuters: DataPoint[];
  failedCommuters: DataPoint[];
  averageCommuteTime: DataPoint[];
}

export class HistoricalDataCollector {
  private data: HistoricalData;
  private maxDataPoints: number;
  private sampleInterval: number; // Sample every N ticks
  private ticksSinceLastSample: number = 0;

  constructor(maxDataPoints: number = 200, sampleInterval: number = 10) {
    this.maxDataPoints = maxDataPoints;
    this.sampleInterval = sampleInterval;
    this.data = {
      population: [],
      money: [],
      income: [],
      expenses: [],
      citizens: [],
      employed: [],
      unemployed: [],
      unemploymentRate: [],
      vehicleCount: [],
      trafficCongestion: [],
      averageTrafficSpeed: [],
      residentialDemand: [],
      commercialDemand: [],
      industrialDemand: [],
      transitRidership: [],
      transitCoverage: [],
      totalCommuters: [],
      activeCommuters: [],
      failedCommuters: [],
      averageCommuteTime: [],
    };
  }

  /**
   * Update with current game statistics
   */
  update(time: number, stats: any): void {
    this.ticksSinceLastSample++;

    // Only sample at intervals to reduce data size
    if (this.ticksSinceLastSample < this.sampleInterval) {
      return;
    }

    this.ticksSinceLastSample = 0;

    // Add new data points
    this.addDataPoint(this.data.population, time, stats.population);
    this.addDataPoint(this.data.money, time, stats.money);
    this.addDataPoint(this.data.income, time, stats.income);
    this.addDataPoint(this.data.expenses, time, stats.expenses);
    this.addDataPoint(this.data.citizens, time, stats.citizens);
    this.addDataPoint(this.data.employed, time, stats.employed);
    this.addDataPoint(this.data.unemployed, time, stats.unemployed);
    this.addDataPoint(this.data.unemploymentRate, time, stats.unemploymentRate);
    this.addDataPoint(this.data.vehicleCount, time, stats.vehicleCount);
    this.addDataPoint(this.data.trafficCongestion, time, stats.trafficCongestion);
    this.addDataPoint(this.data.averageTrafficSpeed, time, stats.averageTrafficSpeed);
    this.addDataPoint(this.data.residentialDemand, time, stats.residentialDemand);
    this.addDataPoint(this.data.commercialDemand, time, stats.commercialDemand);
    this.addDataPoint(this.data.industrialDemand, time, stats.industrialDemand);
    this.addDataPoint(this.data.transitRidership, time, stats.transitRidership);
    this.addDataPoint(this.data.transitCoverage, time, stats.transitCoverage);
    this.addDataPoint(this.data.totalCommuters, time, stats.totalCommuters || 0);
    this.addDataPoint(this.data.activeCommuters, time, stats.activeCommuters || 0);
    this.addDataPoint(this.data.failedCommuters, time, stats.failedCommuters || 0);
    this.addDataPoint(this.data.averageCommuteTime, time, stats.averageCommuteTime || 0);
  }

  /**
   * Add a data point to an array and trim if needed
   */
  private addDataPoint(array: DataPoint[], time: number, value: number): void {
    array.push({ time, value });

    // Trim if exceeds max
    if (array.length > this.maxDataPoints) {
      array.shift();
    }
  }

  /**
   * Get all historical data
   */
  getData(): HistoricalData {
    return this.data;
  }

  /**
   * Get specific data series
   */
  getDataSeries(key: keyof HistoricalData): DataPoint[] {
    return this.data[key];
  }

  /**
   * Get latest value from a series
   */
  getLatestValue(key: keyof HistoricalData): number | null {
    const series = this.data[key];
    if (series.length === 0) return null;
    return series[series.length - 1].value;
  }

  /**
   * Get trend for a series (positive = increasing, negative = decreasing)
   */
  getTrend(key: keyof HistoricalData, lookback: number = 20): number {
    const series = this.data[key];
    if (series.length < lookback * 2) return 0;

    const recent = series.slice(-lookback);
    const older = series.slice(-lookback * 2, -lookback);

    const recentAvg = recent.reduce((sum, dp) => sum + dp.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, dp) => sum + dp.value, 0) / older.length;

    return recentAvg - olderAvg;
  }

  /**
   * Get average value over a period
   */
  getAverage(key: keyof HistoricalData, lookback?: number): number {
    const series = this.data[key];
    if (series.length === 0) return 0;

    const slice = lookback ? series.slice(-lookback) : series;
    return slice.reduce((sum, dp) => sum + dp.value, 0) / slice.length;
  }

  /**
   * Get min/max values for a series
   */
  getMinMax(key: keyof HistoricalData): { min: number; max: number } {
    const series = this.data[key];
    if (series.length === 0) return { min: 0, max: 0 };

    let min = Infinity;
    let max = -Infinity;

    for (const dp of series) {
      if (dp.value < min) min = dp.value;
      if (dp.value > max) max = dp.value;
    }

    return { min, max };
  }

  /**
   * Reset all data
   */
  reset(): void {
    for (const key in this.data) {
      (this.data as any)[key] = [];
    }
    this.ticksSinceLastSample = 0;
  }
}
