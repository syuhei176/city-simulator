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
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        activateButton();
      });
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        deactivateButton();
      });

      button.addEventListener('click', () => {
        if (this.currentToolCallback) {
          this.currentToolCallback(tool.type);
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

    this.statsElement.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">都市シミュレーター Phase 3</div>
      <div>資金: $${stats.money.toLocaleString()}</div>
      <div>人口: ${stats.population.toLocaleString()}</div>
      <div>収入: $${stats.income.toLocaleString()}/月</div>
      <div>支出: $${stats.expenses.toLocaleString()}/月</div>
      <div>道路: ${stats.roadCount}</div>
      <div>建物: ${stats.buildingCount}</div>
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
