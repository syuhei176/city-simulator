import { GameEngine } from './core/GameEngine';
import { GameConfig } from './core/types';
import { Camera } from './renderer/Camera';
import { MapRenderer } from './renderer/MapRenderer';
import { NetworkRenderer } from './renderer/NetworkRenderer';
import { InputHandler } from './ui/InputHandler';
import { HUD } from './ui/HUD';
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
  private inputHandler!: InputHandler;
  private hud!: HUD;

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

    // Create input handler
    this.inputHandler = new InputHandler(
      this.canvas,
      this.camera,
      this.engine.getGrid(),
      this.config.cellSize
    );

    // Setup road change callback
    this.inputHandler.onRoadChanged(() => {
      this.engine.markNetworkDirty();
    });

    // Create HUD
    const hudContainer = document.getElementById('hud-container')!;
    this.hud = new HUD(hudContainer);
    this.hud.onToolSelect((tool) => {
      this.inputHandler.setTool(tool);
    });

    // Setup keyboard controls
    this.setupKeyboardControls();

    // Start game loop
    this.engine.start();
    this.startRenderLoop();

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
          this.camera.pan(0, 100);
          break;
        case 'ArrowDown':
          this.camera.pan(0, -100);
          break;
        case 'ArrowLeft':
          this.camera.pan(100, 0);
          break;
        case 'ArrowRight':
          this.camera.pan(-100, 0);
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
        case 'b':
        case 'B':
          // Force rebuild network
          this.engine.rebuildNetwork();
          console.log('Network rebuilt manually');
          break;
      }
    });
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    const render = () => {
      // Render map
      this.renderer.render(this.engine.getGrid());

      // Render network (if enabled)
      this.networkRenderer.render(this.engine.getRoadNetwork());

      // Update HUD
      this.hud.update(this.engine);

      requestAnimationFrame(render);
    };

    render();
  }
}

// Start application
new CitySimulator();
