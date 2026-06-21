import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public emit(position: THREE.Vector3, isPositive: boolean) {
    const color = isPositive ? 0x10b981 : 0xe11d48;
    const count = 30;

    for (let i = 0; i < count; i++) {
      const size = Math.random() * 0.3 + 0.1;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.copy(position);

      // Random velocity spreading outward and slightly up
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 10
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: Math.random() * 0.5 + 0.5 // 0.5 to 1 second
      });
    }
  }

  public update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.velocity, deltaTime);
        p.mesh.rotation.x += deltaTime * 5;
        p.mesh.rotation.y += deltaTime * 5;

        // Apply slight gravity
        p.velocity.y -= 9.8 * deltaTime;

        // Fade out
        const material = p.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - (p.life / p.maxLife);
      }
    }
  }
}