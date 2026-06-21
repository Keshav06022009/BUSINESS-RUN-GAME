import * as THREE from 'three';
import { stateManager } from '../state/StateManager';

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public player!: THREE.Mesh;
  public playerBox!: THREE.Box3; // For collision detection

  // Expose scene for TrackManager
  public getScene(): THREE.Scene {
    return this.scene;
  }

  // Base speed (units per second)
  private baseForwardSpeed = 20;

  // Lane configuration
  private lanes = [-3, 0, 3]; // Left, Center, Right x-coordinates
  private currentLaneIndex = 1; // Start in center
  private targetX = 0;
  private lateralSpeed = 15; // Speed of switching lanes

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas ${canvasId} not found`);

    // Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 20, 100);

    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Camera will follow player, initial offset
    this.camera.position.set(0, 5, -10);
    this.camera.lookAt(0, 0, 10);

    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.setupLighting();
    this.createPlayer();

    // Setup Input
    this.setupControls();

    // Handle Resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  private createPlayer() {
    // Sleek geometric box/capsule placeholder
    const geometry = new THREE.BoxGeometry(1, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.2,
      metalness: 0.8
    });
    this.player = new THREE.Mesh(geometry, material);
    this.player.position.set(0, 1, 0); // y=1 so it rests on the floor (y=0)

    // Outline for style
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    this.player.add(line);

    this.scene.add(this.player);

    this.playerBox = new THREE.Box3().setFromObject(this.player);
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      if (stateManager.getState().gameOver) return;

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (this.currentLaneIndex > 0) {
          this.currentLaneIndex--;
          this.targetX = this.lanes[this.currentLaneIndex];
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        if (this.currentLaneIndex < this.lanes.length - 1) {
          this.currentLaneIndex++;
          this.targetX = this.lanes[this.currentLaneIndex];
        }
      }
    });
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public update(deltaTime: number) {
    if (stateManager.getState().gameOver) return;

    const speedMod = stateManager.getSpeedModifier();

    // Auto-forward movement
    const forwardMove = this.baseForwardSpeed * speedMod * deltaTime;
    this.player.position.z += forwardMove;

    // Lateral movement (smooth lane switching)
    if (Math.abs(this.player.position.x - this.targetX) > 0.01) {
      const step = this.lateralSpeed * deltaTime;
      if (this.player.position.x < this.targetX) {
        this.player.position.x = Math.min(this.player.position.x + step, this.targetX);
      } else {
        this.player.position.x = Math.max(this.player.position.x - step, this.targetX);
      }
    }

    // Update collision box
    this.playerBox.setFromObject(this.player);

    // Update camera to follow player smoothly
    const targetCameraZ = this.player.position.z - 8;
    const targetCameraX = this.player.position.x * 0.5; // slight pan

    this.camera.position.z += (targetCameraZ - this.camera.position.z) * 5 * deltaTime;
    this.camera.position.x += (targetCameraX - this.camera.position.x) * 5 * deltaTime;
    this.camera.lookAt(this.player.position.x, 2, this.player.position.z + 10);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}