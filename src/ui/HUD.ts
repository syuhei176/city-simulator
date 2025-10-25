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
  private isStatsCollapsed: boolean = false;
  private expandedSections: Set<string> = new Set(['finance', 'population']);

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
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      max-width: 280px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      overflow-x: hidden;
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

    // Income/expense color
    const netIncome = stats.income - stats.expenses;
    const netColor = netIncome > 0 ? '#00ff00' : netIncome < 0 ? '#ff0000' : '#ffff00';

    // Unemployment color
    const unemploymentColor = stats.unemploymentRate > 15 ? '#ff0000' :
                               stats.unemploymentRate > 8 ? '#ffff00' : '#00ff00';

    // Create collapsible sections
    const sections: Array<{id: string, title: string, content: string}> = [];

    // Title with collapse button
    const titleSection = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 14px; font-weight: bold;">Phase 8</div>
        <button id="hud-collapse-btn" style="
          background: rgba(255,255,255,0.1);
          border: 1px solid #666;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        ">${this.isStatsCollapsed ? '▼' : '▲'}</button>
      </div>
    `;

    // Finance section
    sections.push({
      id: 'finance',
      title: '💰 財政',
      content: `
        <div style="font-size: 11px; line-height: 1.4;">
          <div>$${this.formatNumber(stats.money)}</div>
          <div style="color: ${netColor};">${netIncome >= 0 ? '+' : ''}$${this.formatNumber(netIncome)}/月</div>
        </div>
      `
    });

    // Population section
    sections.push({
      id: 'population',
      title: '👥 人口',
      content: `
        <div style="font-size: 11px; line-height: 1.4;">
          <div>市民: ${this.formatNumber(stats.citizens)} (${this.formatNumber(stats.population)})</div>
          <div>失業率: <span style="color: ${unemploymentColor};">${stats.unemploymentRate}%</span></div>
        </div>
      `
    });

    // Construction section
    sections.push({
      id: 'construction',
      title: '🏗️ 建設',
      content: `
        <div style="font-size: 11px; line-height: 1.4;">
          <div>道路: ${stats.roadCount} / 建物: ${stats.buildingCount}</div>
        </div>
      `
    });

    // Transit section
    sections.push({
      id: 'transit',
      title: '🚌 交通',
      content: `
        <div style="font-size: 11px; line-height: 1.4;">
          <div>路線: ${stats.transitRoutes} / 停留所: ${stats.transitStops}</div>
          <div>乗客: ${this.formatNumber(stats.transitPassengers)} (${stats.transitCoverage}%)</div>
        </div>
      `
    });

    // Demand section
    sections.push({
      id: 'demand',
      title: '📊 需要',
      content: `
        <div style="font-size: 11px;">
          <div style="display: flex; gap: 5px; margin-top: 3px;">
            <div style="flex: 1;">
              <div style="color: #4a7c59; font-size: 10px;">🏠 ${stats.residentialDemand}</div>
              <div style="width: 100%; background: #333; height: 4px; border-radius: 2px;">
                <div style="width: ${stats.residentialDemand}%; background: ${getDemandColor(stats.residentialDemand)}; height: 100%; border-radius: 2px;"></div>
              </div>
            </div>
            <div style="flex: 1;">
              <div style="color: #4a5f7c; font-size: 10px;">🏢 ${stats.commercialDemand}</div>
              <div style="width: 100%; background: #333; height: 4px; border-radius: 2px;">
                <div style="width: ${stats.commercialDemand}%; background: ${getDemandColor(stats.commercialDemand)}; height: 100%; border-radius: 2px;"></div>
              </div>
            </div>
            <div style="flex: 1;">
              <div style="color: #7c6f4a; font-size: 10px;">🏭 ${stats.industrialDemand}</div>
              <div style="width: 100%; background: #333; height: 4px; border-radius: 2px;">
                <div style="width: ${stats.industrialDemand}%; background: ${getDemandColor(stats.industrialDemand)}; height: 100%; border-radius: 2px;"></div>
              </div>
            </div>
          </div>
        </div>
      `
    });

    // Traffic section
    sections.push({
      id: 'traffic',
      title: '🚗 交通',
      content: `
        <div style="font-size: 11px; line-height: 1.4;">
          <div>車両: ${stats.vehicleCount}</div>
          <div>混雑: <span style="color: ${congestionColor}">${Math.round(stats.trafficCongestion)}%</span></div>
        </div>
      `
    });

    // Build collapsible sections
    let sectionsHTML = '';
    if (!this.isStatsCollapsed) {
      for (const section of sections) {
        const isExpanded = this.expandedSections.has(section.id);
        sectionsHTML += `
          <div style="margin-top: 8px; border-top: 1px solid #444; padding-top: 6px;">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              cursor: pointer;
              padding: 4px;
              margin: -4px;
              touch-action: manipulation;
              -webkit-tap-highlight-color: transparent;
            " data-section="${section.id}">
              <div style="font-weight: bold; font-size: 11px;">${section.title}</div>
              <span style="font-size: 10px; color: #888; padding: 4px;">${isExpanded ? '▼' : '▶'}</span>
            </div>
            <div id="section-${section.id}" style="display: ${isExpanded ? 'block' : 'none'}; margin-top: 4px;">
              ${section.content}
            </div>
          </div>
        `;
      }

      // Speed indicator
      sectionsHTML += `
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #444;">
          <div style="font-size: 11px;">速度: <span style="font-weight: bold;">${speedText}</span></div>
        </div>
      `;

      // Compact help
      sectionsHTML += `
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #444; font-size: 10px; color: #888;">
          <div>[M] ヒートマップ / [G] 統計 / [?] ヘルプ</div>
        </div>
      `;
    }

    this.statsElement.innerHTML = titleSection + sectionsHTML;

    // Add event listeners for collapsible sections
    const collapseBtn = document.getElementById('hud-collapse-btn');
    if (collapseBtn) {
      // Handle both click and touch events
      const toggleCollapse = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isStatsCollapsed = !this.isStatsCollapsed;
        this.update(engine); // Re-render
      };

      collapseBtn.addEventListener('click', toggleCollapse);
      collapseBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleCollapse(e);
      });
    }

    // Add event listeners for section toggles
    const sectionHeaders = this.statsElement.querySelectorAll('[data-section]');
    sectionHeaders.forEach(header => {
      const toggleSection = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const sectionId = (header as HTMLElement).dataset.section!;
        const sectionContent = document.getElementById(`section-${sectionId}`);
        if (sectionContent) {
          const isExpanded = this.expandedSections.has(sectionId);
          if (isExpanded) {
            this.expandedSections.delete(sectionId);
            sectionContent.style.display = 'none';
            (header.querySelector('span') as HTMLElement).textContent = '▶';
          } else {
            this.expandedSections.add(sectionId);
            sectionContent.style.display = 'block';
            (header.querySelector('span') as HTMLElement).textContent = '▼';
          }
        }
      };

      // Handle both click and touch events
      header.addEventListener('click', toggleSection);
      header.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleSection(e);
      });
    });
  }

  /**
   * Format number for compact display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Set callback for tool selection
   */
  onToolSelect(callback: (tool: ToolType) => void): void {
    this.currentToolCallback = callback;
  }
}
