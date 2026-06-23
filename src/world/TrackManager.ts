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
  private lanes = [-1.5, 1.5]; // 2 Lanes

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
    const platformWidth = 6; // Narrower for 2 lanes
    const platformDepth = 1.5; // Thickness extending downwards

    // Floating Concrete Platform (Tan colored)
    const geometry = new THREE.BoxGeometry(platformWidth, platformDepth, this.trackLength);
    geometry.translate(0, -platformDepth / 2, this.trackLength / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0xd2c4ab, // Warm tan/beige concrete
      roughness: 0.9,
      metalness: 0.1
    });

    const platform = new THREE.Mesh(geometry, material);
    this.trackGroup.add(platform);

    // Thick Yellow Borders
    const borderWidth = 0.6;
    const borderMaterial = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 }); // Golden/Yellow

    const borderLeftGeo = new THREE.BoxGeometry(borderWidth, platformDepth + 0.1, this.trackLength);
    borderLeftGeo.translate(-platformWidth / 2 + borderWidth / 2, -platformDepth / 2 + 0.05, this.trackLength / 2);
    const borderLeft = new THREE.Mesh(borderLeftGeo, borderMaterial);

    const borderRightGeo = new THREE.BoxGeometry(borderWidth, platformDepth + 0.1, this.trackLength);
    borderRightGeo.translate(platformWidth / 2 - borderWidth / 2, -platformDepth / 2 + 0.05, this.trackLength / 2);
    const borderRight = new THREE.Mesh(borderRightGeo, borderMaterial);

    this.trackGroup.add(borderLeft);
    this.trackGroup.add(borderRight);

    // Dashed Center Divider
    this.createLaneDividers();
  }

  private createLaneDividers() {
    // Create a dashed line material
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(0, 0.01, this.trackLength)
    ]);

    const lineMat = new THREE.LineDashedMaterial({
      color: 0x555555, // Dark grey
      linewidth: 5,
      scale: 1,
      dashSize: 2,
      gapSize: 2,
    });

    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances(); // Required for LineDashedMaterial to work
    this.trackGroup.add(line);
  }

  private spawnGates(level: number, phase: number) {
    for (let i = 0; i < this.gateIncrements.length; i++) {
      const zPos = this.trackLength * this.gateIncrements[i];

      // Binary choice: Left and Right lanes
      const leftLanePos = this.lanes[0];
      const rightLanePos = this.lanes[1];

      // Generate random data for left and right gates
      const leftData = this.generateGateData(phase, level, true); // One positive
      const rightData = this.generateGateData(phase, level, false); // One negative

      // Randomize which side is positive/negative
      const isLeftPositive = Math.random() > 0.5;

      this.createArchwayGate(isLeftPositive ? leftData : rightData, leftLanePos, zPos);
      this.createArchwayGate(!isLeftPositive ? leftData : rightData, rightLanePos, zPos);
    }
  }

  private createArchwayGate(data: GateData, xPos: number, zPos: number) {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(xPos, 0, zPos);

    const gateWidth = 2.8;
    const gateHeight = 4.5;
    const pillarThickness = 0.3;

    // High-Contrast Solid Colors
    const color = data.isPositive ? 0x4ADE80 : 0xF87171; // Neon Green : Candy Red
    const frameMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.1
    });

    // 1. Left Pillar
    const pillarGeo = new THREE.BoxGeometry(pillarThickness, gateHeight, pillarThickness);
    pillarGeo.translate(0, gateHeight / 2, 0);
    const leftPillar = new THREE.Mesh(pillarGeo, frameMaterial);
    leftPillar.position.x = -gateWidth / 2 + pillarThickness / 2;
    gateGroup.add(leftPillar);

    // 2. Right Pillar
    const rightPillar = new THREE.Mesh(pillarGeo, frameMaterial);
    rightPillar.position.x = gateWidth / 2 - pillarThickness / 2;
    gateGroup.add(rightPillar);

    // 3. Top Beam
    const beamGeo = new THREE.BoxGeometry(gateWidth, pillarThickness, pillarThickness);
    const topBeam = new THREE.Mesh(beamGeo, frameMaterial);
    topBeam.position.y = gateHeight - pillarThickness / 2;
    gateGroup.add(topBeam);

    // 4. Semi-transparent Glowing Curtain (where collision and text happens)
    const curtainWidth = gateWidth - pillarThickness * 2;
    const curtainHeight = gateHeight - pillarThickness;
    const curtainGeo = new THREE.PlaneGeometry(curtainWidth, curtainHeight);
    // Origin at bottom center of curtain
    curtainGeo.translate(0, curtainHeight / 2, 0);

    const curtainMaterial = this.createCurtainMaterial(data, data.isPositive ? 'rgba(74, 222, 128, 0.5)' : 'rgba(248, 113, 113, 0.5)');
    const curtain = new THREE.Mesh(curtainGeo, curtainMaterial);
    curtain.position.z = 0;
    gateGroup.add(curtain);

    // Create bounding box for collision (using the curtain)
    // Needs to be updated in world space
    const box = new THREE.Box3();

    // We add the group to the track, then compute the box
    this.trackGroup.add(gateGroup);
    gateGroup.updateMatrixWorld();
    box.setFromObject(curtain);

    // Give it some depth for collision since planes have 0 depth
    box.min.z -= 0.5;
    box.max.z += 0.5;

    this.gates.push({ mesh: gateGroup as any, data, box, active: true });
  }

  private createCurtainMaterial(data: GateData, bgRgba: string): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Semi-transparent glowing background
    ctx.fillStyle = bgRgba;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text Styling Setup
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw Header
    ctx.font = 'bold 80px "Segoe UI"';
    ctx.lineWidth = 15;
    ctx.strokeStyle = 'black'; // Thick black border
    ctx.fillStyle = 'white'; // White text

    // Invert the context horizontally because the player looks at the back of the plane (-z)
    // while moving forward (+z)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    this.wrapText(ctx, data.header, canvas.width / 2, 300, 480, 90);

    // Draw Subtext
    ctx.font = 'bold 100px "Segoe UI"';
    ctx.strokeText(data.subtext, canvas.width / 2, 700);
    ctx.fillText(data.subtext, canvas.width / 2, 700);

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false // helps with transparency sorting
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
        ctx.strokeText(line, x, y);
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    ctx.strokeText(line, x, y);
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