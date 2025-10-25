import { DataPoint } from './HistoricalDataCollector';

export interface ChartConfig {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  title?: string;
  yLabel?: string;
  lineColor?: string;
  fillColor?: string;
  gridColor?: string;
  textColor?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showFill?: boolean;
  minY?: number;
  maxY?: number;
}

/**
 * Renders statistical charts on a canvas
 */
export class ChartRenderer {
  private ctx: CanvasRenderingContext2D;
  private defaultConfig: ChartConfig = {
    width: 400,
    height: 200,
    padding: {
      top: 30,
      right: 20,
      bottom: 30,
      left: 50,
    },
    lineColor: '#00ff00',
    fillColor: 'rgba(0, 255, 0, 0.2)',
    gridColor: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    showGrid: true,
    showFill: true,
  };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Render a line chart
   */
  renderLineChart(data: DataPoint[], config: Partial<ChartConfig> = {}): void {
    const cfg = { ...this.defaultConfig, ...config };

    if (data.length === 0) {
      this.renderEmptyChart(cfg);
      return;
    }

    // Calculate chart area
    const chartX = cfg.padding.left;
    const chartY = cfg.padding.top;
    const chartWidth = cfg.width - cfg.padding.left - cfg.padding.right;
    const chartHeight = cfg.height - cfg.padding.top - cfg.padding.bottom;

    // Clear and draw background
    this.ctx.fillStyle = cfg.backgroundColor!;
    this.ctx.fillRect(0, 0, cfg.width, cfg.height);

    // Draw title
    if (cfg.title) {
      this.ctx.fillStyle = cfg.textColor!;
      this.ctx.font = 'bold 14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(cfg.title, cfg.width / 2, 20);
    }

    // Find data range
    let minY = cfg.minY ?? Math.min(...data.map(d => d.value));
    let maxY = cfg.maxY ?? Math.max(...data.map(d => d.value));

    // Add padding to Y range
    const yRange = maxY - minY;
    if (yRange === 0) {
      minY -= 1;
      maxY += 1;
    } else {
      minY -= yRange * 0.1;
      maxY += yRange * 0.1;
    }

    // Draw grid
    if (cfg.showGrid) {
      this.drawGrid(chartX, chartY, chartWidth, chartHeight, cfg.gridColor!, cfg.textColor!);
    }

    // Draw Y axis labels
    this.drawYAxis(chartX, chartY, chartHeight, minY, maxY, cfg.textColor!, cfg.yLabel);

    // Draw line
    this.ctx.beginPath();
    this.ctx.strokeStyle = cfg.lineColor!;
    this.ctx.lineWidth = 2;

    for (let i = 0; i < data.length; i++) {
      const x = chartX + (i / (data.length - 1)) * chartWidth;
      const y = chartY + chartHeight - ((data[i].value - minY) / (maxY - minY)) * chartHeight;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Draw fill
    if (cfg.showFill) {
      this.ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
      this.ctx.lineTo(chartX, chartY + chartHeight);
      this.ctx.closePath();
      this.ctx.fillStyle = cfg.fillColor!;
      this.ctx.fill();
    }

    // Draw current value indicator
    if (data.length > 0) {
      const lastData = data[data.length - 1];
      const lastX = chartX + chartWidth;
      const lastY = chartY + chartHeight - ((lastData.value - minY) / (maxY - minY)) * chartHeight;

      this.ctx.fillStyle = cfg.lineColor!;
      this.ctx.beginPath();
      this.ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw value text
      this.ctx.fillStyle = cfg.textColor!;
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(this.formatValue(lastData.value), lastX - 10, lastY - 10);
    }
  }

  /**
   * Render multiple line charts on the same canvas
   */
  renderMultiLineChart(
    datasets: Array<{ data: DataPoint[]; label: string; color: string }>,
    config: Partial<ChartConfig> = {}
  ): void {
    const cfg = { ...this.defaultConfig, ...config };

    if (datasets.length === 0 || datasets.every(d => d.data.length === 0)) {
      this.renderEmptyChart(cfg);
      return;
    }

    // Calculate chart area
    const chartX = cfg.padding.left;
    const chartY = cfg.padding.top;
    const chartWidth = cfg.width - cfg.padding.left - cfg.padding.right;
    const chartHeight = cfg.height - cfg.padding.top - cfg.padding.bottom;

    // Clear and draw background
    this.ctx.fillStyle = cfg.backgroundColor!;
    this.ctx.fillRect(0, 0, cfg.width, cfg.height);

    // Draw title
    if (cfg.title) {
      this.ctx.fillStyle = cfg.textColor!;
      this.ctx.font = 'bold 14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(cfg.title, cfg.width / 2, 20);
    }

    // Find global data range
    const allValues = datasets.flatMap(d => d.data.map(p => p.value));
    let minY = cfg.minY ?? Math.min(...allValues);
    let maxY = cfg.maxY ?? Math.max(...allValues);

    const yRange = maxY - minY;
    if (yRange === 0) {
      minY -= 1;
      maxY += 1;
    } else {
      minY -= yRange * 0.1;
      maxY += yRange * 0.1;
    }

    // Draw grid
    if (cfg.showGrid) {
      this.drawGrid(chartX, chartY, chartWidth, chartHeight, cfg.gridColor!, cfg.textColor!);
    }

    // Draw Y axis
    this.drawYAxis(chartX, chartY, chartHeight, minY, maxY, cfg.textColor!, cfg.yLabel);

    // Draw each dataset
    for (const dataset of datasets) {
      if (dataset.data.length === 0) continue;

      this.ctx.beginPath();
      this.ctx.strokeStyle = dataset.color;
      this.ctx.lineWidth = 2;

      for (let i = 0; i < dataset.data.length; i++) {
        const x = chartX + (i / (dataset.data.length - 1)) * chartWidth;
        const y = chartY + chartHeight - ((dataset.data[i].value - minY) / (maxY - minY)) * chartHeight;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.stroke();
    }

    // Draw legend
    this.drawLegend(datasets, cfg.width - 150, cfg.padding.top, cfg.textColor!);
  }

  /**
   * Draw grid lines
   */
  private drawGrid(x: number, y: number, width: number, height: number, gridColor: string, _textColor: string): void {
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const gridY = y + (i / 4) * height;
      this.ctx.beginPath();
      this.ctx.moveTo(x, gridY);
      this.ctx.lineTo(x + width, gridY);
      this.ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const gridX = x + (i / 5) * width;
      this.ctx.beginPath();
      this.ctx.moveTo(gridX, y);
      this.ctx.lineTo(gridX, y + height);
      this.ctx.stroke();
    }
  }

  /**
   * Draw Y axis with labels
   */
  private drawYAxis(x: number, y: number, height: number, minY: number, maxY: number, textColor: string, yLabel?: string): void {
    this.ctx.fillStyle = textColor;
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'right';

    // Draw Y axis labels
    for (let i = 0; i <= 4; i++) {
      const value = maxY - (i / 4) * (maxY - minY);
      const labelY = y + (i / 4) * height;
      this.ctx.fillText(this.formatValue(value), x - 10, labelY + 4);
    }

    // Draw Y axis label
    if (yLabel) {
      this.ctx.save();
      this.ctx.translate(15, y + height / 2);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.fillText(yLabel, 0, 0);
      this.ctx.restore();
    }
  }

  /**
   * Draw legend for multi-line chart
   */
  private drawLegend(datasets: Array<{ label: string; color: string }>, x: number, y: number, _textColor: string): void {
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'left';

    datasets.forEach((dataset, i) => {
      const legendY = y + i * 20;

      // Draw colored line
      this.ctx.strokeStyle = dataset.color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, legendY);
      this.ctx.lineTo(x + 20, legendY);
      this.ctx.stroke();

      // Draw label
      this.ctx.fillStyle = _textColor;
      this.ctx.fillText(dataset.label, x + 25, legendY + 4);
    });
  }

  /**
   * Render empty chart message
   */
  private renderEmptyChart(cfg: ChartConfig): void {
    this.ctx.fillStyle = cfg.backgroundColor!;
    this.ctx.fillRect(0, 0, cfg.width, cfg.height);

    this.ctx.fillStyle = cfg.textColor!;
    this.ctx.font = '14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('No data available', cfg.width / 2, cfg.height / 2);
  }

  /**
   * Format numeric value for display
   */
  private formatValue(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else if (Math.abs(value) < 1 && value !== 0) {
      return value.toFixed(2);
    } else {
      return Math.round(value).toString();
    }
  }
}
