export interface Point {
  x: number;
  y: number;
}

export interface SnakeSegment {
  x: number;
  y: number;
}

export interface SnakeState {
  id: string;
  isPlayer: boolean;
  color: string;
  head: Point;
  angle: number; // in radians
  targetAngle: number;
  speed: number;
  width: number;
  length: number; // Target length
  path: Point[]; // History of positions for body following
  score: number;
  boost: boolean;
  dead: boolean;
}

export interface FoodState {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  energy: number;
}

export interface GameConfig {
  mapSize: number;
  foodCount: number;
  botCount: number;
}

// Augment global JSX namespace to include React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      instancedMesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      gridHelper: any;
      ringGeometry: any;
      icosahedronGeometry: any;
      ambientLight: any;
      pointLight: any;
      color: any;
    }
  }
}