import { GameEngine } from '@/core/GameEngine';
import { SaveLoadManager } from '@/systems/SaveLoadManager';

/**
 * UI panel for save/load functionality
 */
export class SaveLoadPanel {
  private container: HTMLElement;
  private panelElement: HTMLElement;
  private visible: boolean = false;
  private engine: GameEngine;

  constructor(container: HTMLElement, engine: GameEngine) {
    this.container = container;
    this.engine = engine;
    this.panelElement = document.createElement('div');
    this.init();
  }

  /**
   * Initialize panel
   */
  private init(): void {
    this.panelElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      border-radius: 10px;
      border: 2px solid #444;
      min-width: 400px;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: none;
      flex-direction: column;
      font-family: monospace;
      z-index: 1000;
    `;

    this.container.appendChild(this.panelElement);
  }

  /**
   * Render panel content
   */
  private render(): void {
    const saves = SaveLoadManager.getAllSaves();
    const saveSlots = Object.keys(saves).sort((a, b) => {
      // Autosave always first
      if (a === 'autosave') return -1;
      if (b === 'autosave') return 1;
      return saves[b].timestamp - saves[a].timestamp;
    });

    let content = `
      <div style="padding: 20px; border-bottom: 2px solid #444;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 18px;">セーブ/ロード</h2>
          <button id="save-load-close" style="
            background: rgba(255,255,255,0.1);
            border: 1px solid #666;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          ">✕</button>
        </div>
      </div>
      <div style="padding: 20px; overflow-y: auto; max-height: 60vh;">
        <div style="margin-bottom: 20px;">
          <button id="new-save-btn" style="
            width: 100%;
            padding: 12px;
            background: #00aa00;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            font-family: monospace;
          ">新規セーブ</button>
        </div>
    `;

    if (saveSlots.length === 0) {
      content += `
        <div style="text-align: center; color: #888; padding: 40px 20px;">
          セーブデータがありません
        </div>
      `;
    } else {
      content += '<div style="display: flex; flex-direction: column; gap: 10px;">';

      for (const slotName of saveSlots) {
        const info = SaveLoadManager.getSaveInfo(slotName);
        if (!info) continue;

        const date = new Date(info.timestamp);
        const dateStr = `${date.getFullYear()}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;

        content += `
          <div style="
            background: rgba(255,255,255,0.05);
            border: 1px solid #444;
            border-radius: 5px;
            padding: 12px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 5px;">
                  ${slotName === 'autosave' ? '🔄 オートセーブ' : '💾 ' + slotName}
                </div>
                <div style="font-size: 11px; color: #888;">
                  ${dateStr} | 人口: ${info.population.toLocaleString()}
                </div>
              </div>
              <div style="display: flex; gap: 5px;">
                <button class="load-btn" data-slot="${slotName}" style="
                  padding: 6px 12px;
                  background: #0066cc;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  font-family: monospace;
                ">ロード</button>
                ${slotName !== 'autosave' ? `
                  <button class="delete-btn" data-slot="${slotName}" style="
                    padding: 6px 12px;
                    background: #cc0000;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-family: monospace;
                  ">削除</button>
                ` : ''}
                <button class="export-btn" data-slot="${slotName}" style="
                  padding: 6px 12px;
                  background: #666;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  font-family: monospace;
                ">出力</button>
              </div>
            </div>
          </div>
        `;
      }

      content += '</div>';
    }

    content += `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #444;">
          <label style="
            display: block;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border: 2px dashed #666;
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
            font-size: 14px;
          ">
            📁 セーブファイルをインポート
            <input type="file" id="import-file" accept=".json" style="display: none;">
          </label>
        </div>
      </div>
    `;

    this.panelElement.innerHTML = content;

    // Add event listeners
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to buttons
   */
  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.panelElement.querySelector('#save-load-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // New save button
    const newSaveBtn = this.panelElement.querySelector('#new-save-btn');
    newSaveBtn?.addEventListener('click', () => {
      const slotName = prompt('セーブ名を入力してください:', `save-${Date.now()}`);
      if (slotName) {
        const success = SaveLoadManager.save(this.engine, slotName);
        if (success) {
          alert('セーブしました！');
          this.render();
        } else {
          alert('セーブに失敗しました');
        }
      }
    });

    // Load buttons
    const loadBtns = this.panelElement.querySelectorAll('.load-btn');
    loadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const slotName = (btn as HTMLElement).dataset.slot!;
        if (confirm(`「${slotName}」をロードしますか？\n現在のゲームは失われます。`)) {
          const success = SaveLoadManager.load(this.engine, slotName);
          if (success) {
            alert('ロードしました！');
            this.hide();
          } else {
            alert('ロードに失敗しました');
          }
        }
      });
    });

    // Delete buttons
    const deleteBtns = this.panelElement.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const slotName = (btn as HTMLElement).dataset.slot!;
        if (confirm(`「${slotName}」を削除しますか？`)) {
          const success = SaveLoadManager.deleteSave(slotName);
          if (success) {
            this.render();
          } else {
            alert('削除に失敗しました');
          }
        }
      });
    });

    // Export buttons
    const exportBtns = this.panelElement.querySelectorAll('.export-btn');
    exportBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const slotName = (btn as HTMLElement).dataset.slot!;
        SaveLoadManager.exportSave(slotName);
      });
    });

    // Import file
    const importFile = this.panelElement.querySelector('#import-file') as HTMLInputElement;
    importFile?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const slotName = prompt('インポート先のスロット名:', `imported-${Date.now()}`);
        if (slotName) {
          SaveLoadManager.importSave(file, slotName, (success) => {
            if (success) {
              alert('インポートしました！');
              this.render();
            } else {
              alert('インポートに失敗しました');
            }
          });
        }
      }
    });
  }

  /**
   * Show panel
   */
  show(): void {
    this.visible = true;
    this.panelElement.style.display = 'flex';
    this.render();
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
