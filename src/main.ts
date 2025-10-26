import { GameEngine } from './core/GameEngine';
import { GameConfig } from './core/types';
import { Camera } from './renderer/Camera';
import { MapRenderer } from './renderer/MapRenderer';
import { NetworkRenderer } from './renderer/NetworkRenderer';
import { VehicleRenderer } from './renderer/VehicleRenderer';
import { TransitRenderer } from './renderer/TransitRenderer';
import { InputHandler } from './ui/InputHandler';
import { HUD } from './ui/HUD';
import { StatsPanel } from './ui/StatsPanel';
import { SaveLoadPanel } from './ui/SaveLoadPanel';
import { SaveLoadManager } from './systems/SaveLoadManager';
import { MapTemplates } from './systems/MapTemplates';
import { PerformanceOptimizer } from './systems/PerformanceOptimizer';
import './style.css';

/**
 * Main application class
 */
class CitySimulator {
  private canvas!: HTMLCanvasElement;
  private engine!: GameEngine;
  private camera!: Camera;
  private renderer!: MapRenderer;
  private networkRenderer!: NetworkRenderer;
  private vehicleRenderer!: VehicleRenderer;
  private transitRenderer!: TransitRenderer;
  private inputHandler!: InputHandler;
  private hud!: HUD;
  private statsPanel!: StatsPanel;
  private saveLoadPanel!: SaveLoadPanel;
  private autoSaveInterval: number = 0;

  private readonly config: GameConfig = {
    gridWidth: 200,
    gridHeight: 200,
    cellSize: 32,
    tickRate: 10, // 10 ticks per second
  };

  constructor() {
    this.init();
  }

  /**
   * Initialize the application
   */
  private init(): void {
    console.log('Initializing City Simulator...');

    // Setup canvas
    this.setupCanvas();

    // Create game engine
    this.engine = new GameEngine(this.config);

    // Create camera
    this.camera = new Camera(this.canvas.width, this.canvas.height);

    // Center camera on the grid
    this.camera.centerOn(
      (this.config.gridWidth * this.config.cellSize) / 2,
      (this.config.gridHeight * this.config.cellSize) / 2
    );

    // Create renderer
    this.renderer = new MapRenderer(
      this.canvas,
      this.camera,
      this.config.cellSize
    );

    // Create network renderer
    this.networkRenderer = new NetworkRenderer(
      this.canvas,
      this.camera,
      this.config.cellSize
    );

    // Create vehicle renderer
    this.vehicleRenderer = new VehicleRenderer(
      this.canvas,
      this.camera,
      this.config.cellSize
    );

    // Create transit renderer
    const ctx = this.canvas.getContext('2d')!;
    this.transitRenderer = new TransitRenderer(
      ctx,
      this.camera,
      this.config.cellSize,
      this.engine.getTransitManager()
    );

    // Create input handler
    this.inputHandler = new InputHandler(
      this.canvas,
      this.camera,
      this.engine.getGrid(),
      this.config.cellSize,
      this.engine.getTransitManager()
    );

    // Setup road change callback
    this.inputHandler.onRoadChanged(() => {
      this.engine.markNetworkDirty();
      this.engine.rebuildNetwork(); // Immediately rebuild network for vehicle spawning
    });

    // Create HUD
    const hudContainer = document.getElementById('hud-container')!;
    this.hud = new HUD(hudContainer);
    this.hud.onToolSelect((tool) => {
      this.inputHandler.setTool(tool);
    });

    // Create Stats Panel
    this.statsPanel = new StatsPanel(
      hudContainer,
      this.engine.getHistoricalDataCollector()
    );

    // Create Save/Load Panel
    this.saveLoadPanel = new SaveLoadPanel(hudContainer, this.engine);

    // Setup autosave (every 5 minutes)
    this.autoSaveInterval = window.setInterval(() => {
      SaveLoadManager.save(this.engine, 'autosave');
      console.log('Autosaved');
    }, 5 * 60 * 1000);

    // Setup keyboard controls
    this.setupKeyboardControls();

    // Setup cleanup
    this.setupCleanup();

    // Start game loop
    this.engine.start();
    this.startRenderLoop();

    // Try to load autosave if it exists
    if (SaveLoadManager.hasSave('autosave')) {
      if (confirm('オートセーブが見つかりました。ロードしますか？')) {
        SaveLoadManager.load(this.engine, 'autosave');
      }
    }

    console.log('City Simulator initialized successfully!');
  }

  /**
   * Setup canvas
   */
  private setupCanvas(): void {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Resize canvas to fit window
   */
  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Setup keyboard controls
   */
  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.engine.togglePause();
          break;
        case '+':
        case '=':
          this.camera.zoomIn();
          break;
        case '-':
        case '_':
          this.camera.zoomOut();
          break;
        case 'ArrowUp':
          this.camera.pan(0, -100);
          break;
        case 'ArrowDown':
          this.camera.pan(0, 100);
          break;
        case 'ArrowLeft':
          this.camera.pan(-100, 0);
          break;
        case 'ArrowRight':
          this.camera.pan(100, 0);
          break;
        case 'n':
        case 'N':
          // Toggle network nodes
          this.networkRenderer.toggleNodes();
          console.log('Network nodes toggled');
          break;
        case 'e':
        case 'E':
          // Toggle network edges
          this.networkRenderer.toggleEdges();
          console.log('Network edges toggled');
          break;
        case 'x':
        case 'X':
          // Force rebuild network (moved from 'B' to 'X')
          this.engine.rebuildNetwork();
          console.log('Network rebuilt manually');
          break;
        case 'v':
        case 'V':
          // Toggle vehicles
          this.vehicleRenderer.toggleVehicles();
          console.log('Vehicles toggled');
          break;
        case 'h':
        case 'H':
          // Toggle traffic heatmap
          this.renderer.toggleTrafficHeatmap();
          console.log('Traffic heatmap toggled');
          break;
        case 't':
        case 'T':
          // Toggle transit routes
          this.transitRenderer.toggleRoutes();
          console.log('Transit routes toggled');
          break;
        case 's':
        case 'S':
          // Toggle transit stops
          this.transitRenderer.toggleStops();
          console.log('Transit stops toggled');
          break;
        case 'u':
        case 'U':
          // Toggle transit vehicles
          this.transitRenderer.toggleVehicles();
          console.log('Transit vehicles toggled');
          break;
        case 'm':
        case 'M':
          // Cycle heatmap mode
          const newMode = this.renderer.cycleHeatmapMode();
          console.log('Heatmap mode:', newMode);
          break;
        case 'g':
        case 'G':
          // Toggle stats panel
          this.statsPanel.toggle();
          console.log('Stats panel toggled');
          break;
        case 'l':
        case 'L':
          // Toggle save/load panel
          this.saveLoadPanel.toggle();
          console.log('Save/Load panel toggled');
          break;
        case 'p':
        case 'P':
          // Quick save
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const slotName = `quicksave-${Date.now()}`;
            SaveLoadManager.save(this.engine, slotName);
            console.log('Quick saved:', slotName);
          }
          break;
        case '0':
          // Apply empty template
          if (confirm('マップをクリアしますか？')) {
            MapTemplates.applyTemplate(this.engine.getGrid(), '空のマップ');
            this.engine.markNetworkDirty();
          }
          break;
      }
    });
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    const render = () => {
      // Measure FPS
      PerformanceOptimizer.measureFPS();

      // Render map
      this.renderer.render(this.engine.getGrid());

      // Render network (if enabled)
      this.networkRenderer.render(this.engine.getRoadNetwork());

      // Render vehicles (if enabled)
      const vehicles = this.engine.getTrafficSimulator().getVehicles();
      this.vehicleRenderer.render(vehicles);

      // Render transit (stops, routes, vehicles)
      this.transitRenderer.render();

      // Update HUD
      this.hud.update(this.engine);

      // Update Stats Panel (if visible)
      this.statsPanel.update();

      // Log performance warnings if needed
      if (PerformanceOptimizer.isPerformanceDegraded()) {
        console.warn('Performance degraded - FPS:', PerformanceOptimizer.getAverageFPS().toFixed(1));
      }

      requestAnimationFrame(render);
    };

    render();
  }

  /**
   * Cleanup on page unload
   */
  private setupCleanup(): void {
    window.addEventListener('beforeunload', () => {
      // Clear autosave interval
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
      }

      // Stop engine
      this.engine.stop();
    });
  }
}

// Start application
new CitySimulator();
