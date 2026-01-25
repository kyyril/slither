import { SNAKE_OPTS, CONFIG } from '../constants';
import { FoodState, SnakeState } from '../types';

class GameEngine {
  public snakes: SnakeState[] = [];
  public snakesMap: Map<string, SnakeState> = new Map();
  public food: FoodState[] = [];
  public mapSize: number = CONFIG.mapSize;
  public gameId: number = 0;

  // Versions to track changes
  public stateVersion: number = 0; // Increments on every server tick
  public rosterVersion: number = 0; // Increments only when snakes join/leave

  private ws: WebSocket | null = null;
  private clientId: string = Math.random().toString(36).substring(7);
  private isConnected: boolean = false;
  private hasReceivedInitialState: boolean = false;

  constructor() {
    // We'll call connect from App.tsx when a room is selected
  }

  public connect(roomID: string) {
    if (this.ws) {
      this.ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'localhost:8080';
    this.ws = new WebSocket(`${protocol}//${serverUrl}/ws?room=${encodeURIComponent(roomID)}&id=${this.clientId}`);

    this.ws.onopen = () => {
      console.log('Connected to game server');
      this.isConnected = true;
      this.hasReceivedInitialState = false;
      this.gameId++; // Trigger React update
      this.rosterVersion++;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.snakes) {
          this.updateState(data);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = (event) => {
      console.log('Disconnected from game server:', event.code, event.reason);
      this.isConnected = false;
      this.hasReceivedInitialState = false;
      this.snakes = [];
      this.snakesMap.clear();
      this.rosterVersion++;
    };
  }

  private updateState(data: any) {
    const serverSnakes = data.snakes;
    const serverIds = Object.keys(serverSnakes);

    // Check for roster changes (joins/leaves)
    let rosterChanged = false;
    if (serverIds.length !== this.snakes.length) {
      rosterChanged = true;
    } else {
      // If lengths match, check if any ID is new/gone.
      // Since we rebuild the array anyway, we can just check existence in map.
      for (const id of serverIds) {
        if (!this.snakesMap.has(id)) {
          rosterChanged = true;
          break;
        }
      }
    }

    // Update Data
    this.snakesMap.clear();
    this.snakes = serverIds.map((id) => {
      const s = serverSnakes[id];
      const snakeState = {
        id: s.id,
        isPlayer: s.id === this.clientId,
        color: s.color,
        head: s.head,
        angle: s.angle,
        targetAngle: s.targetAngle,
        speed: s.speed,
        width: s.width,
        length: s.length,
        path: s.path,
        score: s.score,
        boost: s.boost,
        dead: s.dead,
      } as SnakeState;

      this.snakesMap.set(id, snakeState);
      return snakeState;
    });

    if (rosterChanged) {
      this.rosterVersion++;
    }

    // Food Delta Updates
    if (!this.hasReceivedInitialState) {
      // First update is guaranteed to be full state
      if (data.food) {
        this.food = data.food;
        this.hasReceivedInitialState = true;
      }
    } else {
      // Handle Deltas
      if (data.eatenFood && data.eatenFood.length > 0) {
        const eatenSet = new Set(data.eatenFood);
        this.food = this.food.filter(f => !eatenSet.has(f.id));
      }
      if (data.food && data.food.length > 0) {
        this.food.push(...data.food);
      }
    }

    this.stateVersion++;
  }

  public update(delta: number) {
    // Client side interpolation could go here globally, 
    // but Snake components effectively handle it via lerping.
  }

  public setPlayerTargetAngle(angle: number) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'input',
        angle: angle
      }));
    }
  }

  public setPlayerBoost(boost: boolean) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'input',
        boost: boost
      }));
    }
  }

  public getPlayer() {
    return this.snakesMap.get(this.clientId);
  }

  public getSnake(id: string) {
    return this.snakesMap.get(id);
  }

  public getIsConnected() {
    return this.isConnected;
  }

  public getHasReceivedInitialState() {
    return this.hasReceivedInitialState;
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.snakes = [];
    this.snakesMap.clear();
    this.food = [];
    this.rosterVersion++;
  }
}

export const gameEngine = new GameEngine();