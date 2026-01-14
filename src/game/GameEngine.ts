import { SNAKE_OPTS, CONFIG } from '../constants';
import { FoodState, SnakeState } from '../types';

class GameEngine {
  public snakes: SnakeState[] = [];
  public food: FoodState[] = [];
  public mapSize: number = CONFIG.mapSize;
  public gameId: number = 0;
  public stateVersion: number = 0;

  private ws: WebSocket | null = null;
  private clientId: string = Math.random().toString(36).substring(7);
  private isConnected: boolean = false;

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
      this.gameId++; // Trigger React update
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
    };
  }

  private updateState(data: any) {
    // Convert backend snakes map to frontend array
    const serverSnakes = data.snakes;
    this.snakes = Object.keys(serverSnakes).map((id) => {
      const s = serverSnakes[id];
      return {
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
    });

    // Backend currently doesn't send food in state (optimized)
    // In a real app, food would be sent only when changed
    if (data.food && data.food.length > 0) {
      this.food = data.food;
    }

    this.stateVersion++;
  }

  public update(delta: number) {
    // Authoritative server handles movement.
    // Client only renders. No local prediction for MVP.
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
    return this.snakes.find(s => s.id === this.clientId);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.snakes = [];
    this.food = [];
  }
}

export const gameEngine = new GameEngine();