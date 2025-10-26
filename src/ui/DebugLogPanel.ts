/**
 * Debug log panel for iPad/mobile debugging
 * Captures console logs and displays them in a copyable UI panel
 */
export class DebugLogPanel {
  private container: HTMLElement;
  private logContainer: HTMLElement;
  private logs: string[] = [];
  private maxLogs: number = 100;
  private isVisible: boolean = false;
  private originalConsoleLog: typeof console.log;

  constructor(parentElement: HTMLElement) {
    this.container = this.createPanel();
    parentElement.appendChild(this.container);

    this.logContainer = this.container.querySelector('.debug-log-content')!;

    // Create floating toggle button
    this.createFloatingButton(parentElement);

    // Capture console.log
    this.originalConsoleLog = console.log;
    this.hookConsoleLog();
  }

  /**
   * Create floating toggle button
   */
  private createFloatingButton(parentElement: HTMLElement): void {
    const button = document.createElement('button');
    button.textContent = '🔍';
    button.title = 'Toggle Debug Log (Shift+D)';
    button.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 48px;
      height: 48px;
      background: rgba(0, 150, 0, 0.9);
      color: white;
      border: 2px solid #0f0;
      border-radius: 50%;
      cursor: pointer;
      font-size: 24px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.background = 'rgba(0, 200, 0, 0.9)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.background = 'rgba(0, 150, 0, 0.9)';
    });

    button.addEventListener('click', () => {
      this.toggle();
    });

    // Support touch events for iPad
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.toggle();
    });

    parentElement.appendChild(button);
  }

  /**
   * Create the debug panel HTML
   */
  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'debug-log-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.95);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      max-height: 40vh;
      overflow: hidden;
      z-index: 10000;
      border-top: 2px solid #0f0;
      display: none;
    `;

    panel.innerHTML = `
      <div style="padding: 10px; border-bottom: 1px solid #0f0; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: bold;">🔍 Debug Log</div>
        <div style="display: flex; gap: 10px;">
          <button class="debug-copy-btn" style="
            padding: 10px 20px;
            background: #0a0;
            color: white;
            border: 2px solid #0f0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(0, 255, 0, 0.3);
          ">📋 Copy All</button>
          <button class="debug-clear-btn" style="
            padding: 10px 20px;
            background: #a00;
            color: white;
            border: 2px solid #f00;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(255, 0, 0, 0.3);
          ">🗑️ Clear</button>
          <button class="debug-close-btn" style="
            padding: 10px 20px;
            background: #444;
            color: white;
            border: 2px solid #666;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(255, 255, 255, 0.3);
          ">✕ Close</button>
        </div>
      </div>
      <div class="debug-log-content" style="
        padding: 10px;
        overflow-y: auto;
        max-height: calc(40vh - 60px);
        white-space: pre-wrap;
        word-break: break-all;
      "></div>
    `;

    // Setup event listeners (both click and touch)
    const copyBtn = panel.querySelector('.debug-copy-btn')!;
    const clearBtn = panel.querySelector('.debug-clear-btn')!;
    const closeBtn = panel.querySelector('.debug-close-btn')!;

    // Copy button
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.copyLogs();
    });
    copyBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.copyLogs();
    });

    // Clear button
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.clearLogs();
    });
    clearBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.clearLogs();
    });

    // Close button
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.hide();
    });
    closeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.hide();
    });

    return panel;
  }

  /**
   * Hook console.log to capture logs
   */
  private hookConsoleLog(): void {
    console.log = (...args: any[]) => {
      // Call original console.log
      this.originalConsoleLog.apply(console, args);

      // Format and store log
      const logMessage = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      this.addLog(logMessage);
    };
  }

  /**
   * Add a log entry
   */
  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;

    this.logs.push(logEntry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Update display if visible
    if (this.isVisible) {
      this.updateDisplay();
    }
  }

  /**
   * Update the log display
   */
  private updateDisplay(): void {
    this.logContainer.textContent = this.logs.join('\n');
    // Auto-scroll to bottom
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  /**
   * Copy all logs to clipboard
   */
  private async copyLogs(): Promise<void> {
    console.log('[DebugLogPanel] Copy button clicked!');
    const allLogs = this.logs.join('\n');
    console.log(`[DebugLogPanel] Preparing to copy ${this.logs.length} log entries`);

    try {
      // Create a textarea for manual selection (works best on iOS/iPad)
      const textarea = document.createElement('textarea');
      textarea.value = allLogs;
      textarea.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 85%;
        height: 65%;
        padding: 20px;
        background: white;
        color: black;
        border: 4px solid #0f0;
        border-radius: 12px;
        z-index: 20000;
        font-family: monospace;
        font-size: 15px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        touch-action: manipulation;
      `;
      textarea.readOnly = false; // Allow selection and copy

      // Add overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 19999;
      `;

      // Add instructions
      const instructions = document.createElement('div');
      instructions.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -120%);
        background: #0a0;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 20001;
        font-family: sans-serif;
        font-weight: bold;
        text-align: center;
      `;
      instructions.textContent = 'タップして全選択→コピーしてください';

      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ 閉じる';
      closeBtn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, 180%);
        padding: 20px 40px;
        background: #a00;
        color: white;
        border: 3px solid #f00;
        border-radius: 12px;
        font-size: 20px;
        font-weight: bold;
        z-index: 20001;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: rgba(255, 0, 0, 0.3);
        min-height: 60px;
      `;

      const cleanup = () => {
        document.body.removeChild(textarea);
        document.body.removeChild(overlay);
        document.body.removeChild(instructions);
        document.body.removeChild(closeBtn);
      };

      // Support both click and touch events
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cleanup();
      });
      closeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        cleanup();
      });

      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        cleanup();
      });
      overlay.addEventListener('touchend', (e) => {
        e.preventDefault();
        cleanup();
      });

      document.body.appendChild(overlay);
      document.body.appendChild(textarea);
      document.body.appendChild(instructions);
      document.body.appendChild(closeBtn);

      // Auto-select text
      textarea.focus();
      textarea.select();

      // Try clipboard API as well
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(allLogs);
          instructions.textContent = '✓ クリップボードにコピーしました！';
          instructions.style.background = '#0a0';
        }
      } catch (clipErr) {
        // Clipboard API failed, user needs to manually copy
        console.log('Clipboard API not available, showing manual copy UI');
      }

    } catch (err) {
      console.error('Failed to show copy UI:', err);
      this.showCopyFeedback('✗ Copy failed');
    }
  }

  /**
   * Show copy feedback
   */
  private showCopyFeedback(message: string): void {
    const btn = this.container.querySelector('.debug-copy-btn') as HTMLButtonElement;
    const originalText = btn.textContent;
    btn.textContent = message;
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }

  /**
   * Clear all logs
   */
  private clearLogs(): void {
    this.logs = [];
    this.updateDisplay();
  }

  /**
   * Show the debug panel
   */
  show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.updateDisplay();
  }

  /**
   * Hide the debug panel
   */
  hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if panel is visible
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Destroy the panel and restore console.log
   */
  destroy(): void {
    console.log = this.originalConsoleLog;
    this.container.remove();
  }
}
