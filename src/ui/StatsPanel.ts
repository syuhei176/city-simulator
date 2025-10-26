import { HistoricalDataCollector } from '@/analytics/HistoricalDataCollector';
import { ChartRenderer } from '@/analytics/ChartRenderer';

export enum StatsPanelTab {
  OVERVIEW = 'overview',
  ECONOMY = 'economy',
  POPULATION = 'population',
  TRAFFIC = 'traffic',
  TRANSIT = 'transit',
}

/**
 * Advanced statistics panel with charts and detailed information
 */
export class StatsPanel {
  private container: HTMLElement;
  private panelElement: HTMLElement;
  private tabsElement: HTMLElement;
  private contentElement: HTMLElement;
  private chartCanvas: HTMLCanvasElement;
  private chartRenderer: ChartRenderer;
  private currentTab: StatsPanelTab = StatsPanelTab.OVERVIEW;
  private visible: boolean = false;
  private historicalData: HistoricalDataCollector;

  constructor(container: HTMLElement, historicalData: HistoricalDataCollector) {
    this.container = container;
    this.historicalData = historicalData;

    // Create panel
    this.panelElement = document.createElement('div');
    this.tabsElement = document.createElement('div');
    this.contentElement = document.createElement('div');

    // Create chart canvas
    this.chartCanvas = document.createElement('canvas');
    this.chartCanvas.width = 400;
    this.chartCanvas.height = 200;
    const ctx = this.chartCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for chart canvas');
    }
    this.chartRenderer = new ChartRenderer(ctx);

    this.init();
  }

  /**
   * Initialize panel
   */
  private init(): void {
    // Style panel
    this.panelElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      border-radius: 10px;
      border: 2px solid #444;
      min-width: 600px;
      max-width: 800px;
      max-height: 80vh;
      overflow: hidden;
      display: none;
      flex-direction: column;
      font-family: monospace;
      z-index: 1000;
    `;

    // Style tabs
    this.tabsElement.style.cssText = `
      display: flex;
      background: rgba(0, 0, 0, 0.5);
      border-bottom: 2px solid #444;
      padding: 0;
    `;

    // Style content
    this.contentElement.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      max-height: 70vh;
    `;

    // Create tabs
    this.createTabs();

    // Assemble panel
    this.panelElement.appendChild(this.tabsElement);
    this.panelElement.appendChild(this.contentElement);
    this.container.appendChild(this.panelElement);
  }

  /**
   * Create tab buttons
   */
  private createTabs(): void {
    const tabs = [
      { id: StatsPanelTab.OVERVIEW, label: '概要' },
      { id: StatsPanelTab.ECONOMY, label: '経済' },
      { id: StatsPanelTab.POPULATION, label: '人口' },
      { id: StatsPanelTab.TRAFFIC, label: '交通' },
      { id: StatsPanelTab.TRANSIT, label: '公共交通' },
    ];

    tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.textContent = tab.label;
      button.style.cssText = `
        flex: 1;
        padding: 15px;
        background: none;
        color: #888;
        border: none;
        cursor: pointer;
        font-family: monospace;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.2s;
      `;

      button.addEventListener('click', () => {
        this.setTab(tab.id);
      });

      // Highlight active tab
      if (tab.id === this.currentTab) {
        button.style.color = '#fff';
        button.style.background = 'rgba(255, 255, 255, 0.1)';
      }

      this.tabsElement.appendChild(button);
    });
  }

  /**
   * Set active tab
   */
  setTab(tab: StatsPanelTab): void {
    this.currentTab = tab;
    this.updateTabs();
    this.renderContent();
  }

  /**
   * Update tab button styles
   */
  private updateTabs(): void {
    const buttons = this.tabsElement.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const tabs = Object.values(StatsPanelTab);
      if (tabs[index] === this.currentTab) {
        (button as HTMLElement).style.color = '#fff';
        (button as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
      } else {
        (button as HTMLElement).style.color = '#888';
        (button as HTMLElement).style.background = 'none';
      }
    });
  }

  /**
   * Render content based on active tab
   */
  private renderContent(): void {
    this.contentElement.innerHTML = '';

    switch (this.currentTab) {
      case StatsPanelTab.OVERVIEW:
        this.renderOverview();
        break;
      case StatsPanelTab.ECONOMY:
        this.renderEconomy();
        break;
      case StatsPanelTab.POPULATION:
        this.renderPopulation();
        break;
      case StatsPanelTab.TRAFFIC:
        this.renderTraffic();
        break;
      case StatsPanelTab.TRANSIT:
        this.renderTransit();
        break;
    }
  }

  /**
   * Render overview tab
   */
  private renderOverview(): void {
    const title = document.createElement('h2');
    title.textContent = '都市概要';
    title.style.marginTop = '0';
    this.contentElement.appendChild(title);

    const text = document.createElement('p');
    text.textContent = '詳細な統計情報を見るには、上のタブを選択してください。';
    text.style.color = '#888';
    this.contentElement.appendChild(text);

    // Add summary stats
    const summary = document.createElement('div');
    summary.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 20px;
    `;

    const stats = [
      { label: '人口', value: this.historicalData.getLatestValue('population') || 0 },
      { label: '市民数', value: this.historicalData.getLatestValue('citizens') || 0 },
      { label: '資金', value: `$${(this.historicalData.getLatestValue('money') || 0).toLocaleString()}` },
      { label: '車両数', value: this.historicalData.getLatestValue('vehicleCount') || 0 },
    ];

    stats.forEach((stat) => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        padding: 15px;
        border-radius: 5px;
        border: 1px solid #444;
      `;

      const label = document.createElement('div');
      label.textContent = stat.label;
      label.style.cssText = `
        color: #888;
        font-size: 12px;
        margin-bottom: 5px;
      `;

      const value = document.createElement('div');
      value.textContent = stat.value.toString();
      value.style.cssText = `
        color: #fff;
        font-size: 24px;
        font-weight: bold;
      `;

      card.appendChild(label);
      card.appendChild(value);
      summary.appendChild(card);
    });

    this.contentElement.appendChild(summary);
  }

  /**
   * Render economy tab with chart
   */
  private renderEconomy(): void {
    const title = document.createElement('h2');
    title.textContent = '経済統計';
    title.style.marginTop = '0';
    this.contentElement.appendChild(title);

    // Render chart
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    `;

    const moneyData = this.historicalData.getDataSeries('money');
    const incomeData = this.historicalData.getDataSeries('income');
    const expensesData = this.historicalData.getDataSeries('expenses');

    // Clear canvas and render chart
    const ctx = this.chartCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);

    this.chartRenderer.renderMultiLineChart(
      [
        { data: moneyData, label: '資金', color: '#00ff00' },
        { data: incomeData, label: '収入', color: '#00ffff' },
        { data: expensesData, label: '支出', color: '#ff8800' },
      ],
      {
        title: '財政推移',
        width: 560,
        height: 250,
        yLabel: '金額 ($)',
      }
    );

    chartContainer.appendChild(this.chartCanvas);
    this.contentElement.appendChild(chartContainer);

    // Add current stats
    const stats = document.createElement('div');
    stats.innerHTML = `
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">現在の資金:</span>
        <span style="color: #00ff00; font-weight: bold; margin-left: 10px;">
          $${(this.historicalData.getLatestValue('money') || 0).toLocaleString()}
        </span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">月間収入:</span>
        <span style="color: #00ffff; font-weight: bold; margin-left: 10px;">
          +$${(this.historicalData.getLatestValue('income') || 0).toLocaleString()}
        </span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">月間支出:</span>
        <span style="color: #ff8800; font-weight: bold; margin-left: 10px;">
          -$${(this.historicalData.getLatestValue('expenses') || 0).toLocaleString()}
        </span>
      </div>
    `;
    this.contentElement.appendChild(stats);
  }

  /**
   * Render population tab with chart
   */
  private renderPopulation(): void {
    const title = document.createElement('h2');
    title.textContent = '人口統計';
    title.style.marginTop = '0';
    this.contentElement.appendChild(title);

    // Render chart
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    `;

    const populationData = this.historicalData.getDataSeries('population');
    const citizensData = this.historicalData.getDataSeries('citizens');

    const ctx = this.chartCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);

    this.chartRenderer.renderMultiLineChart(
      [
        { data: populationData, label: '人口', color: '#00ff00' },
        { data: citizensData, label: '市民数', color: '#00ffff' },
      ],
      {
        title: '人口推移',
        width: 560,
        height: 250,
        yLabel: '人数',
      }
    );

    chartContainer.appendChild(this.chartCanvas);
    this.contentElement.appendChild(chartContainer);

    // Employment chart
    const employmentChartContainer = document.createElement('div');
    employmentChartContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    `;

    const employmentCanvas = document.createElement('canvas');
    employmentCanvas.width = 560;
    employmentCanvas.height = 200;
    const employmentCtx = employmentCanvas.getContext('2d')!;
    const employmentRenderer = new ChartRenderer(employmentCtx);

    const employedData = this.historicalData.getDataSeries('employed');
    const unemployedData = this.historicalData.getDataSeries('unemployed');

    employmentRenderer.renderMultiLineChart(
      [
        { data: employedData, label: '雇用', color: '#00ff00' },
        { data: unemployedData, label: '失業', color: '#ff0000' },
      ],
      {
        title: '雇用状況',
        width: 560,
        height: 200,
        yLabel: '人数',
      }
    );

    employmentChartContainer.appendChild(employmentCanvas);
    this.contentElement.appendChild(employmentChartContainer);

    // Add commute statistics
    const commuteStats = document.createElement('div');
    commuteStats.innerHTML = `
      <h3 style="margin-top: 20px; margin-bottom: 10px;">通勤統計</h3>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">総通勤者数:</span>
        <span style="color: #00ff00; font-weight: bold; margin-left: 10px;">
          ${this.historicalData.getLatestValue('totalCommuters') || 0}
        </span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">通勤失敗:</span>
        <span style="color: #ff0000; font-weight: bold; margin-left: 10px;">
          ${this.historicalData.getLatestValue('failedCommuters') || 0}
        </span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">平均通勤時間:</span>
        <span style="color: #00ffff; font-weight: bold; margin-left: 10px;">
          ${Math.round(this.historicalData.getLatestValue('averageCommuteTime') || 0)} ティック
        </span>
      </div>
    `;
    this.contentElement.appendChild(commuteStats);
  }

  /**
   * Render traffic tab with chart
   */
  private renderTraffic(): void {
    const title = document.createElement('h2');
    title.textContent = '交通統計';
    title.style.marginTop = '0';
    this.contentElement.appendChild(title);

    // Render chart
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    `;

    const vehicleData = this.historicalData.getDataSeries('vehicleCount');
    const congestionData = this.historicalData.getDataSeries('trafficCongestion');

    const ctx = this.chartCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);

    this.chartRenderer.renderMultiLineChart(
      [
        { data: vehicleData, label: '車両数', color: '#00ff00' },
        { data: congestionData, label: '混雑度 (%)', color: '#ff0000' },
      ],
      {
        title: '交通状況推移',
        width: 560,
        height: 250,
        yLabel: '数値',
      }
    );

    chartContainer.appendChild(this.chartCanvas);
    this.contentElement.appendChild(chartContainer);

    // Current stats
    const stats = document.createElement('div');
    stats.innerHTML = `
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">現在の車両数:</span>
        <span style="color: #00ff00; font-weight: bold; margin-left: 10px;">
          ${this.historicalData.getLatestValue('vehicleCount') || 0}
        </span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">混雑度:</span>
        <span style="color: #ff0000; font-weight: bold; margin-left: 10px;">
          ${Math.round(this.historicalData.getLatestValue('trafficCongestion') || 0)}%
        </span>
      </div>
      <h3 style="margin-top: 20px; margin-bottom: 10px;">通勤状況</h3>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">現在通勤中:</span>
        <span style="color: #00ffff; font-weight: bold; margin-left: 10px;">
          ${this.historicalData.getLatestValue('activeCommuters') || 0}
        </span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">通勤失敗:</span>
        <span style="color: #ff0000; font-weight: bold; margin-left: 10px;">
          ${this.historicalData.getLatestValue('failedCommuters') || 0}
        </span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888;">平均通勤時間:</span>
        <span style="color: #888888; font-weight: bold; margin-left: 10px;">
          ${Math.round(this.historicalData.getLatestValue('averageCommuteTime') || 0)} ティック
        </span>
      </div>
    `;
    this.contentElement.appendChild(stats);
  }

  /**
   * Render transit tab
   */
  private renderTransit(): void {
    const title = document.createElement('h2');
    title.textContent = '公共交通統計';
    title.style.marginTop = '0';
    this.contentElement.appendChild(title);

    // Render chart
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    `;

    const ridershipData = this.historicalData.getDataSeries('transitRidership');
    const coverageData = this.historicalData.getDataSeries('transitCoverage');

    const ctx = this.chartCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);

    this.chartRenderer.renderMultiLineChart(
      [
        { data: ridershipData, label: '月間利用者数', color: '#00ff00' },
        { data: coverageData, label: 'カバー率 (%)', color: '#00ffff' },
      ],
      {
        title: '公共交通推移',
        width: 560,
        height: 250,
        yLabel: '数値',
      }
    );

    chartContainer.appendChild(this.chartCanvas);
    this.contentElement.appendChild(chartContainer);
  }

  /**
   * Update panel content
   */
  update(): void {
    if (this.visible) {
      this.renderContent();
    }
  }

  /**
   * Show panel
   */
  show(): void {
    this.visible = true;
    this.panelElement.style.display = 'flex';
    this.renderContent();
  }

  /**
   * Hide panel
   */
  hide(): void {
    this.visible = false;
    this.panelElement.style.display = 'none';
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if panel is visible
   */
  isVisible(): boolean {
    return this.visible;
  }
}
