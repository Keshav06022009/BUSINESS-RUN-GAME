export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private initialized: boolean = false;

  constructor() {
    // User gesture needed to start AudioContext usually, but we'll try initializing lazy
    const handleInteraction = () => {
      if (!this.initialized) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.initialized = true;
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
  }

  public playGateSound(isPositive: boolean) {
    if (!this.ctx || !this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    if (isPositive) {
      // Cheerful chime: C5 to E5 arpeggio feel
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.1); // E5

      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } else {
      // Negative bleep: lower pitch drop
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    }
  }
}