import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { stateManager } from '../state/StateManager';

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public player!: THREE.Group;
  public playerBox!: THREE.Box3; // For collision detection

  // Animation mixer for the real model
  private mixer: THREE.AnimationMixer | null = null;
  private runAction: THREE.AnimationAction | null = null;
  private isModelLoaded: boolean = false;

  private waterPlane!: THREE.Mesh;

  // Expose scene for TrackManager
  public getScene(): THREE.Scene {
    return this.scene;
  }

  // Base speed (units per second)
  private baseForwardSpeed = 20;

  // Lane configuration
  private lanes = [-1.5, 1.5]; // Left and Right x-coordinates (2 lanes)
  private currentLaneIndex = 0; // Start on the left
  private targetX = -1.5;
  private lateralSpeed = 15; // Speed of switching lanes

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas ${canvasId} not found`);

    // Setup Scene
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xBAE6FD);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 20, 150);

    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Camera will follow player, initial offset for mobile runner style
    this.camera.position.set(0, 8, -12);
    this.camera.lookAt(0, 2, 5);

    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.setupLighting();
    this.createEnvironment();
    this.createPlayer();

    // Setup Input
    this.setupControls();

    // Handle Resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, -10);
    this.scene.add(dirLight);
  }

  private createEnvironment() {
    const waterGeometry = new THREE.PlaneGeometry(2000, 2000);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x22D3EE,
      roughness: 0.2,
      metalness: 0.1
    });
    this.waterPlane = new THREE.Mesh(waterGeometry, waterMaterial);
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.y = -5; // Floating below the track
    this.scene.add(this.waterPlane);
  }

  private createPlayer() {
    this.player = new THREE.Group();
    this.scene.add(this.player);
    this.playerBox = new THREE.Box3().setFromObject(this.player); // Initial small box

    const loader = new GLTFLoader();
    loader.load('/CesiumMan.glb', (gltf) => {
      const model = gltf.scene;

      // Face forward down the track
      model.rotation.y = Math.PI / 2;

      // The CesiumMan is quite small, scale him up
      model.scale.set(1.5, 1.5, 1.5);

      // Add to our player group
      this.player.add(model);

      // Update collision box to fit model
      this.playerBox.setFromObject(this.player);

      // Setup Animations
      this.mixer = new THREE.AnimationMixer(model);

      // Find the walk/run animation
      if (gltf.animations && gltf.animations.length > 0) {
        this.runAction = this.mixer.clipAction(gltf.animations[0]);
        this.runAction.play();
      }

      this.isModelLoaded = true;
    }, undefined, (error) => {
      console.error("An error occurred loading the player model:", error);

      // Fallback: create a basic box if the model fails to load
      const geo = new THREE.BoxGeometry(1, 2, 1);
      geo.translate(0, 1, 0);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(geo, mat);
      this.player.add(mesh);
    });
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

  public resetCamera() {
    this.camera.position.z = this.player.position.z - 12;
    this.camera.position.x = this.player.position.x * 0.3;
  }

  public update(deltaTime: number) {
    if (stateManager.getState().gameOver) return;

    const speedMod = stateManager.getSpeedModifier();

    // Auto-forward movement
    const forwardSpeed = this.baseForwardSpeed * speedMod;
    const forwardMove = forwardSpeed * deltaTime;
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

    // Update Animation Mixer
    if (this.mixer && this.isModelLoaded) {
      // Scale animation speed with movement speed
      if (this.runAction) {
         this.runAction.timeScale = speedMod * 1.5;
      }
      this.mixer.update(deltaTime);
    }

    // Update collision box
    this.playerBox.setFromObject(this.player);

    // Update water plane position to follow player (infinite ocean effect)
    this.waterPlane.position.z = this.player.position.z;

    // Update camera to follow player smoothly
    const targetCameraZ = this.player.position.z - 12;
    const targetCameraX = this.player.position.x * 0.3; // slight pan

    this.camera.position.z += (targetCameraZ - this.camera.position.z) * 5 * deltaTime;
    this.camera.position.x += (targetCameraX - this.camera.position.x) * 5 * deltaTime;
    this.camera.lookAt(this.player.position.x, 2, this.player.position.z + 5);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}