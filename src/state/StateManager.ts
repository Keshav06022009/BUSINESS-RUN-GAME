export type GamePhase = 1 | 2;

export interface GameState {
  level: number;
  phase: GamePhase;

  // Phase 1 State (Levels 1–3: Corporate/Employee)
  activeSalary: number; // Level end base cash reward
  savings: number; // Total liquid cash
  burnout: number; // Range 0.0 to 1.0. Speed modifier and debuff tracker.

  // Phase 2 State (Levels 4–50: Entrepreneur/Business)
  businessCash: number; // Starts with the remaining balance of Phase 1 Savings.
  debt: number; // Outstanding liabilities.
  marketShare: number; // Range 0.0 to 1.0. Collectable multiplier formula.

  // Engine properties
  gameOver: boolean;
}

export type StateListener = (state: GameState) => void;

export class StateManager {
  private state: GameState;
  private listeners: StateListener[] = [];

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    return {
      level: 1,
      phase: 1,
      activeSalary: 2500,
      savings: 1000,
      burnout: 0.2,
      businessCash: 0,
      debt: 0,
      marketShare: 0.05,
      gameOver: false
    };
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.push(listener);
    // Initial call to set up UI
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  public updateState(partialState: Partial<GameState>) {
    if (this.state.gameOver) return; // Don't update state if game is over

    this.state = { ...this.state, ...partialState };

    // Clamping values
    this.state.burnout = Math.max(0, Math.min(1.0, this.state.burnout));
    this.state.marketShare = Math.max(0, Math.min(1.0, this.state.marketShare));
    this.state.debt = Math.max(0, this.state.debt); // Debt shouldn't be negative generally, though could be structured differently.

    // Bankruptcy Check Phase 1
    if (this.state.phase === 1 && this.state.savings < 0) {
      this.state.gameOver = true;
    }

    // Bankruptcy Check Phase 2 (Assuming business cash < 0 and some other condition, or just < 0)
    if (this.state.phase === 2 && this.state.businessCash < 0) {
      this.state.gameOver = true;
    }

    this.notifyListeners();
  }

  public modifySavings(amount: number) {
    if (this.state.phase === 1) {
      this.updateState({ savings: this.state.savings + amount });
    } else {
      // In phase 2, savings impacts business cash instead
      this.updateState({ businessCash: this.state.businessCash + amount });
    }
  }

  public modifySalary(amount: number) {
      if (this.state.phase === 1) {
          this.updateState({ activeSalary: this.state.activeSalary + amount });
      }
  }

  public modifyBurnout(amount: number) {
     if (this.state.phase === 1) {
         this.updateState({ burnout: this.state.burnout + amount });
     }
  }

  public modifyBusinessCash(amount: number) {
      if (this.state.phase === 2) {
          this.updateState({ businessCash: this.state.businessCash + amount });
      }
  }

  public modifyDebt(amount: number) {
      if (this.state.phase === 2) {
          this.updateState({ debt: this.state.debt + amount });
      }
  }

  public modifyMarketShare(amount: number) {
      if (this.state.phase === 2) {
          this.updateState({ marketShare: this.state.marketShare + amount });
      }
  }

  // Multiplier for item values in Phase 2
  public getItemValueMultiplier(): number {
    if (this.state.phase === 2) {
      return 1 + this.state.marketShare;
    }
    // Phase 1 debuff check
    if (this.state.phase === 1 && this.state.burnout >= 1.0) {
       return 0.5; // halve track cash item values
    }
    return 1;
  }

  // Speed modifier for the player
  public getSpeedModifier(): number {
    let modifier = 1.0;

    if (this.state.phase === 1) {
      if (this.state.burnout >= 1.0) {
        modifier *= 0.5; // reduce base character speed by 50%
      }
    } else if (this.state.phase === 2) {
      // -5% speed drag factor per $10,000 in debt
      const debtDragBlocks = Math.floor(this.state.debt / 10000);
      modifier -= (debtDragBlocks * 0.05);

      // Ensure we don't go backwards
      modifier = Math.max(0.1, modifier);
    }

    return modifier;
  }

  public completeLevel() {
    if (this.state.gameOver) return;

    let nextLevel = this.state.level + 1;

    // Apply end of level logic
    if (this.state.phase === 1) {
        this.updateState({ savings: this.state.savings + this.state.activeSalary });
    } else if (this.state.phase === 2) {
        // Auto-deduct $500 for every $10,000 in debt at level end
        const debtPaymentsBlocks = Math.floor(this.state.debt / 10000);
        const deduction = debtPaymentsBlocks * 500;
        this.updateState({ businessCash: this.state.businessCash - deduction });
    }

    // Phase transition check
    if (nextLevel === 4 && this.state.phase === 1) {
      // Transition Savings to Business Cash
      this.updateState({
         businessCash: this.state.savings, // Starts with remaining balance of Phase 1
         phase: 2,
         level: nextLevel
      });
    } else {
      this.updateState({ level: nextLevel });
    }
  }

  public resetGame() {
    this.state = this.getInitialState();
    this.notifyListeners();
  }
}

// Global instance
export const stateManager = new StateManager();