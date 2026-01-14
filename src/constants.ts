import { GameConfig } from './types';

export const CONFIG: GameConfig = {
  mapSize: 200, // The map is -100 to 100
  foodCount: 2000,
  botCount: 0,
};

// Maximum number of food particles to render (Initial + Dead bodies)
export const MAX_FOOD_COUNT = 5000;

export const COLORS = {
  background: '#050505',
  grid: '#1a1a1a',
  player: '#00ffcc',
  enemies: ['#ff0055', '#ccff00', '#00ccff', '#ffaa00', '#aa00ff'],
  food: ['#ffffff', '#ffff00', '#ff00ff', '#00ffff'],
};

export const SNAKE_OPTS = {
  baseSpeed: 12,
  boostSpeed: 24,
  turnSpeed: 4.5,
  segmentDistance: 1.5, // Distance between segments
  baseWidth: 1.5,
  startLength: 20,
};