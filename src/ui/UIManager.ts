import type { GameState } from '../state/StateManager';
import { stateManager } from '../state/StateManager';

export class UIManager {
  private container: HTMLElement;

  // Phase 1 Elements
  private phase1Container!: HTMLElement;
  private savingsElement!: HTMLElement;
  private salaryElement!: HTMLElement;
  private burnoutBarElement!: HTMLElement;
  private burnoutFillElement!: HTMLElement;

  // Phase 2 Elements
  private phase2Container!: HTMLElement;
  private businessCashElement!: HTMLElement;
  private debtElement!: HTMLElement;
  private debtContainer!: HTMLElement;
  private marketShareChart!: HTMLElement;
  private marketShareText!: HTMLElement;

  // Level Info
  private levelInfoElement!: HTMLElement;

  // Bankruptcy Overlay
  private gameOverOverlay!: HTMLElement;

  private prevSavings: number = -1;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;

    this.createStyles();
    this.createUIElements();

    // Subscribe to state changes
    stateManager.subscribe(this.update.bind(this));
  }

  private createStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      .hud-container {
        position: absolute;
        top: 20px;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding: 0 40px;
        box-sizing: border-box;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white;
        pointer-events: none;
      }

      .hud-left, .hud-right, .hud-center {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .hud-center {
        align-items: center;
      }

      .hud-right {
        align-items: flex-end;
      }

      .panel {
        background: rgba(0, 0, 0, 0.6);
        padding: 15px 25px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(5px);
      }

      /* Phase 1 specific */
      .savings {
        color: #4ade80;
        font-size: 32px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .savings.flash {
        transform: scale(1.15);
        text-shadow: 0 0 20px rgba(74, 222, 128, 0.8);
      }

      .salary {
        color: #60a5fa;
        font-size: 20px;
        font-weight: 600;
      }

      .burnout-container {
        width: 200px;
      }

      .burnout-label {
        font-size: 14px;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .burnout-bar {
        width: 100%;
        height: 12px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        overflow: hidden;
      }

      .burnout-fill {
        height: 100%;
        width: 0%;
        transition: width 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
      }

      /* Phase 2 specific */
      .business-cash {
        color: #fbbf24;
        font-size: 32px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
      }

      .debt-container {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ef4444;
        font-size: 20px;
        font-weight: bold;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 8px 15px;
        border-radius: 8px;
        display: none; /* hidden by default */
      }

      .padlock-icon {
        font-size: 24px;
      }

      .market-share-container {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .radial-chart {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: conic-gradient(#8b5cf6 var(--percentage), rgba(255,255,255,0.1) 0);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .radial-chart::after {
        content: "";
        position: absolute;
        width: 48px;
        height: 48px;
        background: #1a1a1a;
        border-radius: 50%;
      }

      .market-share-text {
        position: relative;
        z-index: 1;
        font-size: 14px;
        font-weight: bold;
      }

      .market-share-label {
        font-size: 14px;
        text-transform: uppercase;
        color: #a78bfa;
      }

      /* Shared */
      .level-indicator {
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 2px;
        text-transform: uppercase;
      }

      .phase-indicator {
        font-size: 14px;
        color: #9ca3af;
        letter-spacing: 1px;
      }

      .hidden {
        display: none !important;
      }

      .game-over-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 100;
        pointer-events: auto;
      }

      .game-over-title {
        color: #ef4444;
        font-size: 64px;
        font-weight: bold;
        margin-bottom: 20px;
        text-transform: uppercase;
        letter-spacing: 5px;
      }

      .game-over-subtitle {
        color: white;
        font-size: 24px;
      }

      .restart-btn {
        margin-top: 40px;
        padding: 15px 40px;
        font-size: 20px;
        background: white;
        color: black;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        text-transform: uppercase;
        transition: background 0.2s;
      }

      .restart-btn:hover {
        background: #ddd;
      }
    `;
    document.head.appendChild(style);
  }

  private createUIElements() {
    // Main Container
    const hud = document.createElement('div');
    hud.className = 'hud-container';

    // Left Side (Phase 1)
    this.phase1Container = document.createElement('div');
    this.phase1Container.className = 'hud-left panel';

    const walletLabel = document.createElement('div');
    walletLabel.innerText = 'WALLET';
    walletLabel.style.fontSize = '12px';
    walletLabel.style.color = '#9ca3af';

    this.savingsElement = document.createElement('div');
    this.savingsElement.className = 'savings';
    this.savingsElement.innerText = '$0';

    this.salaryElement = document.createElement('div');
    this.salaryElement.className = 'salary';
    this.salaryElement.innerText = 'Salary: $0';

    const burnoutContainer = document.createElement('div');
    burnoutContainer.className = 'burnout-container';

    const burnoutLabel = document.createElement('div');
    burnoutLabel.className = 'burnout-label';
    burnoutLabel.innerText = 'Burnout';

    this.burnoutBarElement = document.createElement('div');
    this.burnoutBarElement.className = 'burnout-bar';

    this.burnoutFillElement = document.createElement('div');
    this.burnoutFillElement.className = 'burnout-fill';

    this.burnoutBarElement.appendChild(this.burnoutFillElement);
    burnoutContainer.appendChild(burnoutLabel);
    burnoutContainer.appendChild(this.burnoutBarElement);

    this.phase1Container.appendChild(walletLabel);
    this.phase1Container.appendChild(this.savingsElement);
    this.phase1Container.appendChild(this.salaryElement);
    this.phase1Container.appendChild(burnoutContainer);


    // Right Side (Phase 2)
    this.phase2Container = document.createElement('div');
    this.phase2Container.className = 'hud-right panel hidden';

    const businessLabel = document.createElement('div');
    businessLabel.innerText = 'CORPORATE FUNDS';
    businessLabel.style.fontSize = '12px';
    businessLabel.style.color = '#9ca3af';

    this.businessCashElement = document.createElement('div');
    this.businessCashElement.className = 'business-cash';
    this.businessCashElement.innerText = '$0';

    this.debtContainer = document.createElement('div');
    this.debtContainer.className = 'debt-container';
    this.debtContainer.innerHTML = '<span class="padlock-icon">🔒</span> <span class="debt-value">-$0</span>';
    this.debtElement = this.debtContainer.querySelector('.debt-value') as HTMLElement;

    const marketShareDiv = document.createElement('div');
    marketShareDiv.className = 'market-share-container';

    const msInfo = document.createElement('div');
    const msLabel = document.createElement('div');
    msLabel.className = 'market-share-label';
    msLabel.innerText = 'Market Share';

    const msMult = document.createElement('div');
    msMult.innerText = 'Multiplier: 1.0x';
    msMult.style.fontSize = '12px';
    msMult.style.color = '#d1d5db';

    msInfo.appendChild(msLabel);
    msInfo.appendChild(msMult);

    this.marketShareChart = document.createElement('div');
    this.marketShareChart.className = 'radial-chart';
    this.marketShareText = document.createElement('div');
    this.marketShareText.className = 'market-share-text';
    this.marketShareChart.appendChild(this.marketShareText);

    marketShareDiv.appendChild(msInfo);
    marketShareDiv.appendChild(this.marketShareChart);

    this.phase2Container.appendChild(businessLabel);
    this.phase2Container.appendChild(this.businessCashElement);
    this.phase2Container.appendChild(marketShareDiv);
    this.phase2Container.appendChild(this.debtContainer);


    // Center (Level Info)
    const centerContainer = document.createElement('div');
    centerContainer.className = 'hud-center';

    this.levelInfoElement = document.createElement('div');
    this.levelInfoElement.className = 'level-indicator';
    this.levelInfoElement.innerHTML = `
      <div>LEVEL 1</div>
      <div class="phase-indicator">Employee Phase</div>
    `;

    centerContainer.appendChild(this.levelInfoElement);


    // Game Over Overlay
    this.gameOverOverlay = document.createElement('div');
    this.gameOverOverlay.className = 'game-over-overlay hidden';
    this.gameOverOverlay.innerHTML = `
      <div class="game-over-title">BANKRUPTCY</div>
      <div class="game-over-subtitle">You ran out of funds.</div>
      <button class="restart-btn">Restart Career</button>
    `;
    this.gameOverOverlay.querySelector('.restart-btn')?.addEventListener('click', () => {
      stateManager.resetGame();
    });

    // Assemble HUD
    hud.appendChild(this.phase1Container);
    hud.appendChild(centerContainer);
    hud.appendChild(this.phase2Container);

    this.container.appendChild(hud);
    this.container.appendChild(this.gameOverOverlay);
  }

  private update(state: GameState) {
    // Handle Game Over
    if (state.gameOver) {
      this.gameOverOverlay.classList.remove('hidden');
      return;
    } else {
      this.gameOverOverlay.classList.add('hidden');
    }

    // Update Level Info
    this.levelInfoElement.innerHTML = `
      <div>LEVEL ${state.level}</div>
      <div class="phase-indicator">${state.phase === 1 ? 'Employee Phase' : 'Conglomerate Phase'}</div>
    `;

    if (state.phase === 1) {
      this.phase1Container.classList.remove('hidden');
      this.phase2Container.classList.add('hidden');

      // Update Savings
      this.savingsElement.innerText = `$${state.savings.toLocaleString()}`;

      // Flash effect if savings increased
      if (this.prevSavings !== -1 && state.savings > this.prevSavings) {
        this.savingsElement.classList.add('flash');
        setTimeout(() => this.savingsElement.classList.remove('flash'), 200);
      }
      this.prevSavings = state.savings;

      // Update Salary
      this.salaryElement.innerText = `Salary: $${state.activeSalary.toLocaleString()}`;

      // Update Burnout
      const burnoutPercent = Math.min(100, Math.max(0, state.burnout * 100));
      this.burnoutFillElement.style.width = `${burnoutPercent}%`;

      if (state.burnout < 0.6) {
        this.burnoutFillElement.style.backgroundColor = '#3b82f6'; // Blue
        this.burnoutFillElement.style.boxShadow = 'none';
      } else if (state.burnout < 0.8) {
        this.burnoutFillElement.style.backgroundColor = '#f97316'; // Orange
        this.burnoutFillElement.style.boxShadow = 'none';
      } else {
        this.burnoutFillElement.style.backgroundColor = '#ef4444'; // Red
        this.burnoutFillElement.style.boxShadow = '0 0 10px #ef4444'; // Glowing Red
      }

    } else {
      this.phase1Container.classList.add('hidden');
      this.phase2Container.classList.remove('hidden');

      // Update Business Cash
      this.businessCashElement.innerText = `$${state.businessCash.toLocaleString()}`;

      // Update Debt
      if (state.debt > 0) {
        this.debtContainer.style.display = 'flex';
        this.debtElement.innerText = `-$${state.debt.toLocaleString()}`;
      } else {
        this.debtContainer.style.display = 'none';
      }

      // Update Market Share
      const msPercent = Math.round(state.marketShare * 100);
      this.marketShareChart.style.setProperty('--percentage', `${msPercent}%`);
      this.marketShareText.innerText = `${msPercent}%`;

      const multElement = this.phase2Container.querySelector('.market-share-container > div > div:nth-child(2)') as HTMLElement;
      if (multElement) {
          multElement.innerText = `Multiplier: ${(1 + state.marketShare).toFixed(2)}x`;
      }
    }
  }
}