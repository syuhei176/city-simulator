import { GameEngine } from '@/core/GameEngine';
import { ToolType } from './InputHandler';

/**
 * Heads-Up Display for game information
 */
export class HUD {
  private container: HTMLElement;
  private statsElement: HTMLElement;
  private toolbarElement: HTMLElement;
  private currentToolCallback?: (tool: ToolType) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.statsElement = document.createElement('div');
    this.toolbarElement = document.createElement('div');
    this.init();
  }

  /**
   * Initialize HUD elements
   */
  private init(): void {
    // Stats panel
    this.statsElement.id = 'stats';
    this.statsElement.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      min-width: 200px;
    `;
    this.container.appendChild(this.statsElement);

    // Toolbar
    this.toolbarElement.id = 'toolbar';
    this.toolbarElement.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 10px;
      border-radius: 10px;
      display: flex;
      gap: 10px;
    `;
    this.container.appendChild(this.toolbarElement);

    this.createToolbar();
  }

  /**
   * Create toolbar with buttons
   */
  private createToolbar(): void {
    const tools = [
      { type: ToolType.ROAD_SMALL, label: '道路(小)', key: '1' },
      { type: ToolType.ROAD_MEDIUM, label: '道路(中)', key: '2' },
      { type: ToolType.ROAD_LARGE, label: '道路(大)', key: '3' },
      { type: ToolType.ZONE_RESIDENTIAL, label: '住宅', key: 'R' },
      { type: ToolType.ZONE_COMMERCIAL, label: '商業', key: 'C' },
      { type: ToolType.ZONE_INDUSTRIAL, label: '工業', key: 'I' },
      { type: ToolType.BULLDOZE, label: '破壊', key: 'D' },
    ];

    tools.forEach((tool) => {
      const button = document.createElement('button');
      button.textContent = `${tool.label} [${tool.key}]`;
      button.style.cssText = `
        padding: 12px 16px;
        background: #333;
        color: white;
        border: 2px solid #555;
        border-radius: 8px;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
        min-width: 80px;
        min-height: 48px;
      `;

      // Support both mouse and touch events
      const activateButton = () => {
        button.style.background = '#555';
        button.style.borderColor = '#777';
      };

      const deactivateButton = () => {
        button.style.background = '#333';
        button.style.borderColor = '#555';
      };

      button.addEventListener('mouseenter', activateButton);
      button.addEventListener('mouseleave', deactivateButton);

      // Handle touch events
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent canvas from receiving this event
        activateButton();
      });

      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent canvas from receiving this event
        deactivateButton();
        // Trigger tool selection on touch end
        if (this.currentToolCallback) {
          this.currentToolCallback(tool.type);
        }
      });

      // Handle mouse click (for non-touch devices)
      button.addEventListener('click', (e) => {
        // Only handle click if it's not from a touch event
        if (e.detail !== 0) {
          if (this.currentToolCallback) {
            this.currentToolCallback(tool.type);
          }
        }
      });

      this.toolbarElement.appendChild(button);
    });
  }

  /**
   * Update stats display
   */
  update(engine: GameEngine): void {
    const stats = engine.stats;
    const speed = engine.getSpeed();
    const speedText = speed === 0 ? 'PAUSED' : `${speed}x`;

    const congestionColor = stats.trafficCongestion > 75 ? '#ff0000' :
                             stats.trafficCongestion > 50 ? '#ff8800' :
                             stats.trafficCongestion > 25 ? '#ffff00' : '#00ff00';

    // Demand colors - higher demand = greener
    const getDemandColor = (demand: number): string => {
      if (demand > 70) return '#00ff00';
      if (demand > 40) return '#ffff00';
      return '#ff0000';
    };

    const getDemandBar = (demand: number): string => {
      const width = Math.max(0, Math.min(100, demand));
      const color = getDemandColor(demand);
      return `<div style="width: 100%; background: #333; height: 8px; border-radius: 4px; margin-top: 2px;">
        <div style="width: ${width}%; background: ${color}; height: 100%; border-radius: 4px; transition: width 0.3s;"></div>
      </div>`;
    };

    // Income/expense color
    const netIncome = stats.income - stats.expenses;
    const netColor = netIncome > 0 ? '#00ff00' : netIncome < 0 ? '#ff0000' : '#ffff00';

    // Unemployment color
    const unemploymentColor = stats.unemploymentRate > 15 ? '#ff0000' :
                               stats.unemploymentRate > 8 ? '#ffff00' : '#00ff00';

    this.statsElement.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">都市シミュレーター Phase 5</div>
      <div style="font-weight: bold; color: #0f0;">💰 財政</div>
      <div>資金: $${stats.money.toLocaleString()}</div>
      <div>収入: <span style="color: #00ff00;">+$${stats.income.toLocaleString()}</span>/月</div>
      <div>支出: <span style="color: #ff8800;">-$${stats.expenses.toLocaleString()}</span>/月</div>
      <div>純利益: <span style="color: ${netColor};">${netIncome >= 0 ? '+' : ''}$${netIncome.toLocaleString()}</span>/月</div>
      <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 8px;">
        <div style="font-weight: bold; color: #0ff;">👥 市民 & 雇用</div>
        <div>市民数: ${stats.citizens.toLocaleString()}</div>
        <div>人口: ${stats.population.toLocaleString()}</div>
        <div>雇用: ${stats.employed.toLocaleString()} / ${stats.totalJobs.toLocaleString()}</div>
        <div>失業率: <span style="color: ${unemploymentColor};">${stats.unemploymentRate}%</span></div>
        <div>求人: ${stats.availableJobs.toLocaleString()}</div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 8px;">
        <div style="font-weight: bold; color: #ff0;">🏗️ 建設</div>
        <div>道路: ${stats.roadCount}</div>
        <div>建物: ${stats.buildingCount}</div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 8px;">
        <div style="font-weight: bold; color: #0f0;">🚌 公共交通</div>
        <div>路線: ${stats.transitRoutes}</div>
        <div>停留所: ${stats.transitStops}</div>
        <div>車両: ${stats.transitVehicles}</div>
        <div>乗客: ${stats.transitPassengers.toLocaleString()}</div>
        <div>月間利用: ${stats.transitRidership.toLocaleString()}</div>
        <div>カバー率: ${stats.transitCoverage}%</div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 8px;">
        <div style="font-weight: bold; color: #0f0;">ゾーン需要</div>
        <div style="margin-top: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #4a7c59;">🏠 住宅:</span>
            <span style="color: ${getDemandColor(stats.residentialDemand)}">${stats.residentialDemand}</span>
          </div>
          ${getDemandBar(stats.residentialDemand)}
        </div>
        <div style="margin-top: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #4a5f7c;">🏢 商業:</span>
            <span style="color: ${getDemandColor(stats.commercialDemand)}">${stats.commercialDemand}</span>
          </div>
          ${getDemandBar(stats.commercialDemand)}
        </div>
        <div style="margin-top: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #7c6f4a;">🏭 工業:</span>
            <span style="color: ${getDemandColor(stats.industrialDemand)}">${stats.industrialDemand}</span>
          </div>
          ${getDemandBar(stats.industrialDemand)}
        </div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 8px;">
        <div style="font-weight: bold; color: #0ff;">道路ネットワーク</div>
        <div>ノード: ${stats.networkNodes}</div>
        <div>エッジ: ${stats.networkEdges}</div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 8px;">
        <div style="font-weight: bold; color: #ff0;">交通状況</div>
        <div>車両数: ${stats.vehicleCount}</div>
        <div>平均速度: ${stats.averageTrafficSpeed.toFixed(2)}</div>
        <div>混雑度: <span style="color: ${congestionColor}">${Math.round(stats.trafficCongestion)}%</span></div>
      </div>
      <div style="margin-top: 10px;">速度: ${speedText}</div>
      <div style="margin-top: 10px; font-size: 11px; color: #888;">
        <div style="font-weight: bold; margin-bottom: 5px;">操作方法:</div>
        1本指: パン/描画<br>
        2本指: ピンチズーム<br>
        [Space]: Pause/Resume<br>
        [ESC]: Cancel Tool<br>
        <span style="color: #0ff;">
        [N]: Toggle Nodes<br>
        [E]: Toggle Edges<br>
        [B]: Rebuild Network
        </span><br>
        <span style="color: #ff0;">
        [V]: Toggle Vehicles<br>
        [H]: Traffic Heatmap
        </span><br>
        <span style="color: #0f0;">
        [T]: Toggle Routes<br>
        [S]: Toggle Stops<br>
        [U]: Toggle Transit
        </span>
      </div>
    `;
  }

  /**
   * Set callback for tool selection
   */
  onToolSelect(callback: (tool: ToolType) => void): void {
    this.currentToolCallback = callback;
  }
}
