import { CONFIG, SNAKE_OPTS, COLORS, MAX_FOOD_COUNT } from '../constants';
import { FoodState, SnakeState, Point } from '../types';

// Helper for random range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomColor = (palette: string[]) => palette[Math.floor(Math.random() * palette.length)];

class GameEngine {
  public snakes: SnakeState[] = [];
  public food: FoodState[] = [];
  public mapSize: number;
  public gameId: number = 0; // Track game sessions for React rendering
  
  constructor() {
    this.mapSize = CONFIG.mapSize;
    this.init();
  }

  init() {
    this.gameId++;
    this.snakes = [];
    this.food = [];

    // Create Player
    this.addSnake(true);

    // Create Bots
    for (let i = 0; i < CONFIG.botCount; i++) {
      this.addSnake(false);
    }

    // Create Food
    for (let i = 0; i < CONFIG.foodCount; i++) {
      this.addFood();
    }
  }

  addSnake(isPlayer: boolean) {
    const startX = randomRange(-this.mapSize / 2, this.mapSize / 2);
    const startY = randomRange(-this.mapSize / 2, this.mapSize / 2);
    const angle = Math.random() * Math.PI * 2;
    
    // Initial path for the snake body
    const path: Point[] = [];
    // Ensure integer loop count
    const initialPathPoints = Math.floor(SNAKE_OPTS.startLength * 5);
    for (let i = 0; i < initialPathPoints; i++) {
      path.push({ 
        x: startX - Math.cos(angle) * (i * 0.5), 
        y: startY - Math.sin(angle) * (i * 0.5) 
      });
    }

    this.snakes.push({
      id: isPlayer ? 'player' : `bot-${Math.random().toString(36).substr(2, 9)}`,
      isPlayer,
      color: isPlayer ? COLORS.player : randomColor(COLORS.enemies),
      head: { x: startX, y: startY },
      angle,
      targetAngle: angle,
      speed: SNAKE_OPTS.baseSpeed,
      width: SNAKE_OPTS.baseWidth,
      length: SNAKE_OPTS.startLength,
      path,
      score: 0,
      boost: false,
      dead: false,
    });
  }

  addFood(x?: number, y?: number, energy = 1, color?: string) {
    // Prevent adding food if we exceed render limit to save performance/memory
    if (this.food.length >= MAX_FOOD_COUNT) return;

    // Ensure safe energy value
    const safeEnergy = (typeof energy === 'number' && Number.isFinite(energy)) ? energy : 1;
    this.food.push({
      id: Math.random(),
      x: x ?? randomRange(-this.mapSize, this.mapSize),
      y: y ?? randomRange(-this.mapSize, this.mapSize),
      color: color || randomColor(COLORS.food),
      size: 0.5 + (safeEnergy * 0.1),
      energy: safeEnergy
    });
  }

  update(delta: number) {
    // Sanitize delta to prevent large jumps
    const dt = Math.min(delta, 0.1); 

    // 1. Update Snakes (Movement & Bounds)
    this.snakes.forEach(snake => {
      if (snake.dead) return;

      // Turn logic
      let diff = snake.targetAngle - snake.angle;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      const turnAmount = SNAKE_OPTS.turnSpeed * dt;
      if (Math.abs(diff) < turnAmount) {
        snake.angle = snake.targetAngle;
      } else {
        snake.angle += Math.sign(diff) * turnAmount;
      }

      // Move Head
      const speed = snake.boost ? SNAKE_OPTS.boostSpeed : SNAKE_OPTS.baseSpeed;
      const moveDist = speed * dt;
      
      snake.head.x += Math.cos(snake.angle) * moveDist;
      snake.head.y += Math.sin(snake.angle) * moveDist;

      // Boundary Check (Soft bounce -> Death)
      if (snake.head.x > this.mapSize || snake.head.x < -this.mapSize || 
          snake.head.y > this.mapSize || snake.head.y < -this.mapSize) {
          snake.dead = true; 
      }

      // Update Path (Push head, trim tail)
      snake.path.unshift({ ...snake.head });
      
      let maxPathPoints = Math.floor(snake.length * 15); 
      if (!Number.isFinite(maxPathPoints) || maxPathPoints < 10) maxPathPoints = 100;

      if (snake.path.length > maxPathPoints) {
        snake.path.length = maxPathPoints;
      }

      // AI Logic
      if (!snake.isPlayer) {
        if (Math.random() < 0.02) snake.targetAngle = Math.random() * Math.PI * 2;
        // Avoid walls
        if (Math.abs(snake.head.x) > this.mapSize * 0.9) {
          snake.targetAngle = Math.atan2(snake.head.y, 0) + Math.PI;
        }
        if (Math.abs(snake.head.y) > this.mapSize * 0.9) {
          snake.targetAngle = Math.atan2(0, snake.head.x) + Math.PI;
        }
      }

      // Collision with Food
      for (let i = this.food.length - 1; i >= 0; i--) {
        const f = this.food[i];
        const dx = snake.head.x - f.x;
        const dy = snake.head.y - f.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < snake.width + f.size) {
          snake.score += f.energy * 10;
          const energyGain = (Number.isFinite(f.energy) ? f.energy : 1) * 0.5;
          snake.length += energyGain;
          snake.width = SNAKE_OPTS.baseWidth + Math.min(2, snake.length * 0.01);
          this.food.splice(i, 1);
          
          if (Math.random() < 0.2) this.addFood(); // Slower passive respawn
        }
      }
    });

    // 2. Collision with other Snakes
    // We collect deaths first, then apply them to avoid inconsistent checks during the frame
    const newDeaths: string[] = [];

    for (let i = 0; i < this.snakes.length; i++) {
      const s1 = this.snakes[i];
      if (s1.dead) continue;

      for (let j = 0; j < this.snakes.length; j++) {
        const s2 = this.snakes[j];
        if (s1.id === s2.id) continue;
        if (s2.dead) continue; // If s2 was already dead before this frame, it's not a hazard

        // Collision Check
        let collision = false;
        
        // Head-to-Head optimization check
        const distHeads = Math.hypot(s1.head.x - s2.head.x, s1.head.y - s2.head.y);
        if (distHeads > s2.length * SNAKE_OPTS.segmentDistance + 20) continue; 

        if (!s2.path || s2.path.length < 2) continue;

        let distTravelled = 0;
        for (let k = 1; k < s2.path.length; k++) {
           const p1 = s2.path[k-1];
           const p2 = s2.path[k];
           const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
           distTravelled += d;
           
           const distToHead = Math.hypot(s1.head.x - p1.x, s1.head.y - p1.y);
           // Collision radius
           if (distToHead < (s1.width + s2.width) * 0.8) {
             collision = true;
             break;
           }
           if (distTravelled > s2.length * SNAKE_OPTS.segmentDistance) break;
        }

        if (collision) {
          newDeaths.push(s1.id);
          break; 
        }
      }
    }

    // Apply deaths
    newDeaths.forEach(id => {
      const s = this.snakes.find(sn => sn.id === id);
      if (s) s.dead = true;
    });

    // 3. Process Dead Snakes (Convert to Food)
    const deadSnakes = this.snakes.filter(s => s.dead);
    if (deadSnakes.length > 0) {
      deadSnakes.forEach(s => this.convertSnakeToFood(s));
      // Remove dead snakes from active list
      this.snakes = this.snakes.filter(s => !s.dead);
    }

    // Respawn bots
    const livingBots = this.snakes.filter(s => !s.isPlayer).length;
    if (livingBots < CONFIG.botCount) {
      this.addSnake(false);
    }
  }

  convertSnakeToFood(snake: SnakeState) {
    if (!snake.path || snake.path.length < 2) return;
    
    // Convert body to food
    // We iterate the path and drop food every X units
    const dropInterval = SNAKE_OPTS.segmentDistance * 0.8; // Dense food
    let distTravelled = 0;
    let nextDrop = 0;

    for (let i = 1; i < snake.path.length; i++) {
        const p1 = snake.path[i-1];
        const p2 = snake.path[i];
        if(!p1 || !p2) continue;

        const segLen = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        
        while (distTravelled + segLen > nextDrop) {
            const remaining = nextDrop - distTravelled;
            const t = remaining / segLen;
            const fx = p1.x + (p2.x - p1.x) * t;
            const fy = p1.y + (p2.y - p1.y) * t;
            
            // Calculate energy based on snake size
            const energy = Math.max(2, snake.width * 2);
            
            this.addFood(
                fx + randomRange(-snake.width, snake.width),
                fy + randomRange(-snake.width, snake.width),
                energy,
                snake.color // Use snake color for the food
            );
            
            nextDrop += dropInterval;
        }

        distTravelled += segLen;
        // Don't generate food past the visual length
        if (distTravelled > snake.length * SNAKE_OPTS.segmentDistance) break;
    }
  }

  setPlayerTargetAngle(angle: number) {
    const player = this.snakes.find(s => s.isPlayer);
    if (player && !player.dead) {
      player.targetAngle = angle;
    }
  }

  setPlayerBoost(boost: boolean) {
    const player = this.snakes.find(s => s.isPlayer);
    if (player && !player.dead) {
      player.boost = boost;
    }
  }

  getPlayer() {
    return this.snakes.find(s => s.isPlayer);
  }
}

export const gameEngine = new GameEngine();