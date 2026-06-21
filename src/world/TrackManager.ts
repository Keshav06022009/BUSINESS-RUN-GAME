import * as THREE from 'three';

export interface GateData {
  id: string;
  isPositive: boolean;
  header: string;
  subtext: string;
  impactType: 'savings' | 'salary' | 'burnout' | 'debt' | 'marketShare' | 'businessCash';
  impactAmount: number;
}

export class TrackManager {
  private scene: THREE.Scene;
  private trackLength: number = 800; // Total length of a level
  private lanes = [-3, 0, 3];

  private trackGroup: THREE.Group;
  private gates: { mesh: THREE.Mesh, data: GateData, box: THREE.Box3, active: boolean }[] = [];

  private gateIncrements = [0.10, 0.22, 0.34, 0.46, 0.58, 0.70, 0.82, 0.94];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
  }

  public getTrackLength() {
      return this.trackLength;
  }

  public getGates() {
      return this.gates;
  }

  public generateTrack(level: number, phase: number) {
    // Clear previous track
    this.clearTrack();

    // 1. Generate Floor Grid
    this.createFloor();

    // 2. Generate Gates
    this.spawnGates(level, phase);
  }

  private clearTrack() {
    // Remove all children and free memory
    while (this.trackGroup.children.length > 0) {
      const child = this.trackGroup.children[0] as any;
      this.trackGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.gates = [];
  }

  private createFloor() {
    // Floor plane
    const geometry = new THREE.PlaneGeometry(20, this.trackLength);
    // Move origin to beginning of track (z=0 to z=trackLength)
    geometry.translate(0, 0, this.trackLength / 2);

    // Grid texture
    const gridHelper = new THREE.GridHelper(this.trackLength, this.trackLength / 2, 0x444444, 0x222222);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(0, 0.01, this.trackLength / 2); // Slightly above floor to avoid z-fighting
    this.trackGroup.add(gridHelper);

    const material = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.8,
      metalness: 0.2
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;

    this.trackGroup.add(floor);
  }

  private spawnGates(level: number, phase: number) {
    const gateWidth = 2.5;
    const gateHeight = 4;
    const gateDepth = 0.5;

    const geometry = new THREE.BoxGeometry(gateWidth, gateHeight, gateDepth);
    // Origin at bottom center
    geometry.translate(0, gateHeight / 2, 0);

    for (let i = 0; i < this.gateIncrements.length; i++) {
      const zPos = this.trackLength * this.gateIncrements[i];

      // Binary choice: Left and Right lanes
      const leftLanePos = this.lanes[0];
      const rightLanePos = this.lanes[2];

      // Generate random data for left and right gates
      const leftData = this.generateGateData(phase, level, true); // One positive
      const rightData = this.generateGateData(phase, level, false); // One negative

      // Randomize which side is positive/negative
      const isLeftPositive = Math.random() > 0.5;

      this.createGateMesh(geometry, isLeftPositive ? leftData : rightData, leftLanePos, zPos);
      this.createGateMesh(geometry, !isLeftPositive ? leftData : rightData, rightLanePos, zPos);
    }
  }

  private createGateMesh(geometry: THREE.BufferGeometry, data: GateData, xPos: number, zPos: number) {
    const color = data.isPositive ? 0x10b981 : 0xe11d48; // Emerald Green : Ruby Red

    // Create materials (make front face a canvas texture)
    const materials = [
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), // Right
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), // Left
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), // Top
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), // Bottom
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), // Front
      this.createGateTextureMaterial(data, color), // Back (Facing the player)
    ];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(xPos, 0, zPos);

    // Create bounding box for collision
    const box = new THREE.Box3().setFromObject(mesh);

    this.trackGroup.add(mesh);
    this.gates.push({ mesh, data, box, active: true });
  }

  private createGateTextureMaterial(data: GateData, _baseColor: number): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = data.isPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(225, 29, 72, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = data.isPositive ? '#34d399' : '#fb7185';
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Text Styling
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    // Header
    ctx.font = 'bold 60px "Segoe UI"';
    this.wrapText(ctx, data.header, canvas.width / 2, 200, 400, 70);

    // Subtext
    ctx.font = 'bold 80px "Segoe UI"';
    ctx.fillText(data.subtext, canvas.width / 2, 800);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';

    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  private generateGateData(phase: number, _level: number, isPositive: boolean): GateData {
    // Generate placeholder logic based on phase
    if (phase === 1) {
      if (isPositive) {
        const types: ('savings' | 'salary' | 'burnout')[] = ['savings', 'salary', 'burnout'];
        const type = types[Math.floor(Math.random() * types.length)];
        if (type === 'savings') return { id: Math.random().toString(), isPositive, header: 'Bonus', subtext: '+$500', impactType: 'savings', impactAmount: 500 };
        if (type === 'salary') return { id: Math.random().toString(), isPositive, header: 'Promotion', subtext: '+$200 Sal', impactType: 'salary', impactAmount: 200 };
        return { id: Math.random().toString(), isPositive, header: 'Vacation', subtext: '-20% Burn', impactType: 'burnout', impactAmount: -0.2 };
      } else {
        const types: ('savings' | 'burnout')[] = ['savings', 'burnout'];
        const type = types[Math.floor(Math.random() * types.length)];
        if (type === 'savings') return { id: Math.random().toString(), isPositive, header: 'Car Repair', subtext: '-$300', impactType: 'savings', impactAmount: -300 };
        return { id: Math.random().toString(), isPositive, header: 'Overtime', subtext: '+30% Burn', impactType: 'burnout', impactAmount: 0.3 };
      }
    } else {
        if (isPositive) {
            const types: ('savings' | 'marketShare')[] = ['savings', 'marketShare'];
            const type = types[Math.floor(Math.random() * types.length)];
            if (type === 'savings') return { id: Math.random().toString(), isPositive, header: 'Angel Investor', subtext: '+$5000', impactType: 'savings', impactAmount: 5000 };
            return { id: Math.random().toString(), isPositive, header: 'Viral Ad', subtext: '+10% Share', impactType: 'marketShare', impactAmount: 0.1 };
        } else {
            const types: ('debt' | 'marketShare')[] = ['debt', 'marketShare'];
            const type = types[Math.floor(Math.random() * types.length)];
            if (type === 'debt') return { id: Math.random().toString(), isPositive, header: 'Business Loan', subtext: '+$10k Debt', impactType: 'debt', impactAmount: 10000 };
            return { id: Math.random().toString(), isPositive, header: 'PR Scandal', subtext: '-5% Share', impactType: 'marketShare', impactAmount: -0.05 };
        }
    }
  }

  public disableGate(gateId: string) {
    const gate = this.gates.find(g => g.data.id === gateId);
    if (gate && gate.active) {
      gate.active = false;
      gate.mesh.visible = false;
      // move bounding box out of the way
      gate.box.translate(new THREE.Vector3(0, -100, 0));
    }
  }
}