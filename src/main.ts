import { stateManager } from './state/StateManager';
import { UIManager } from './ui/UIManager';
import { GameEngine } from './engine/GameEngine';
import { TrackManager } from './world/TrackManager';
import { ParticleSystem } from './effects/ParticleSystem';
import { AudioSynthesizer } from './effects/AudioSynthesizer';

console.log("Game initialized!");

// Initialize UI
new UIManager('ui-layer');

// Initialize Engine
const engine = new GameEngine('game-canvas');

// Initialize World
const trackManager = new TrackManager(engine.getScene());
trackManager.generateTrack(stateManager.getState().level, stateManager.getState().phase);

// Initialize Effects
const particleSystem = new ParticleSystem(engine.getScene());
const audioSynth = new AudioSynthesizer();

// Main Game Loop
let lastTime = performance.now();

function checkCollisions() {
  const playerBox = engine.playerBox;
  const gates = trackManager.getGates();

  for (const gate of gates) {
    if (gate.active && playerBox.intersectsBox(gate.box)) {
      // Trigger effect
      particleSystem.emit(gate.mesh.position, gate.data.isPositive);
      audioSynth.playGateSound(gate.data.isPositive);

      // Apply logic
      const multiplier = stateManager.getItemValueMultiplier();
      const amount = gate.data.impactAmount * (gate.data.impactType === 'savings' || gate.data.impactType === 'businessCash' ? multiplier : 1);

      switch (gate.data.impactType) {
        case 'savings':
        case 'businessCash': // fallback case just in case
            stateManager.modifySavings(amount); break;
        case 'salary': stateManager.modifySalary(amount); break;
        case 'burnout': stateManager.modifyBurnout(amount); break;
        case 'debt': stateManager.modifyDebt(amount); break;
        case 'marketShare': stateManager.modifyMarketShare(amount); break;
      }

      // Hide gate
      trackManager.disableGate(gate.data.id);
    }
  }
}

function checkLevelEnd() {
  if (engine.player.position.z >= trackManager.getTrackLength()) {
    // Reached the end of the level
    stateManager.completeLevel();

    // Reset player position
    engine.player.position.z = 0;

    // Generate new track for the next level
    const state = stateManager.getState();
    trackManager.generateTrack(state.level, state.phase);
  }
}

function animate(time: number) {
  requestAnimationFrame(animate);

  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;

  engine.update(deltaTime);
  particleSystem.update(deltaTime);

  checkCollisions();
  checkLevelEnd();

  engine.render();
}

requestAnimationFrame(animate);

// Ensure the first render happens with correct layout
window.dispatchEvent(new Event('resize'));

// For testing purposes
(window as any).stateManager = stateManager;
(window as any).engine = engine;
(window as any).trackManager = trackManager;